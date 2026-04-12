import { json } from '@sveltejs/kit';
import { getEvents, getStats } from '../../../db/database.js';
import { config } from '../../../lib/config.js';

// Track scheduler state in memory (prefixed with _ so SvelteKit ignores them as route exports)
let _lastRunTime = null;
let _nextRunTime = null;

export function _setLastRun(ts) { _lastRunTime = ts; }
export function _setNextRun(ts) { _nextRunTime = ts; }

export async function GET() {
  const [events, stats] = await Promise.all([getEvents(200), getStats()]);

  return json({
    stats: {
      ...stats,
      lastRun: _lastRunTime || stats.lastRun,
      nextRun: _nextRunTime,
      queueSize: 0,
    },
    events,
  });
}
