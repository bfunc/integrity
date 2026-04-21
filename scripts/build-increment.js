#!/usr/bin/env node
import 'dotenv/config';
import duckdb from 'duckdb';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DB_PATH || 'data/integrity.duckdb';

mkdirSync(dirname(dbPath), { recursive: true });

const db = new duckdb.Database(dbPath, (err) => {
  if (err) { console.error('build-increment: cannot open db:', err.message); process.exit(1); }
});

const conn = db.connect();

function run(sql, params = []) {
  return new Promise((resolve, reject) =>
    conn.run(sql, ...params, (err) => err ? reject(err) : resolve())
  );
}

function all(sql, params = []) {
  return new Promise((resolve, reject) =>
    conn.all(sql, ...params, (err, rows) => err ? reject(err) : resolve(rows))
  );
}

async function main() {
  await run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);

  const rows = await all(`SELECT value FROM meta WHERE key = 'build_number'`);
  const current = rows.length ? parseInt(rows[0].value, 10) : 0;
  const next = current + 1;

  await run(
    `INSERT INTO meta (key, value) VALUES ('build_number', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(next)]
  );

  const { writeFileSync } = await import('fs');
  writeFileSync('src/lib/build.js', `export const BUILD = ${next};\n`);
  console.log(`Build #${next}`);
}

main()
  .catch((err) => { console.error('build-increment error:', err); process.exit(1); })
  .finally(() => db.close());
