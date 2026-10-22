import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set. Did you create .env.local?');
}

const sql = neon(url);
const schema = await readFile(new URL('schema.sql', import.meta.url), 'utf8');

const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await sql.query(statement);
  console.warn(`applied: ${statement.split('\n')[0] ?? ''}…`);
}

console.warn(`Schema applied: ${String(statements.length)} statements.`);
