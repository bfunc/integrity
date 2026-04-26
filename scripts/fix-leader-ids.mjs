/**
 * One-time migration: patch leader_id on existing analyses rows where it is NULL.
 * Uses detectLeader() from crawler.js — no API calls, pure text matching.
 * Run once, then delete this file.
 *
 * Usage: node scripts/fix-leader-ids.mjs
 */

import { initDb } from '../src/db/database.js';
import { detectLeader } from '../src/agents/crawler.js';

// Suppress initDb console noise
const origLog = console.log;
console.log = () => {};
await initDb();
console.log = origLog;

const conn = globalThis.__duckdb.conn;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.all(sql, ...params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, (err) => (err ? reject(err) : resolve()));
  });
}

// Fetch all null-leader analyses joined with their source article
const rows = await query(`
  SELECT a.id, a.attributed_to, ar.title, ar.excerpt
  FROM analyses a
  LEFT JOIN articles ar ON a.source_id = ar.id AND a.source_type = 'article'
  WHERE a.leader_id IS NULL
`);

console.log(`Found ${rows.length} analyses with leader_id = NULL`);

let fixed = 0;
for (const row of rows) {
  const leaderId = detectLeader(
    { attributed_to: row.attributed_to },
    row.title ?? '',
    row.excerpt ?? '',
  );
  if (leaderId !== null) {
    await run('UPDATE analyses SET leader_id = ? WHERE id = ?', [leaderId, row.id]);
    fixed++;
  }
}

console.log(`Fixed ${fixed} of ${rows.length} null leader_ids`);

// Verification query
const grouped = await query(
  'SELECT leader_id, COUNT(*) as cnt FROM analyses GROUP BY leader_id ORDER BY cnt DESC',
);

// BigInt-safe output
console.log('\nVerification — SELECT leader_id, COUNT(*) FROM analyses GROUP BY leader_id ORDER BY 2 DESC:');
for (const r of grouped) {
  console.log(`  ${String(r.leader_id).padEnd(16)} ${Number(r.cnt)}`);
}

process.exit(0);
