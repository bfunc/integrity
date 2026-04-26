import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import { CronJob } from "cron";
import { config } from "../lib/config.js";
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
  trimEvents,
} from "../db/database.js";
import { analyzeArticle, analyzeFullText, analyzeSpeech } from "./linza.js";
import sitesData from "../data-sources/sites.json" with { type: "json" };
import leadersData from "../data-sources/leaders.json" with { type: "json" };
import { invalidateStatsCache } from "../lib/statsCache.js";

const parser = new Parser({ timeout: 10000 });

const sites = sitesData;
let pipelinePromise = null;
let stopRequested = false;

export function requestPipelineStop() {
  stopRequested = true;
}

export function isPipelineStopRequested() {
  return stopRequested;
}

function isFiltered(title, excerpt) {
  const text = `${title} ${excerpt || ""}`.toLowerCase();
  return config.keywordFilter.some((kw) => text.includes(kw));
}

async function scrapeText(url, selectors) {
  const effectiveSelectors = selectors || config.scraping.selectors;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    let text = "";
    for (const sel of effectiveSelectors) {
      const content = $(sel).text().trim();
      if (content.length > text.length) text = content;
    }
    return text.length >= config.scraping.minTextLength ? text : null;
  } catch (err) {
    return null;
  }
}

export function isPipelineRunning() {
  return !!pipelinePromise;
}

export async function runPipeline() {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  pipelinePromise = (async () => {
    stopRequested = false;
    await trimEvents();
    await logEvent("info", "Pipeline started");

    // --- Articles pipeline ---
    for (const site of sites) {
      if (stopRequested) break;
      try {
        const feed = await parser.parseURL(site.url);
        for (const item of feed.items || []) {
          const url = item.link;
          if (!url) continue;

          const title = item.title || "";
          const excerpt = item.contentSnippet || item.summary || "";
          const publishedAt = item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString();

          if (isFiltered(title, excerpt)) continue;
          if (await articleExists(url)) continue;

          const id = randomUUID();
          await insertArticle({
            id,
            url,
            source: site.id,
            title,
            excerpt,
            published_at: publishedAt,
            status: "new",
          });

          let analysis;
          try {
            analysis = await analyzeArticle({ id, title, excerpt });
          } catch {
            await updateArticleStatus(id, "error");
            continue;
          }

          if (analysis.severity >= config.analysis.scrapeThreshold) {
            const fullText = await scrapeText(url, site.selectors);
            if (fullText) {
              await updateArticleStatus(id, "queued", fullText);
              try {
                analysis = await analyzeFullText({
                  id,
                  title,
                  full_text: fullText,
                });
              } catch {
                await updateArticleStatus(id, "error");
                continue;
              }
            }
          }

          const attrRole = analysis.source_role || analysis.role || "reporter";
          const speaker = analysis.speaker || null;
          await insertAnalysis({
            source_type: "article",
            source_id: id,
            leader_id: null,
            severity: analysis.severity,
            severity_label: analysis.severity_label,
            patterns: analysis.patterns,
            summary_md: analysis.summary_md,
            subtext: analysis.subtext,
            raw_response: analysis.raw_response,
            attribution_role: attrRole,
            attributed_to: speaker,
          });
          await updateArticleStatus(id, "analyzed");
        }
      } catch (err) {
        await logEvent(
          "warning",
          `RSS fetch failed for ${site.id}: ${err.message}`,
        );
      }
    }

    // --- Leaders + Speeches pipeline ---
    for (const leader of leadersData) {
      if (stopRequested) break;
      try {
        await upsertLeader(leader);
      } catch (err) {
        await logEvent(
          "warning",
          `Could not upsert leader ${leader.id}: ${err.message}`,
        );
      }

      for (const speech of leader.speeches) {
        if (stopRequested) break;
        try {
          if (await speechExists(speech.id)) continue;
          await insertSpeech({ ...speech, leader_id: leader.id });

          const fullText = await scrapeText(speech.url, null);
          if (!fullText) {
            await updateSpeechStatus(speech.id, "error");
            await logEvent("warning", `Could not scrape speech: ${speech.id}`);
            continue;
          }

          await updateSpeechStatus(speech.id, "analyzed", fullText);

          const analysis = await analyzeSpeech({
            ...speech,
            full_text: fullText,
          });

          await insertAnalysis({
            source_type: "speech",
            source_id: speech.id,
            leader_id: leader.id,
            severity: analysis.severity,
            severity_label: analysis.severity_label,
            patterns: analysis.patterns,
            summary_md: analysis.summary_md,
            subtext: analysis.subtext,
            raw_response: analysis.raw_response,
            attribution_role: "originator",
            attributed_to: leader.name,
          });
        } catch (err) {
          await logEvent(
            "warning",
            `Speech ${speech.id} failed: ${err.message}`,
          );
          try {
            await updateSpeechStatus(speech.id, "error");
          } catch {}
        }
      }
    }

    if (stopRequested) {
      await logEvent("warning", "Pipeline stopped by user");
    } else {
      await logEvent("info", "Pipeline completed");
    }
    stopRequested = false;
    invalidateStatsCache();
  })();

  try {
    return await pipelinePromise;
  } finally {
    pipelinePromise = null;
  }
}

export function scheduleCron() {
  for (const schedule of config.cron.schedules) {
    new CronJob(schedule, runPipeline, null, true, "UTC");
  }
}
