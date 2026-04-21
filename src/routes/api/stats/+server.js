import { json } from '@sveltejs/kit';
import { getDashboardData } from '../../../db/database.js';

export async function GET() {
  const data = await getDashboardData();
  return json(data);
}
