// Must run while dev server is NOT holding the DB
// If dev server is running, stop it first, then run this
import { initDb } from './src/db/database.js';
const s = console.log; const se = console.error;
console.log = () => {}; console.error = () => {};
try { await initDb(); } catch(e) {
  process.stderr.write('DB locked or error: ' + e.message + '\n');
  process.exit(1);
}
console.log = s; console.error = se;

const conn = globalThis.__duckdb.conn;
const q = (sql, p=[]) => new Promise((res,rej) => conn.all(sql,...p,(e,r)=>e?rej(e):res(r)));
const n = v => typeof v === 'bigint' ? Number(v) : v;

// Check analyses for test articles
const rows = await q(`
  SELECT a.id, a.leader_id, a.severity, a.attribution_role, a.attributed_to,
         ar.source, ar.title
  FROM analyses a
  JOIN articles ar ON ar.id = a.source_id
  WHERE ar.source = 'test_feed'
  ORDER BY ar.published_at
`);
process.stdout.write(`\n=== test_feed analyses (${rows.length} rows) ===\n`);
for (const r of rows) {
  process.stdout.write(`  leader=${r.leader_id??'NULL'} sev=${r.severity} role=${r.attribution_role} speaker=${r.attributed_to??'NULL'}\n  title: ${String(r.title).slice(0,60)}\n`);
}

// Check matrix query result
const matrix = await q(`
  SELECT ar.source AS source_id, a.leader_id,
    ROUND(AVG(a.severity),1) AS avg_sev, COUNT(*) AS cnt
  FROM analyses a
  JOIN articles ar ON ar.id = a.source_id
  WHERE a.source_type='article' AND a.leader_id IS NOT NULL AND a.leader_id!=''
  GROUP BY ar.source, a.leader_id ORDER BY ar.source, a.leader_id
`);
process.stdout.write(`\n=== matrix rows (${matrix.length}) ===\n`);
for (const r of matrix) process.stdout.write(`  ${r.source_id} × ${r.leader_id} → avg=${n(r.avg_sev)} (${n(r.cnt)} articles)\n`);

if (rows.length === 0) process.stdout.write('\nNO ANALYSES for test_feed — pipeline did not run or failed silently\n');
if (matrix.length === 0 && rows.length > 0) process.stdout.write('\nAnalyses exist but all have leader_id=NULL — detectLeader() failed\n');

process.exit(0);
