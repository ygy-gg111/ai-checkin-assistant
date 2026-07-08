export type PromptContext = {
  locale: string;
  persona: string;
  scene: string;
  userInput: string;
};

export const MAX_PROMPT_PERSONA_CHARS = 800;
export const MAX_PROMPT_TEMPLATE_CHARS = 2400;
export const MAX_PROMPT_INPUT_CHARS = 500;
export const MAX_PROMPT_IMAGE_URLS = 4;
export const MAX_PROMPT_IMAGE_URL_CHARS = 200;
export const MAX_PROMPT_COMPLETION_TOKENS = 450;

export function buildPrompt(context: PromptContext) {
  return [
    clampChars(context.persona, MAX_PROMPT_PERSONA_CHARS),
    context.scene,
    clampChars(context.userInput, MAX_PROMPT_INPUT_CHARS),
  ].filter(Boolean).join('\n\n');
}

export function composePromptTemplate({
  persona,
  template,
}: {
  persona?: string | null;
  template?: string | null;
}) {
  return [
    clampChars(persona?.trim(), MAX_PROMPT_PERSONA_CHARS),
    clampChars(template?.trim(), MAX_PROMPT_TEMPLATE_CHARS),
  ].filter(Boolean).join('\n\n');
}

export function clampPromptInputText(value: string) {
  return clampChars(value.trim(), MAX_PROMPT_INPUT_CHARS);
}

export function clampPromptImageUrls(urls: string[]) {
  return urls
    .map((url) => clampChars(url.trim(), MAX_PROMPT_IMAGE_URL_CHARS))
    .filter(Boolean)
    .slice(0, MAX_PROMPT_IMAGE_URLS);
}

function clampChars(value: string | null | undefined, maxChars: number) {
  if (!value) {
    return '';
  }

  return value.slice(0, maxChars);
}
