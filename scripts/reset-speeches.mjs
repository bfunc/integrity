/**
 * Reset all speeches with status='error' back to 'pending'
 * so they get re-analyzed on the next pipeline run.
 */
import { initDb, closeDb } from "../src/db/database.js";
import duckdb from "duckdb";
import { config } from "../src/lib/config.js";
import { existsSync } from "fs";
import { resolve } from "path";

// Open DB directly (bypass initDb singleton to avoid ESM issues)
const dbPath = config.db.path;
console.log(`Opening DB at: ${resolve(dbPath)}`);

if (!existsSync(dbPath)) {
  console.error("DB file not found:", dbPath);
  process.exit(1);
}

const db = new duckdb.Database(dbPath);
const conn = db.connect();

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Check current counts
const before = await query(
  "SELECT status, COUNT(*) as cnt FROM speeches GROUP BY status ORDER BY status",
);
console.log("\nBefore reset:");
before.forEach((r) => console.log(`  ${r.status}: ${r.cnt}`));

// Reset errors to pending
await run("UPDATE speeches SET status = 'pending' WHERE status = 'error'");

const after = await query(
  "SELECT status, COUNT(*) as cnt FROM speeches GROUP BY status ORDER BY status",
);
console.log("\nAfter reset:");
after.forEach((r) => console.log(`  ${r.status}: ${r.cnt}`));

db.close();
console.log("\nDone. Speeches reset to pending — ready for re-analysis.");
