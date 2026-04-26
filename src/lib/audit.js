import duckdb from 'duckdb';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.AUDIT_DB_PATH || 'data/audit.db';

if (!globalThis.__auditDb) {
  globalThis.__auditDb = { db: null, conn: null, initPromise: null };
}
const state = globalThis.__auditDb;

function _run(sql, params = []) {
  return new Promise((res, rej) => {
    state.conn.run(sql, ...params, (err) => (err ? rej(err) : res()));
  });
}

function _all(sql, params = []) {
  return new Promise((res, rej) => {
    state.conn.all(sql, ...params, (err, rows) => (err ? rej(err) : res(rows)));
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
    CREATE TABLE IF NOT EXISTS claude_calls (
      id          VARCHAR PRIMARY KEY,
      called_at   TIMESTAMP,
      agent       VARCHAR,
      article_id  VARCHAR,
      model       VARCHAR,
      input_tokens  INTEGER,
      output_tokens INTEGER,
      cost_usd    DECIMAL(10,6),
      input_text  TEXT,
      output_text TEXT,
      duration_ms INTEGER,
      error       VARCHAR
    )
  `);
}

async function ensureReady() {
  if (state.conn) return;
  if (!state.initPromise) state.initPromise = init();
  await state.initPromise;
}

// Token rates: Sonnet 4 — $3/M input, $15/M output
function calcCost(input_tokens, output_tokens) {
  return (input_tokens || 0) / 1_000_000 * 3.0
       + (output_tokens || 0) / 1_000_000 * 15.0;
}

export async function logClaudeCall({
  agent, article_id, model,
  input_tokens, output_tokens,
  input_text, output_text,
  duration_ms, error = null,
}) {
  try {
    await ensureReady();
    await _run(
      `INSERT INTO claude_calls
         (id, called_at, agent, article_id, model, input_tokens, output_tokens,
          cost_usd, input_text, output_text, duration_ms, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        new Date().toISOString(),
        agent   || null,
        article_id || null,
        model   || null,
        input_tokens  || 0,
        output_tokens || 0,
        calcCost(input_tokens, output_tokens),
        input_text  || null,
        output_text || null,
        duration_ms || null,
        error       || null,
      ],
    );
  } catch (err) {
    console.error('[audit] logClaudeCall error:', err.message);
  }
}

function toNum(v) { return Number(v ?? 0); }

function normalizeRow(r) {
  return {
    calls:        toNum(r.calls),
    input_tokens:  toNum(r.input_tokens),
    output_tokens: toNum(r.output_tokens),
    cost_usd:      toNum(r.cost_usd),
  };
}

export async function getAuditStats() {
  try {
    await ensureReady();

    const statSql = (where) => `
      SELECT COUNT(*) as calls,
        COALESCE(SUM(input_tokens),  0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(CAST(cost_usd AS DOUBLE)), 0) as cost_usd
      FROM claude_calls
      ${where}
    `;

    const [[today], [week], [total]] = await Promise.all([
      _all(statSql(`WHERE called_at >= CURRENT_DATE`)),
      _all(statSql(`WHERE called_at >= DATE_TRUNC('week', CURRENT_DATE)`)),
      _all(statSql(``)),
    ]);

    const totalNorm = normalizeRow(total);
    const avgCost = totalNorm.calls > 0 ? totalNorm.cost_usd / totalNorm.calls : 0;

    return {
      today:    normalizeRow(today),
      this_week: normalizeRow(week),
      total:    totalNorm,
      avg_cost_per_call: avgCost,
    };
  } catch (err) {
    console.error('[audit] getAuditStats error:', err.message);
    const empty = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    return { today: empty, this_week: { ...empty }, total: { ...empty }, avg_cost_per_call: 0 };
  }
}

export async function getRecentCalls(limit = 50, dateFilter = 'today') {
  try {
    await ensureReady();
    const where = dateFilter === 'today'
      ? 'WHERE called_at >= CURRENT_DATE'
      : '';
    const rows = await _all(
      `SELECT id, called_at, agent, article_id, model,
         input_tokens, output_tokens,
         CAST(cost_usd AS DOUBLE) as cost_usd,
         duration_ms, error
       FROM claude_calls
       ${where}
       ORDER BY called_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((r) => ({
      ...r,
      input_tokens:  toNum(r.input_tokens),
      output_tokens: toNum(r.output_tokens),
      cost_usd:      toNum(r.cost_usd),
      duration_ms:   r.duration_ms != null ? toNum(r.duration_ms) : null,
    }));
  } catch (err) {
    console.error('[audit] getRecentCalls error:', err.message);
    return [];
  }
}
