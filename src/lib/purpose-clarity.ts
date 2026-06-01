import type { PurposeClarity } from "./db/schema";

const PLACEHOLDER_WORDS = [
  "default",
  "untitled",
  "new key",
  "api key",
  "test",
  "temp",
  "tmp",
  "scratch",
  "key",
  "anthropic",
];

const VAGUE_NAME_PATTERNS = [
  /^[a-z]+[-_ ]?\d+([-_ ]?\d+)+$/i,
  /^key[-_ ]?\d+$/i,
  /^api[-_ ]?key[-_ ]?\d*$/i,
  /^claude[-_ ]?\d*$/i,
];

export function analyzeNameClarity(name: string): {
  clarity: PurposeClarity;
  reason: string;
} {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { clarity: "unclear", reason: "Key has no name set." };
  }

  if (trimmed.length < 5) {
    return {
      clarity: "unclear",
      reason: `“${trimmed}” is too short to describe a purpose.`,
    };
  }

  for (const pat of VAGUE_NAME_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        clarity: "unclear",
        reason: `“${trimmed}” looks like a placeholder rather than a purpose.`,
      };
    }
  }

  const tokens = trimmed
    .toLowerCase()
    .split(/[\s_\-\/.]+/)
    .filter(Boolean);

  const meaningful = tokens.filter(
    (t) =>
      !/^\d+$/.test(t) && !PLACEHOLDER_WORDS.includes(t) && t.length > 2
  );

  if (meaningful.length === 0) {
    return {
      clarity: "unclear",
      reason: `No meaningful words in “${trimmed}”. Use a name that describes what the key is for.`,
    };
  }

  if (meaningful.length === 1 && meaningful[0].length < 6) {
    return {
      clarity: "unclear",
      reason: `“${trimmed}” is a single short word — add a verb or context (e.g. “Classifies support tickets”).`,
    };
  }

  return {
    clarity: "clear",
    reason: "Name describes a specific purpose.",
  };
}
