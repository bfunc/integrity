import { json } from '@sveltejs/kit';
import { config } from '../../../lib/config.js';
import { clearDatabase } from '../../../db/database.js';

export async function POST({ request }) {
  const body = await request.json();

  if (body.password !== config.manualRunPassword) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }

  await clearDatabase();

  return json({ ok: true, message: 'База очищена' });
}
