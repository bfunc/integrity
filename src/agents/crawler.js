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
import sitesData from "../data-sources/sources.json" with { type: "json" };
import leadersData from "../data-sources/leaders.json" with { type: "json" };

const VARIANTS = {
  netanyahu: ["netanyahu", "נתניהו", "bibi"],
  ben_gvir: ["ben-gvir", "ben gvir", "בן גביר"],
  smotrich: ["smotrich", "סמוטריץ"],
  lapid: ["lapid", "לפיד"],
  gantz: ["gantz", "גנץ"],
  deri: ["deri", "דרעי"],
};

export function detectLeader(linzaResult, articleTitle = "") {
  // Pass 1: speaker name from LINZA — most reliable, checked exclusively first
  const speaker = (
    linzaResult?.speaker ??
    linzaResult?.attributed_to ??
    ""
  ).toLowerCase();
  if (speaker) {
    for (const [id, variants] of Object.entries(VARIANTS)) {
      if (variants.some((v) => speaker.includes(v))) return id;
    }
  }

  // Pass 2: article title only — body text excluded (too many incidental mentions)
  const title = articleTitle.toLowerCase();
  for (const [id, variants] of Object.entries(VARIANTS)) {
    if (variants.some((v) => title.includes(v))) return id;
  }

  return null;
}
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
    console.log(
      `Linza config: subtext=${config.linza.subtext} summary=${config.linza.summary}`,
    );

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
            summary_md: analysis.summary_md ?? null,
            subtext: analysis.subtext ?? null,
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

    // --- Articles pipeline ---
    const totalSites = sites.length;
    let siteIdx = 0;
    for (const site of sites) {
      siteIdx++;
      if (stopRequested) break;
      await logEvent("info", `מקור ${siteIdx} מתוך ${totalSites}: ${site.id}`);

      // Fetch RSS — isolated so parse errors don't mask article-level errors
      let feed;
      try {
        feed = await parser.parseURL(site.url);
      } catch (err) {
        await logEvent(
          "warning",
          `RSS fetch failed for ${site.id}: ${err.message}`,
        );
        continue;
      }

      const feedItems = feed.items || [];
      const feedTotal = feedItems.length;
      let itemIdx = 0;

      for (const item of feedItems) {
        itemIdx++;
        const url = item.link;
        if (!url) continue;

        const title = item.title || "";
        const excerpt = item.contentSnippet || item.summary || "";
        const publishedAt = item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString();

        if (isFiltered(title, excerpt)) continue;
        if (await articleExists(url)) continue;

        // Per-article try/catch — errors here log with full context, not as RSS failure
        const id = randomUUID();
        try {
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
            await updateArticleStatus(id, "analyzing");
            analysis = await analyzeArticle({ id, title, excerpt });
          } catch (err) {
            await logEvent(
              "warning",
              `Analysis error in ${site.id} — "${title.slice(0, 40)}": ${err.message}`,
            );
            await updateArticleStatus(id, "error");
            continue;
          }

          if (analysis.severity >= config.analysis.scrapeThreshold) {
            const fullText = await scrapeText(url, site.selectors);
            if (fullText) {
              await updateArticleStatus(id, "queued", fullText);
              try {
                await updateArticleStatus(id, "analyzing");
                analysis = await analyzeFullText({
                  id,
                  title,
                  full_text: fullText,
                });
              } catch (err) {
                await logEvent(
                  "warning",
                  `Full-text analysis error in ${site.id} — "${title.slice(0, 40)}": ${err.message}`,
                );
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
            leader_id: detectLeader(analysis, title),
            severity: analysis.severity,
            severity_label: analysis.severity_label,
            patterns: analysis.patterns,
            summary_md: analysis.summary_md ?? null,
            subtext: analysis.subtext ?? null,
            raw_response: analysis.raw_response,
            attribution_role: attrRole,
            attributed_to: speaker,
          });
          await updateArticleStatus(id, "analyzed");
          await logEvent(
            "info",
            `כתבה ${itemIdx} מתוך ${feedTotal}: ${title.slice(0, 40)}`,
          );
        } catch (err) {
          await logEvent(
            "warning",
            `Article error in ${site.id} — "${title.slice(0, 40)}": ${err.message}`,
          );
          await updateArticleStatus(id, "error").catch(() => {});
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
