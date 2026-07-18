import 'dotenv/config';
import mysql from 'mysql2/promise';
import type {Connection} from 'mysql2/promise';

type MigrationRow = Record<string, unknown> & {id: string};

const TABLES = [
  'User',
  'UserSetting',
  'PromptTemplate',
  'Post',
  'PostImage',
  'AIUsageLog',
] as const;

async function main() {
  const localUrl = requireEnvironmentVariable('LOCAL_DATABASE_URL');
  const tidbUrl = new URL(requireEnvironmentVariable('TIDB_MIGRATION_DATABASE_URL'));
  const localConnection = await mysql.createConnection(localUrl);
  const remoteConnection = await mysql.createConnection({
    host: tidbUrl.hostname,
    port: Number(tidbUrl.port || 4000),
    user: decodeURIComponent(tidbUrl.username),
    password: decodeURIComponent(tidbUrl.password),
    database: tidbUrl.pathname.replace(/^\//, ''),
    ssl: {rejectUnauthorized: true},
  });

  try {
    console.log('Connected to local MySQL and TiDB Cloud.');
    for (const table of TABLES) {
      await migrateTable(localConnection, remoteConnection, table);
    }
    console.log('Migration finished successfully.');
  } finally {
    await Promise.allSettled([localConnection.end(), remoteConnection.end()]);
  }
}

async function migrateTable(local: Connection, remote: Connection, table: string) {
  const [result] = await local.query(`SELECT * FROM \`${table}\``);
  const rows = result as MigrationRow[];
  let migrated = 0;

  for (const row of rows) {
    if (!(await recordExists(remote, table, String(row.id)))) {
      await insertRow(remote, table, row);
      migrated += 1;
    }
  }

  console.log(`${table}: ${rows.length} checked, ${migrated} migrated.`);
}

async function recordExists(connection: Connection, table: string, id: string) {
  const [rows] = await connection.execute(`SELECT 1 FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  return Array.isArray(rows) && rows.length > 0;
}

async function insertRow(connection: Connection, table: string, row: MigrationRow) {
  const keys = Object.keys(row);
  const values = Object.values(row).map((value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) return JSON.stringify(value);
    return value;
  });
  const columns = keys.map((key) => `\`${key}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  await connection.execute(`INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`, values);
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});