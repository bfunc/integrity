import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { CronJob } from 'cron';
import { config } from '../lib/config.js';
import {
  articleExists,
  insertArticle,
  updateArticleStatus,
  insertAnalysis,
  insertSpeech,
  speechExists,
  updateSpeechStatus,
  upsertLeader,
  logEvent,
} from '../db/database.js';
import { analyzeArticle, analyzeFullText, analyzeSpeech } from './linza.js';
import sitesData from '../../external/sites.json' with { type: 'json' };
import leadersData from '../../external/leaders.json' with { type: 'json' };

const parser = new Parser({ timeout: 10000 });

const sites = sitesData;

function isFiltered(title, excerpt) {
  const text = `${title} ${excerpt || ''}`.toLowerCase();
  return config.keywordFilter.some((kw) => text.includes(kw));
}

async function scrapeText(url, selectors) {
  const effectiveSelectors = selectors || config.scraping.selectors;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    let text = '';
    for (const sel of effectiveSelectors) {
      const content = $(sel).text().trim();
      if (content.length > text.length) text = content;
    }
    return text.length >= config.scraping.minTextLength ? text : null;
  } catch (err) {
    return null;
  }
}

export async function runPipeline() {
  await logEvent('info', 'Pipeline started');

  // --- Leaders + Speeches pipeline ---
  for (const leader of leadersData) {
    try { await upsertLeader(leader); } catch (err) {
      await logEvent('warning', `Could not upsert leader ${leader.id}: ${err.message}`);
    }

    for (const speech of leader.speeches) {
      try {
        if (await speechExists(speech.id)) continue;
        await insertSpeech({ ...speech, leader_id: leader.id });

        const fullText = await scrapeText(speech.url, null);
        if (!fullText) {
          await updateSpeechStatus(speech.id, 'error');
          await logEvent('warning', `Could not scrape speech: ${speech.id}`);
          continue;
        }

        await updateSpeechStatus(speech.id, 'analyzed', fullText);

        const analysis = await analyzeSpeech({ ...speech, full_text: fullText });

        await insertAnalysis({
          source_type: 'speech',
          source_id: speech.id,
          leader_id: leader.id,
          severity: analysis.severity,
          severity_label: analysis.severity_label,
          patterns: analysis.patterns,
          summary_md: analysis.summary_md,
          raw_response: analysis.raw_response,
        });
      } catch (err) {
        await logEvent('warning', `Speech ${speech.id} failed: ${err.message}`);
        try { await updateSpeechStatus(speech.id, 'error'); } catch {}
      }
    }
  }

  // --- Articles pipeline ---
  for (const site of sites) {
    try {
      const feed = await parser.parseURL(site.url);
      for (const item of feed.items || []) {
        const url = item.link;
        if (!url) continue;

        const title = item.title || '';
        const excerpt = item.contentSnippet || item.summary || '';
        const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

        if (isFiltered(title, excerpt)) continue;
        if (await articleExists(url)) continue;

        const id = randomUUID();
        await insertArticle({ id, url, source: site.id, title, excerpt, published_at: publishedAt, status: 'new' });

        let analysis;
        try {
          analysis = await analyzeArticle({ id, title, excerpt });
        } catch {
          await updateArticleStatus(id, 'error');
          continue;
        }

        if (analysis.severity >= config.analysis.scrapeThreshold) {
          const fullText = await scrapeText(url, site.selectors);
          if (fullText) {
            await updateArticleStatus(id, 'queued', fullText);
            try {
              analysis = await analyzeFullText({ id, title, full_text: fullText });
            } catch {
              await updateArticleStatus(id, 'error');
              continue;
            }
          }
        }

        await insertAnalysis({
          source_type: 'article',
          source_id: id,
          leader_id: null,
          severity: analysis.severity,
          severity_label: analysis.severity_label,
          patterns: analysis.patterns,
          summary_md: analysis.summary_md,
          raw_response: analysis.raw_response,
        });
        await updateArticleStatus(id, 'analyzed');
      }
    } catch (err) {
      await logEvent('warning', `RSS fetch failed for ${site.id}: ${err.message}`);
    }
  }

  await logEvent('info', 'Pipeline completed');
}

export function scheduleCron() {
  for (const schedule of config.cron.schedules) {
    new CronJob(schedule, runPipeline, null, true, 'UTC');
  }
}
