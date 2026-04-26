import { json } from '@sveltejs/kit';
import { getEvents, getStats, getArticlesWithStatus } from '../../../db/database.js';

// Track scheduler state in memory (prefixed with _ so SvelteKit ignores them as route exports)
let _lastRunTime = null;
let _nextRunTime = null;

export function _setLastRun(ts) { _lastRunTime = ts; }
export function _setNextRun(ts) { _nextRunTime = ts; }

const SITE_RE = /^Источник (\d+) из (\d+): (.+)$/;
const ART_RE  = /^Статья (\d+) из (\d+): /;

function parseProgress(events) {
  // events are newest-first
  const siteIdx = events.findIndex((e) => SITE_RE.test(e.message));
  const artIdx  = events.findIndex((e) => ART_RE.test(e.message));

  if (siteIdx === -1) return null;

  const [, siteNum, siteTot, sourceId] = events[siteIdx].message.match(SITE_RE);

  // Article event is valid only if it is newer than (or equal to) the site event
  const hasArticle = artIdx !== -1 && artIdx <= siteIdx;

  let current = 0, total = 0, percent = 0;
  if (hasArticle) {
    const [, cur, tot] = events[artIdx].message.match(ART_RE);
    current = parseInt(cur);
    total   = parseInt(tot);
    percent = total > 0 ? Math.round(current / total * 100) : 0;
  }

  return {
    currentSource: sourceId,
    siteIdx:    parseInt(siteNum),
    totalSites: parseInt(siteTot),
    current,
    total,
    percent,
  };
}

export async function GET() {
  const [events, stats, articles] = await Promise.all([
    getEvents(200),
    getStats(),
    getArticlesWithStatus(),
  ]);

  return json({
    stats: {
      ...stats,
      lastRun: _lastRunTime || stats.lastRun,
      nextRun: _nextRunTime,
      queueSize: 0,
    },
    events,
    articles: articles.map((a) => ({
      ...a,
      analyzed_count: Number(a.analyzed_count),
    })),
    progress: parseProgress(events),
  });
}
