const TRANSIENT_DATABASE_SIGNALS = [
  'UND_ERR_SOCKET',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'fetch failed',
  'other side closed',
  'socket hang up',
  'P1001',
  'P1002',
  'P1008',
  'P1017',
  'P2024',
];

interface ReadRetryOptions {
  label: string;
  retries?: number;
  delayMs?: number;
  timeoutMs?: number;
}

export async function withDatabaseReadRetry<T>(
  operation: () => Promise<T>,
  {label, retries = 1, delayMs = 450, timeoutMs = 6000}: ReadRetryOptions,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await runWithTimeout(operation(), timeoutMs, label);
    } catch (error) {
      if (attempt >= retries || !isTransientDatabaseError(error)) {
        throw error;
      }

      attempt += 1;
      console.warn(`Transient database read failed; retrying ${label} (${attempt}/${retries}).`);
      await delay(delayMs * attempt);
    }
  }
}

export async function readOrFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  label: string,
  degradedSections: string[],
): Promise<T> {
  try {
    return await withDatabaseReadRetry(operation, {label});
  } catch (error) {
    degradedSections.push(label);
    console.error(`Dashboard section unavailable after retry: ${label}`, error);
    return fallback;
  }
}

function isTransientDatabaseError(error: unknown) {
  const details: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) details.push(current.name, current.message);
    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (typeof record.code === 'string') details.push(record.code);
      current = record.cause;
    } else break;
  }

  const combined = details.join(' ');
  return combined.includes('DATABASE_READ_TIMEOUT')
    || TRANSIENT_DATABASE_SIGNALS.some((signal) => combined.includes(signal));
}

function runWithTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(Object.assign(new Error(`Database read timed out: ${label}`), {code: 'DATABASE_READ_TIMEOUT'})),
      timeoutMs,
    );
  });

  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
