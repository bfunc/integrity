import duckdb from "duckdb";
import { config } from "../lib/config.js";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import leadersData from "../data-sources/leaders.json" with { type: "json" };

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
  if (state.conn) return { existingFile: true };

  const dbPath = config.db.path;
  console.log(`[initDb] dbPath from config: ${JSON.stringify(dbPath)}`);

  const isFileBacked = dbPath && dbPath !== ":memory:";
  const existingFile = isFileBacked ? existsSync(dbPath) : false;

  console.log(`[initDb] isFileBacked: ${isFileBacked}`);
  console.log(`[initDb] existsSync(dbPath): ${existingFile}`);

  // Ensure DB directory exists for file-backed databases.
  if (isFileBacked) {
    const dir = dirname(dbPath);
    console.log(`[initDb] ensuring directory exists: ${JSON.stringify(dir)}`);
    try {
      mkdirSync(dir, { recursive: true });
      console.log(`[initDb] directory ready: ${JSON.stringify(dir)}`);
    } catch (dirErr) {
      console.error(
        `[initDb] failed to create directory ${JSON.stringify(dir)}:`,
        dirErr,
      );
      throw dirErr;
    }
  }

  console.log(
    `[initDb] opening DuckDB at absolute path: ${JSON.stringify(resolve(dbPath))}`,
  );

  await new Promise((resolve, reject) => {
    state.db = new duckdb.Database(dbPath, (err) => {
      if (err) {
        console.error(
          `[initDb] DuckDB open error for path ${JSON.stringify(dbPath)}:`,
          err,
        );
        reject(err);
      } else {
        console.log(
          `[initDb] DuckDB opened successfully at: ${JSON.stringify(dbPath)}`,
        );
        resolve();
      }
    });
  });

  if (isFileBacked) {
    console.log("[initDb] file exists after DuckDB open:", existsSync(dbPath));
  }

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

  // Prevent duplicate analyses for the same source (safe to run multiple times)
  await _run(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_analysis_source
    ON analyses(source_id, source_type)
  `);

  // Attribution columns — idempotent for existing databases
  await _run(
    `ALTER TABLE analyses ADD COLUMN IF NOT EXISTS attribution_role TEXT`,
  );
  await _run(
    `ALTER TABLE analyses ADD COLUMN IF NOT EXISTS attributed_to TEXT`,
  );
  await _run(
    `ALTER TABLE analyses ADD COLUMN IF NOT EXISTS subtext TEXT`,
  );

  const [dbStateRow] = await _all(`
    SELECT
      (SELECT COUNT(*) FROM articles) AS articles_count,
      (SELECT COUNT(*) FROM speeches) AS speeches_count,
      (SELECT COUNT(*) FROM analyses) AS analyses_count,
      (SELECT COUNT(*) FROM events) AS events_count,
      (
        SELECT MAX(created_at)
        FROM events
        WHERE type = 'info' AND message LIKE 'Pipeline%'
      ) AS last_run
  `);

  const hasData =
    Number(dbStateRow?.articles_count ?? 0) > 0 ||
    Number(dbStateRow?.speeches_count ?? 0) > 0 ||
    Number(dbStateRow?.analyses_count ?? 0) > 0 ||
    Number(dbStateRow?.events_count ?? 0) > 0;

  console.log(`[initDb] data present: ${hasData ? "yes" : "no"}`);
  if (dbStateRow?.last_run) {
    console.log(`[initDb] last pipeline run: ${dbStateRow.last_run}`);
  } else {
    console.log("[initDb] last pipeline run: none");
  }

  await seedLeaders(false);

  return { existingFile };
}

async function seedLeaders(overwrite = true) {
  for (const leader of leadersData) {
    if (overwrite) {
      await _run(
        `INSERT INTO leaders (id, name, role, country)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, country=excluded.country`,
        [leader.id, leader.name, leader.role, leader.country],
      );
    } else {
      await _run(
        `INSERT INTO leaders (id, name, role, country)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        [leader.id, leader.name, leader.role, leader.country],
      );
    }
  }
}

