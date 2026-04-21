import { json } from '@sveltejs/kit';
import { getFeedAnalyses } from '../../../db/database.js';

export async function GET({ url }) {
  const tab = url.searchParams.get('tab') || 'threats';
  const rows = await getFeedAnalyses(tab);

  const items = rows.map((r) => ({
    id: r.id,
    source_type: r.source_type,
    source_id: r.source_id,
    title: r.article_title || r.speech_title || '',
    source: r.source || r.leader_id || '',
    leader_name: r.leader_name || null,
    leader_role: r.leader_role || null,
    url: r.article_url || r.speech_url || '',
    published_at: r.published_at || r.speech_date || null,
    analyzed_at: r.analyzed_at,
    severity: r.severity,
    severity_label: r.severity_label,
    patterns: typeof r.patterns === 'string' ? JSON.parse(r.patterns) : r.patterns || [],
    summary_md: r.summary_md,
    advocate_status: r.advocate_status || null,
    attribution_role: r.attribution_role || null,
    attributed_to: r.attributed_to || null,
  }));

  return json({ items });
}
