/**
 * Fixes leader_id misattribution caused by the old detectLeader() that searched
 * article body text and matched incidental mentions (e.g. Lapid's article tagged
 * as netanyahu because body mentions Netanyahu).
 *
 * New logic: speaker-first, then title-only — no body text.
 * Run once, then delete.
 *
 * Usage: node scripts/reattribute-leaders.mjs
 */

import { initDb } from '../src/db/database.js';
import { detectLeader } from '../src/agents/crawler.js';

const origLog = console.log;
console.log = () => {};
await initDb();
console.log = origLog;

const conn = globalThis.__duckdb.conn;

function query(sql, params = []) {
  return new Promise((res, rej) =>
    conn.all(sql, ...params, (err, rows) => (err ? rej(err) : res(rows))),
  );
}
function run(sql, params = []) {
  return new Promise((res, rej) =>
    conn.run(sql, ...params, (err) => (err ? rej(err) : res())),
  );
}

// Fetch all analyses that have attributed_to set (speaker known)
const rows = await query(`
  SELECT a.id, a.leader_id, a.attributed_to, ar.title
  FROM analyses a
  LEFT JOIN articles ar ON a.source_id = ar.id AND a.source_type = 'article'
  WHERE a.attributed_to IS NOT NULL
`);

console.log(`Checking ${rows.length} analyses with known speaker...`);

let fixed = 0;
let skipped = 0;

for (const row of rows) {
  const correct = detectLeader({ attributed_to: row.attributed_to }, row.title ?? '');
  if (correct !== row.leader_id) {
    await run('UPDATE analyses SET leader_id = ? WHERE id = ?', [correct, row.id]);
    console.log(`  Fixed: "${(row.title ?? '').slice(0, 50)}"  ${row.leader_id ?? 'NULL'} → ${correct ?? 'NULL'}`);
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\nFixed ${fixed}, unchanged ${skipped}`);

// Verification
const grouped = await query(
  'SELECT leader_id, COUNT(*) as cnt FROM analyses GROUP BY leader_id ORDER BY cnt DESC',
);
console.log('\nFinal leader_id distribution:');
for (const r of grouped) {
  const cnt = typeof r.cnt === 'bigint' ? Number(r.cnt) : r.cnt;
  console.log(`  ${String(r.leader_id ?? 'NULL').padEnd(16)} ${cnt}`);
}

process.exit(0);