// Internal helpers — conn must already be set
function _run(sql, params = []) {
  if (!state.conn) {
    return Promise.reject(new Error("[db:_run] no active connection"));
  }

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
  const rows = await all("SELECT id FROM articles WHERE url = ?", [url]);
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
      article.status || "new",
    ],
  );
}

export async function updateArticleStatus(id, status, fullText = null) {
  if (fullText !== null) {
    await run("UPDATE articles SET status = ?, full_text = ? WHERE id = ?", [
      status,
      fullText,
      id,
    ]);
  } else {
    await run("UPDATE articles SET status = ? WHERE id = ?", [status, id]);
  }
}

export async function insertAnalysis(analysis) {
  await run(
    `INSERT INTO analyses (id, source_type, source_id, leader_id, analyzed_at, severity, severity_label, patterns, summary_md, subtext, raw_response, attribution_role, attributed_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (source_id, source_type) DO NOTHING`,
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
      analysis.subtext || null,
      JSON.stringify(analysis.raw_response),
      analysis.attribution_role || null,
      analysis.attributed_to || null,
    ],
  );
}

export async function upsertLeader(leader) {
  await run(
    `INSERT INTO leaders (id, name, role, country)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, country=excluded.country`,
    [leader.id, leader.name, leader.role, leader.country],
  );
}

export async function speechExists(id) {
  const rows = await all("SELECT id FROM speeches WHERE id = ?", [id]);
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
      "new",
    ],
  );
}

export async function updateSpeechStatus(id, status, fullText = null) {
  if (fullText !== null) {
    await run("UPDATE speeches SET status = ?, full_text = ? WHERE id = ?", [
      status,
      fullText,
      id,
    ]);
  } else {
    await run("UPDATE speeches SET status = ? WHERE id = ?", [status, id]);
  }
}

export async function logEvent(type, message) {
  await run(
    "INSERT INTO events (id, created_at, type, message) VALUES (?, ?, ?, ?)",
    [randomUUID(), new Date().toISOString(), type, message],
  );
}

export async function trimEvents(keep = 1000) {
  await run(
    `DELETE FROM events WHERE id NOT IN (
       SELECT id FROM events ORDER BY created_at DESC LIMIT ?
     )`,
    [keep],
  );
}

export async function getFeedAnalyses(tab) {
  if (tab === "threats") {
    return all(`
      SELECT a.*, ar.title as article_title, ar.source, ar.url as article_url, ar.published_at,
             s.title as speech_title, s.leader_id, s.url as speech_url,
             l.name as leader_name, l.role as leader_role
      FROM analyses a
      LEFT JOIN articles ar ON a.source_type = 'article' AND a.source_id = ar.id
      LEFT JOIN speeches s ON a.source_type = 'speech' AND a.source_id = s.id
      LEFT JOIN leaders l ON a.leader_id = l.id
      WHERE a.severity >= 3
      ORDER BY a.analyzed_at DESC
      LIMIT 100
    `);
  } else {
    return all(`
      SELECT a.*, ar.title as article_title, ar.source, ar.url as article_url, ar.published_at,
             l.name as leader_name, l.role as leader_role
      FROM analyses a
      JOIN articles ar ON a.source_id = ar.id
      LEFT JOIN leaders l ON a.leader_id = l.id
      WHERE a.source_type = 'article' AND a.severity >= 2
      ORDER BY a.analyzed_at DESC
      LIMIT 100
    `);
  }
}

export async function getLeaderStats() {
  const rows = await all(`
    SELECT l.id, l.name, l.role, l.country,
           COUNT(CASE WHEN a.severity >= 2 AND lower(a.severity_label) != 'none' THEN 1 END) as violation_count,
           MAX(CASE WHEN a.severity >= 2 AND lower(a.severity_label) != 'none' THEN a.severity END) as max_severity,
           MAX(CASE WHEN a.severity >= 2 AND lower(a.severity_label) != 'none' THEN a.analyzed_at END) as last_violation_date
    FROM leaders l
    LEFT JOIN analyses a ON a.leader_id = l.id
    GROUP BY l.id, l.name, l.role, l.country
  `);
  return rows.map((r) => ({
    ...r,
    violation_count: Number(r.violation_count),
  }));
}

