type ModelPricing = {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number;
  cacheWritePerMtok: number;
};

const FAMILY_PRICING: Record<string, ModelPricing> = {
  opus: {
    inputPerMtok: 15,
    outputPerMtok: 75,
    cacheReadPerMtok: 1.5,
    cacheWritePerMtok: 18.75,
  },
  sonnet: {
    inputPerMtok: 3,
    outputPerMtok: 15,
    cacheReadPerMtok: 0.3,
    cacheWritePerMtok: 3.75,
  },
  haiku: {
    inputPerMtok: 1,
    outputPerMtok: 5,
    cacheReadPerMtok: 0.1,
    cacheWritePerMtok: 1.25,
  },
};

const FALLBACK = FAMILY_PRICING.sonnet;

export function priceFor(model: string): ModelPricing {
  const m = model.toLowerCase();
  if (m.includes("opus")) return FAMILY_PRICING.opus;
  if (m.includes("sonnet")) return FAMILY_PRICING.sonnet;
  if (m.includes("haiku")) return FAMILY_PRICING.haiku;
  return FALLBACK;
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export function costCents(model: string, usage: TokenUsage): number {
  const p = priceFor(model);
  const dollars =
    (usage.inputTokens * p.inputPerMtok) / 1_000_000 +
    (usage.outputTokens * p.outputPerMtok) / 1_000_000 +
    (usage.cacheReadTokens * p.cacheReadPerMtok) / 1_000_000 +
    (usage.cacheWriteTokens * p.cacheWritePerMtok) / 1_000_000;
  return Math.round(dollars * 100 * 100) / 100;
}
