import { json } from '@sveltejs/kit';
import { getEvents, getStats, getArticlesWithStatus } from '../../../db/database.js';
import { config } from '../../../lib/config.js';

// Track scheduler state in memory (prefixed with _ so SvelteKit ignores them as route exports)
let _lastRunTime = null;
let _nextRunTime = null;

export function _setLastRun(ts) { _lastRunTime = ts; }
export function _setNextRun(ts) { _nextRunTime = ts; }

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
  });
}
