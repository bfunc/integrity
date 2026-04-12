import { json } from '@sveltejs/kit';
import { getSources } from '../../../db/database.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sitesData = JSON.parse(readFileSync(resolve(__dirname, '../../../../external/sites.json'), 'utf-8'));
const leadersData = JSON.parse(readFileSync(resolve(__dirname, '../../../../external/leaders.json'), 'utf-8'));

export async function GET() {
  const crawlStatus = await getSources();
  const statusMap = Object.fromEntries(crawlStatus.map((s) => [s.source, s]));

  const sitesWithStatus = sitesData.map((site) => ({
    ...site,
    last_crawled: statusMap[site.id]?.last_crawled || null,
    article_count: statusMap[site.id]?.article_count || 0,
  }));

  return json({ sites: sitesWithStatus, leaders: leadersData });
}
