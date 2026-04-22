import { json } from '@sveltejs/kit';
import { getDashboardData } from '../../../db/database.js';
import { getOrFetch } from '../../../lib/statsCache.js';

export async function GET() {
  const data = await getOrFetch(getDashboardData);
  return json(data);
}
