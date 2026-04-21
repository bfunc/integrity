import { json } from '@sveltejs/kit';
import { getLeaderStats, getLeaderViolations, getSpeechesAnalyzedByLeader } from '../../../db/database.js';
import leadersData from '../../../data-sources/leaders.json' with { type: 'json' };
const speechTotals = Object.fromEntries(leadersData.map((l) => [l.id, l.speeches.length]));

export async function GET() {
  const [leaders, analyzedMap] = await Promise.all([
    getLeaderStats(),
    getSpeechesAnalyzedByLeader(),
  ]);

  const result = await Promise.all(
    leaders.map(async (leader) => {
      const violations = await getLeaderViolations(leader.id);
      return {
        ...leader,
        speeches_total: speechTotals[leader.id] ?? 0,
        speeches_analyzed: analyzedMap[leader.id] ?? 0,
        violations: violations.map((v) => ({
          id: v.id,
          date: v.analyzed_at,
          title: v.speech_title || v.source_id,
          patterns: typeof v.patterns === 'string' ? JSON.parse(v.patterns) : v.patterns || [],
          summary_md: v.summary_md,
          severity: v.severity,
          severity_label: v.severity_label,
        })),
      };
    })
  );

  return json({ leaders: result });
}
