// LINZA output format definition
// Kept as a separate file for easy human reference

export const OUTPUT_FORMAT = {
  severity: '<integer 1-5>',
  severity_label: '<none|mild|moderate|high|critical>',
  patterns: [
    {
      name: '<category_id>',
      level: '<incitement|toxification|rhetorical_manipulation>',
      quote: '<direct quote under 20 words>',
      confidence: '<low|medium|high>',
      explanation: '<one sentence>',
    },
  ],
  summary_md: '<2-3 sentences>',
};

export const SEVERITY_LABELS = {
  1: 'none',
  2: 'mild',
  3: 'moderate',
  4: 'high',
  5: 'critical',
};

export const FORMAT_INSTRUCTION = `Return ONLY valid JSON matching this exact structure, no preamble, no markdown:
${JSON.stringify(OUTPUT_FORMAT, null, 2)}`;
