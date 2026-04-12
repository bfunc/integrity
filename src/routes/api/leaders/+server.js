import { json } from '@sveltejs/kit';
import { getLeaderStats, getLeaderViolations, getSpeechesAnalyzedByLeader } from '../../../db/database.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leadersData = JSON.parse(readFileSync(resolve(__dirname, '../../../../external/leaders.json'), 'utf-8'));
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
          pattern: (() => {
            const patterns = typeof v.patterns === 'string' ? JSON.parse(v.patterns) : v.patterns || [];
            return patterns[0]?.name || '';
          })(),
          summary_md: v.summary_md,
          severity: v.severity,
        })),
      };
    })
  );

  return json({ leaders: result });
}