export async function getSpeechesAnalyzedByLeader() {
  const rows = await all(`
    SELECT leader_id, COUNT(*) as analyzed_count
    FROM speeches
    WHERE status = 'analyzed' AND leader_id IS NOT NULL
    GROUP BY leader_id
  `);
  return Object.fromEntries(
    rows.map((r) => [r.leader_id, Number(r.analyzed_count)]),
  );
}

export async function getLeaderViolations(leaderId) {
  return all(
    `SELECT a.*, s.title as speech_title, s.date as speech_date
     FROM analyses a
     LEFT JOIN speeches s ON a.source_id = s.id
     WHERE a.leader_id = ? AND lower(a.severity_label) != 'none' AND a.severity >= 2
     ORDER BY a.analyzed_at DESC`,
    [leaderId],
  );
}

export async function getAllLeaderViolations() {
  return all(
    `SELECT a.*, s.title as speech_title, s.date as speech_date
     FROM analyses a
     LEFT JOIN speeches s ON a.source_id = s.id
     WHERE a.leader_id IS NOT NULL AND lower(a.severity_label) != 'none' AND a.severity >= 2
     ORDER BY a.leader_id, a.analyzed_at DESC`,
  );
}

export async function getDashboardData() {
  const [kpiRow] = await all(`
    SELECT
      COUNT(*) FILTER (WHERE severity >= 3) as total_threats,
      COUNT(*) FILTER (WHERE severity = 5) as critical,
      COUNT(DISTINCT attributed_to) FILTER (WHERE attribution_role = 'originator') as unique_speakers
    FROM analyses
  `);

  const top_manipulators = await all(`
    SELECT attributed_to, COUNT(*) as count, MAX(severity) as max_severity, MAX(analyzed_at) as last_seen
    FROM analyses
    WHERE attribution_role = 'originator' AND source_type = 'speech'
    GROUP BY attributed_to ORDER BY count DESC LIMIT 10
  `);

  const top_originators_rss = await all(`
    SELECT attributed_to, COUNT(*) as count, MAX(severity) as max_severity
    FROM analyses
    WHERE attribution_role = 'originator' AND source_type = 'article'
    GROUP BY attributed_to ORDER BY count DESC LIMIT 10
  `);

  const top_amplifiers = await all(`
    SELECT attributed_to, COUNT(*) as count
    FROM analyses
    WHERE attribution_role = 'amplifier'
    GROUP BY attributed_to ORDER BY count DESC LIMIT 10
  `);

  const trend_raw = await all(`
    SELECT CAST(analyzed_at AS DATE) as day, severity, COUNT(*) as count
    FROM analyses
    WHERE analyzed_at > NOW() - INTERVAL '30 days'
    GROUP BY CAST(analyzed_at AS DATE), severity
    ORDER BY day
  `);

  // For heatmap: fetch analyses with patterns for top 8 sources
  const top8sources = await all(`
    SELECT attributed_to
    FROM analyses
    WHERE attributed_to IS NOT NULL AND attribution_role != 'reporter'
    GROUP BY attributed_to ORDER BY COUNT(*) DESC LIMIT 8
  `);

  const heatmap_raw = await all(`
    SELECT attributed_to, patterns
    FROM analyses
    WHERE attributed_to IN (
      SELECT attributed_to FROM analyses
      WHERE attributed_to IS NOT NULL AND attribution_role != 'reporter'
      GROUP BY attributed_to ORDER BY COUNT(*) DESC LIMIT 8
    )
    AND patterns IS NOT NULL
  `);

  // Dangerous articles (severity = 5)
  const dangerous = await all(`
    SELECT ar.title, ar.source, an.attributed_to, an.patterns, an.attribution_role, ar.published_at
    FROM articles ar
    JOIN analyses an ON an.source_id = ar.id AND an.source_type = 'article'
    WHERE an.severity = 5
    ORDER BY ar.published_at DESC LIMIT 10
  `);

  const [severityHigh] = await all(
    `SELECT COUNT(*) as count FROM analyses WHERE severity >= 4`,
  );
  const [severityMod] = await all(
    `SELECT COUNT(*) as count FROM analyses WHERE severity = 3`,
  );
  const [lastRunRow] = await all(
    `SELECT MAX(created_at) as ts FROM events WHERE type = 'info' AND message LIKE 'Pipeline%'`,
  );

  // Build heatmap matrix in JS
  const sourceKeys = top8sources.map((r) => r.attributed_to);
  const patternCounts = {};
  for (const row of heatmap_raw) {
    const src = row.attributed_to;
    let patterns;
    try {
      patterns =
        typeof row.patterns === "string"
          ? JSON.parse(row.patterns)
          : row.patterns || [];
    } catch {
      patterns = [];
    }
    for (const p of patterns) {
      const key = p.name;
      if (!patternCounts[key]) patternCounts[key] = {};
      patternCounts[key][src] = (patternCounts[key][src] || 0) + 1;
    }
  }
  const heatmap = Object.entries(patternCounts).map(([pattern, srcs]) => ({
    pattern,
    srcs,
  }));

  // Top pattern today
  const patternTodayCounts = {};
  const todayRows = await all(`
    SELECT patterns FROM analyses
    WHERE analyzed_at > NOW() - INTERVAL '24 hours' AND patterns IS NOT NULL
  `);
  for (const row of todayRows) {
    let patterns;
    try {
      patterns =
        typeof row.patterns === "string"
          ? JSON.parse(row.patterns)
          : row.patterns || [];
    } catch {
      patterns = [];
    }
    for (const p of patterns) {
      patternTodayCounts[p.name] = (patternTodayCounts[p.name] || 0) + 1;
    }
  }
  let topPatternToday = null;
  if (Object.keys(patternTodayCounts).length > 0) {
    const [name, count] = Object.entries(patternTodayCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];
    topPatternToday = { name, count };
  }

  return {
    kpi: {
      total: Number(kpiRow?.total_threats ?? 0),
      critical: Number(kpiRow?.critical ?? 0),
      unique_speakers: Number(kpiRow?.unique_speakers ?? 0),
    },
    top_manipulators: top_manipulators.map((r) => ({
      ...r,
      count: Number(r.count),
      max_severity: Number(r.max_severity),
    })),
    top_sources: {
      originators: top_originators_rss.map((r) => ({
        ...r,
        count: Number(r.count),
        max_severity: Number(r.max_severity),
      })),
      amplifiers: top_amplifiers.map((r) => ({ ...r, count: Number(r.count) })),
    },
    trend: trend_raw.map((r) => ({
      ...r,
      count: Number(r.count),
      severity: Number(r.severity),
    })),
    heatmap,
    source_keys: sourceKeys,
    dangerous: dangerous.map((r) => ({
      ...r,
      pattern_type: (() => {
        try {
          const p =
            typeof r.patterns === "string"
              ? JSON.parse(r.patterns)
              : r.patterns;
          return Array.isArray(p) && p[0] ? p[0].name : null;
        } catch {
          return null;
        }
      })(),
    })),
    header: {
      severity_high: Number(severityHigh?.count ?? 0),
      severity_moderate: Number(severityMod?.count ?? 0),
      last_run: lastRunRow?.ts || null,
      top_pattern_today: topPatternToday,
    },
  };
}

