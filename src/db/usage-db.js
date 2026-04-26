import duckdb from "duckdb";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";

const DB_PATH = process.env.USAGE_DB_PATH || "data/usage.duckdb";
const CSV_PATH = resolve(dirname(DB_PATH), "usage.csv");

if (!globalThis.__usageDb) {
  globalThis.__usageDb = { db: null, conn: null, initPromise: null };
}
const state = globalThis.__usageDb;

function _run(sql, params = []) {
  return new Promise((res, rej) => {
    state.conn.run(sql, ...params, (err) => (err ? rej(err) : res()));
  });
}

async function init() {
  if (state.conn) return;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  await new Promise((res, rej) => {
    state.db = new duckdb.Database(DB_PATH, (err) => (err ? rej(err) : res()));
  });
  state.conn = state.db.connect();
  await _run(`
    CREATE TABLE IF NOT EXISTS usage (
      ts            TIMESTAMP,
      route         TEXT,
      model         TEXT,
      input_tokens  INTEGER,
      output_tokens INTEGER,
      total_tokens  INTEGER
    )
  `);
}

async function ensureReady() {
  if (!state.conn) {
    if (!state.initPromise) state.initPromise = init();
    await state.initPromise;
  }
}

export async function initUsageDb() {
  await ensureReady();
}

export async function logUsage({ route = "unknown", model, input, output }) {
  try {
    await ensureReady();
    const total = (input || 0) + (output || 0);
    await _run(
      `INSERT INTO usage (ts, route, model, input_tokens, output_tokens, total_tokens)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [new Date().toISOString(), route, model || "unknown", input || 0, output || 0, total],
    );
  } catch (err) {
    console.error("[usage-db] logUsage error:", err.message);
  }
}

export async function exportCSV() {
  await ensureReady();
  const absPath = CSV_PATH.replace(/\\/g, "/");
  await _run(
    `COPY (SELECT * FROM usage ORDER BY ts) TO '${absPath}' WITH (HEADER, FORMAT CSV)`,
  );
  return CSV_PATH;
}
