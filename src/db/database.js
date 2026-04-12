import duckdb from 'duckdb';
import { config } from '../lib/config.js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leadersData = JSON.parse(readFileSync(resolve(__dirname, '../../external/leaders.json'), 'utf-8'));

// Store on globalThis so Vite's module re-imports don't reset the connection
if (!globalThis.__duckdb) {
  globalThis.__duckdb = { db: null, conn: null, initPromise: null };
}
const state = globalThis.__duckdb;

async function ensureConn() {
  if (state.conn) return;
  if (!state.initPromise) state.initPromise = initDb();
  await state.initPromise;
}

export async function initDb() {
  if (state.conn) return;

  await new Promise((resolve, reject) => {
    state.db = new duckdb.Database(config.db.path, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  state.conn = state.db.connect();

  await _run(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE,
      source TEXT,
      title TEXT,
      excerpt TEXT,
      full_text TEXT,
      published_at TIMESTAMP,
      fetched_at TIMESTAMP,
      status TEXT
    )
  `);

  await _run(`
    CREATE TABLE IF NOT EXISTS speeches (
      id TEXT PRIMARY KEY,
      leader_id TEXT,
      url TEXT,
      title TEXT,
      date DATE,
      description TEXT,
      full_text TEXT,
      status TEXT
    )
  `);

  await _run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      source_type TEXT,
      source_id TEXT,
      leader_id TEXT,
      analyzed_at TIMESTAMP,
      severity INTEGER,
      severity_label TEXT,
      patterns JSON,
      summary_md TEXT,
      raw_response JSON
    )
  `);

  await _run(`
    CREATE TABLE IF NOT EXISTS leaders (
      id TEXT PRIMARY KEY,
      name TEXT,
      role TEXT,
      country TEXT
    )
  `);

  await _run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP,
      type TEXT,
      message TEXT
    )
  `);

  for (const leader of leadersData) {
    await _run(
      `INSERT INTO leaders (id, name, role, country)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, country=excluded.country`,
      [leader.id, leader.name, leader.role, leader.country]
    );
  }
}

// Internal helpers — conn must already be set
function _run(sql, params = []) {
  return new Promise((resolve, reject) => {
    state.conn.run(sql, ...params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _all(sql, params = []) {
  return new Promise((resolve, reject) => {
    state.conn.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Public helpers — lazy-init conn before use
async function run(sql, params = []) {
  await ensureConn();
  return _run(sql, params);
}

async function all(sql, params = []) {
  await ensureConn();
  return _all(sql, params);
}

export async function articleExists(url) {
  const rows = await all('SELECT id FROM articles WHERE url = ?', [url]);
  return rows.length > 0;
}

export async function insertArticle(article) {
  await run(
    `INSERT INTO articles (id, url, source, title, excerpt, full_text, published_at, fetched_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT DO NOTHING`,
    [
      article.id,
      article.url,
      article.source,
      article.title,
      article.excerpt,
      article.full_text || null,
      article.published_at,
      new Date().toISOString(),
      article.status || 'new',
    ]
  );
}

export async function updateArticleStatus(id, status, fullText = null) {
  if (fullText !== null) {
    await run('UPDATE articles SET status = ?, full_text = ? WHERE id = ?', [status, fullText, id]);
  } else {
    await run('UPDATE articles SET status = ? WHERE id = ?', [status, id]);
  }
}

export async function insertAnalysis(analysis) {
  await run(
    `INSERT INTO analyses (id, source_type, source_id, leader_id, analyzed_at, severity, severity_label, patterns, summary_md, raw_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      analysis.id || randomUUID(),
      analysis.source_type,
      analysis.source_id,
      analysis.leader_id || null,
      new Date().toISOString(),
      analysis.severity,
      analysis.severity_label,
      JSON.stringify(analysis.patterns),
      analysis.summary_md,
      JSON.stringify(analysis.raw_response),
    ]
  );
}

export async function upsertLeader(leader) {
  await run(
    `INSERT INTO leaders (id, name, role, country)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, country=excluded.country`,
    [leader.id, leader.name, leader.role, leader.country]
  );
}

export async function speechExists(id) {
  const rows = await all('SELECT id FROM speeches WHERE id = ?', [id]);
  return rows.length > 0;
}

export async function insertSpeech(speech) {
  await run(
    `INSERT INTO speeches (id, leader_id, url, title, date, description, full_text, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT DO NOTHING`,
    [
      speech.id,
      speech.leader_id,
      speech.url,
      speech.title || null,
      speech.date || null,
      speech.description || null,
      speech.full_text || null,
      'new',
    ]
  );
}

export async function updateSpeechStatus(id, status, fullText = null) {
  if (fullText !== null) {
    await run('UPDATE speeches SET status = ?, full_text = ? WHERE id = ?', [status, fullText, id]);
  } else {
    await run('UPDATE speeches SET status = ? WHERE id = ?', [status, id]);
  }
}

export async function logEvent(type, message) {
  await run(
    'INSERT INTO events (id, created_at, type, message) VALUES (?, ?, ?, ?)',
    [randomUUID(), new Date().toISOString(), type, message]
  );
}

export async function getFeedAnalyses(tab) {
  if (tab === 'threats') {
    return all(`
      SELECT a.*, ar.title as article_title, ar.source, ar.url as article_url, ar.published_at,
             s.title as speech_title, s.leader_id
      FROM analyses a
      LEFT JOIN articles ar ON a.source_type = 'article' AND a.source_id = ar.id
      LEFT JOIN speeches s ON a.source_type = 'speech' AND a.source_id = s.id
      WHERE a.severity >= 3
      ORDER BY a.analyzed_at DESC
      LIMIT 100
    `);
  } else {
    return all(`
      SELECT a.*, ar.title as article_title, ar.source, ar.url as article_url, ar.published_at
      FROM analyses a
      JOIN articles ar ON a.source_id = ar.id
      WHERE a.source_type = 'article' AND a.severity >= 2
      ORDER BY a.analyzed_at DESC
      LIMIT 100
    `);
  }
}

export async function getLeaderStats() {
  const rows = await all(`
    SELECT l.id, l.name, l.role, l.country,
           COUNT(CASE WHEN a.severity >= 2 THEN 1 END) as violation_count,
           MAX(a.severity) as max_severity,
           MAX(CASE WHEN a.severity >= 2 THEN a.analyzed_at END) as last_violation_date
    FROM leaders l
    LEFT JOIN analyses a ON a.leader_id = l.id
    GROUP BY l.id, l.name, l.role, l.country
  `);
  return rows.map((r) => ({ ...r, violation_count: Number(r.violation_count) }));
}

export async function getSpeechesAnalyzedByLeader() {
  const rows = await all(`
    SELECT leader_id, COUNT(*) as analyzed_count
    FROM speeches
    WHERE status = 'analyzed' AND leader_id IS NOT NULL
    GROUP BY leader_id
  `);
  return Object.fromEntries(rows.map((r) => [r.leader_id, Number(r.analyzed_count)]));
}

export async function getLeaderViolations(leaderId) {
  return all(`
    SELECT a.*, s.title as speech_title, s.date as speech_date
    FROM analyses a
    LEFT JOIN speeches s ON a.source_id = s.id
    WHERE a.leader_id = ?
    ORDER BY a.analyzed_at DESC
  `, [leaderId]);
}

export async function getStats() {
  const [sites] = await all('SELECT COUNT(DISTINCT source) as count FROM articles');
  const [articles] = await all('SELECT COUNT(*) as count FROM articles');
  const [threats] = await all('SELECT COUNT(*) as count FROM analyses WHERE severity >= 3');
  const [lastRun] = await all(`SELECT MAX(created_at) as ts FROM events WHERE type = 'info' AND message LIKE 'Pipeline%'`);
  return {
    sitesCount: Number(sites?.count ?? 0),
    articlesCount: Number(articles?.count ?? 0),
    threatsCount: Number(threats?.count ?? 0),
    lastRun: lastRun?.ts || null,
  };
}

export async function getEvents(limit = 200) {
  return all('SELECT * FROM events ORDER BY created_at DESC LIMIT ?', [limit]);
}

export async function getSources() {
  const rows = await all(`
    SELECT source, MAX(fetched_at) as last_crawled, COUNT(*) as article_count
    FROM articles
    GROUP BY source
  `);
  return rows.map((r) => ({ ...r, article_count: Number(r.article_count) }));
}

export async function clearDatabase() {
  await _run('DELETE FROM analyses');
  await _run('DELETE FROM articles');
  await _run('DELETE FROM speeches');
  await _run('DELETE FROM events');
  await _run('DELETE FROM leaders');
  for (const leader of leadersData) {
    await _run(
      `INSERT INTO leaders (id, name, role, country)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, country=excluded.country`,
      [leader.id, leader.name, leader.role, leader.country]
    );
  }
}

export async function closeDb() {
  if (conn) {
    state.conn.close();
    state.conn = null;
  }
  if (state.db) {
    await new Promise((resolve) => state.db.close(resolve));
    state.db = null;
  }
  state.initPromise = null;
}