export async function getStats() {
  const [sites] = await all(
    "SELECT COUNT(DISTINCT source) as count FROM articles",
  );
  const [articles] = await all("SELECT COUNT(*) as count FROM articles");
  const [threats] = await all(
    "SELECT COUNT(*) as count FROM analyses WHERE severity >= 3",
  );
  const [lastRun] = await all(
    `SELECT MAX(created_at) as ts FROM events WHERE type = 'info' AND message LIKE 'Pipeline%'`,
  );
  return {
    sitesCount: Number(sites?.count ?? 0),
    articlesCount: Number(articles?.count ?? 0),
    threatsCount: Number(threats?.count ?? 0),
    lastRun: lastRun?.ts || null,
  };
}

export async function getEvents(limit = 200) {
  return all("SELECT * FROM events ORDER BY created_at DESC LIMIT ?", [limit]);
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
  await _run("DELETE FROM analyses");
  await _run("DELETE FROM articles");
  await _run("DELETE FROM speeches");
  await _run("DELETE FROM events");
  await _run("DELETE FROM leaders");
  await seedLeaders(true);
}

export async function exportData() {
  await ensureConn();
  const articles = await _all("SELECT * FROM articles");
  const analyses = await _all("SELECT * FROM analyses");
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    articles,
    analyses,
  };
}

