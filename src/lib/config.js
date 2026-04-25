import "dotenv/config";

console.log(
  `App is in local mode:${process.env.LOCAL_MODEL}:${!!process.env.ANTHROPIC_API_KEY?.startsWith("sk-")}`,
);

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 1000,
  },

  cron: {
    // 07:00 and 17:00 UTC daily
    schedules: [],
  },

  analysis: {
    // How far back to look for unprocessed articles
    // 12h matches cron frequency (2x per day)
    lookbackHours: 12,

    // LINZA severity thresholds (1–5 scale)
    // 1 = no manipulation
    // 2 = mild rhetorical framing
    // 3 = clear manipulation patterns
    // 4 = strong incitement-level patterns
    // 5 = systematic, textbook dangerous speech
    threatThreshold: 3, // Угрозы tab: severity >= 3
    newsThreshold: 2, // Новости tab: severity >= 2
    scrapeThreshold: 3, // full text scraping triggered when excerpt severity >= 3
  },

  scraping: {
    // Universal selectors, per-source selectors go in data/sites.json
    selectors: ["article", "main", "p"],
    minTextLength: 200,
  },

  // Keyword filter — articles matching these are skipped before LINZA
  keywordFilter: [
    "sport",
    "football",
    "soccer",
    "basketball",
    "tennis",
    "golf",
    "weather",
    "forecast",
    "celebrity",
    "entertainment",
    "box office",
    "recipe",
    "fashion",
    "horoscope",
  ],

  // Manual pipeline trigger password (UI → Лог tab)
  manualRunPassword: "k1iak$A",

  polling: {
    // Frontend polling interval in milliseconds
    intervalMs: 30000,
  },

  db: {
    path: process.env.DB_PATH || "data/aigregator.duckdb",
  },
};
