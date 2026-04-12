import { json } from '@sveltejs/kit';
import { config } from '../../../lib/config.js';
import { runPipeline } from '../../../agents/crawler.js';
import { logEvent } from '../../../db/database.js';

export async function POST({ request }) {
  const body = await request.json();

  if (body.password !== config.manualRunPassword) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }

  // Run pipeline asynchronously
  runPipeline().catch(async (err) => {
    await logEvent('error', `Manual pipeline error: ${err.message}`);
  });

  return json({ ok: true, message: 'Pipeline started' });
}