export async function importData(data) {
  await ensureConn();
  for (const a of data.articles || []) {
    await _run(
      `INSERT INTO articles (id, url, source, title, excerpt, full_text, published_at, fetched_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
      [
        a.id,
        a.url,
        a.source,
        a.title,
        a.excerpt,
        a.full_text ?? null,
        a.published_at ?? null,
        a.fetched_at ?? null,
        a.status ?? "analyzed",
      ],
    );
  }
  for (const a of data.analyses || []) {
    await _run(
      `INSERT INTO analyses (id, source_type, source_id, leader_id, analyzed_at, severity, severity_label, patterns, summary_md, subtext, raw_response, attribution_role, attributed_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (source_id, source_type) DO NOTHING`,
      [
        a.id,
        a.source_type,
        a.source_id,
        a.leader_id ?? null,
        a.analyzed_at,
        a.severity,
        a.severity_label,
        typeof a.patterns === "string"
          ? a.patterns
          : JSON.stringify(a.patterns),
        a.summary_md,
        a.subtext ?? null,
        typeof a.raw_response === "string"
          ? a.raw_response
          : JSON.stringify(a.raw_response),
        a.attribution_role ?? null,
        a.attributed_to ?? null,
      ],
    );
  }
  return {
    articles: (data.articles || []).length,
    analyses: (data.analyses || []).length,
  };
}

export async function getArticlesWithStatus() {
  return all(`
    SELECT a.id, a.url, a.title, a.source, a.published_at, a.status,
      (SELECT COUNT(*) FROM analyses an
       WHERE an.source_id = a.id AND an.source_type = 'article') AS analyzed_count
    FROM articles a
    ORDER BY a.published_at DESC
    LIMIT 200
  `);
}

export async function getArticleTitlesByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await all(
    `SELECT id, title FROM articles WHERE id IN (${placeholders})`,
    ids,
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}

export async function getRhetoricMatrix() {
  return all(`
    SELECT
      a.source_id,
      a.leader_id,
      DATE_TRUNC('week', a.analyzed_at) AS week_start,
      AVG(a.severity)                   AS avg_severity,
      MAX(a.severity)                   AS max_severity,
      COUNT(*)                          AS article_count
    FROM analyses a
    WHERE a.leader_id IS NOT NULL
      AND a.leader_id != ''
      AND a.source_id IS NOT NULL
    GROUP BY a.source_id, a.leader_id, week_start
    ORDER BY week_start ASC
  `);
}

export async function getAnalysesMeta() {
  const rows = await all(`
    SELECT
      COUNT(*) AS total,
      COUNT(leader_id) AS with_leader,
      SUM(CASE WHEN leader_id IS NULL OR leader_id = '' THEN 1 ELSE 0 END) AS null_leader
    FROM analyses
  `);
  return rows[0] ?? { total: 0, with_leader: 0, null_leader: 0 };
}

export async function closeDb() {
  const dbPath = config.db.path;
  const isFileBacked = dbPath && dbPath !== ":memory:";

  if (state.conn) {
    if (isFileBacked) {
      console.log("[closeDb] file exists before closing:", existsSync(dbPath));
    }
    state.conn.close();
    state.conn = null;
  }
  if (state.db) {
    await new Promise((resolve) => state.db.close(resolve));
    state.db = null;
    if (isFileBacked) {
      console.log("[closeDb] file exists after closing:", existsSync(dbPath));
    }
  }
  state.initPromise = null;
}
