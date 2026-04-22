import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { config } from "../lib/config.js";
import { buildSystemPrompt, buildUserPrompt } from "../linza/prompt.js";
import { logEvent } from "../db/database.js";

const isLocal = process.env.LOCAL_MODEL === "true";

const anthropicClient = isLocal
  ? null
  : new Anthropic({ apiKey: config.anthropic.apiKey });

const localClient = isLocal
  ? new OpenAI({
      baseURL: process.env.LOCAL_MODEL_BASE_URL || "http://localhost:1234/v1",
      apiKey: process.env.LOCAL_MODEL_API_KEY || "lm-studio",
    })
  : null;

const localModel = process.env.LOCAL_MODEL_NAME || "local-model";

const systemPrompt = buildSystemPrompt();

const LLM_TIMEOUT_MS = 60_000;

async function callLLM(text) {
  if (isLocal) {
    const response = await localClient.chat.completions.create(
      {
        model: localModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(text) },
        ],
        temperature: 0.3,
      },
      { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) },
    );
    return response.choices[0].message.content;
  } else {
    const response = await anthropicClient.messages.create(
      {
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: buildUserPrompt(text) }],
      },
      { timeout: LLM_TIMEOUT_MS },
    );
    return response.content[0].text;
  }
}

export async function runLinza(text) {
  const raw = (await callLLM(text)).trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`LINZA returned non-JSON: ${raw.slice(0, 200)}`);
    }
  }

  return { ...parsed, raw_response: raw };
}

export async function analyzeArticle(article) {
  const text = `${article.title}\n\n${article.excerpt || ""}`;
  try {
    const result = await runLinza(text);
    await logEvent(
      "info",
      `Analyzed article: ${article.title.slice(0, 80)} → severity ${result.severity}`,
    );
    return result;
  } catch (err) {
    await logEvent(
      "error",
      `LINZA error for article ${article.id}: ${err.message}`,
    );
    throw err;
  }
}

export async function analyzeFullText(article) {
  const text = `${article.title}\n\n${article.full_text}`;
  try {
    const result = await runLinza(text);
    await logEvent(
      "info",
      `Re-analyzed full text: ${article.title.slice(0, 80)} → severity ${result.severity}`,
    );
    return result;
  } catch (err) {
    await logEvent(
      "error",
      `LINZA full-text error for article ${article.id}: ${err.message}`,
    );
    throw err;
  }
}

export async function analyzeSpeech(speech) {
  const label = speech.title || speech.description || speech.id;
  const text = `${label}\n\n${speech.full_text}`;
  try {
    const result = await runLinza(text);
    await logEvent(
      "info",
      `Analyzed speech: ${label.slice(0, 80)} → severity ${result.severity}`,
    );
    return result;
  } catch (err) {
    await logEvent(
      "error",
      `LINZA error for speech ${speech.id}: ${err.message}`,
    );
    throw err;
  }
}
