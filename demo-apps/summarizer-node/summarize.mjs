#!/usr/bin/env node
/**
 * Batch text summarizer that calls Claude through the Keymaster proxy.
 *
 * Usage:
 *   export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
 *   export ANTHROPIC_API_KEY=prx-...
 *   node summarize.mjs path/to/file.txt
 *   cat article.md | node summarize.mjs -
 *   node summarize.mjs --bullets path/to/file.txt
 *
 * Flags:
 *   --bullets        Output as 5 bullet points instead of a paragraph.
 *   --words <N>      Target word count (default 120).
 *   --model <id>     Override model (default claude-haiku-4-5).
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { argv, exit, stdin, stderr } from "node:process";

function parseArgs(args) {
  const out = { bullets: false, words: 120, model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5", input: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--bullets") out.bullets = true;
    else if (a === "--words") out.words = parseInt(args[++i], 10) || 120;
    else if (a === "--model") out.model = args[++i];
    else if (a === "--help" || a === "-h") {
      console.log("usage: node summarize.mjs [--bullets] [--words N] [--model id] <file|->");
      exit(0);
    } else if (!out.input) out.input = a;
    else {
      stderr.write(`unexpected arg: ${a}\n`);
      exit(2);
    }
  }
  return out;
}

async function readInput(path) {
  if (path === "-" || path === null) {
    const chunks = [];
    for await (const c of stdin) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  }
  return await readFile(path, "utf8");
}

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!process.env.ANTHROPIC_API_KEY) {
    stderr.write("error: ANTHROPIC_API_KEY is not set\n");
    exit(2);
  }
  if (args.input === null && stdin.isTTY) {
    stderr.write("usage: node summarize.mjs <file|->  (or pipe text on stdin)\n");
    exit(2);
  }

  const text = (await readInput(args.input)).trim();
  if (!text) {
    stderr.write("error: input is empty\n");
    exit(1);
  }

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from env

  const instruction = args.bullets
    ? `Summarize the text below as exactly 5 bullet points. Each bullet is one short sentence. No preamble.`
    : `Summarize the text below in roughly ${args.words} words. One paragraph. No preamble.`;

  const resp = await client.messages.create({
    model: args.model,
    max_tokens: Math.max(400, args.words * 4),
    system: "You write tight, faithful summaries. Never invent details not in the source.",
    messages: [
      {
        role: "user",
        content: `${instruction}\n\n---\n${text}\n---`,
      },
    ],
  });

  const out = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  process.stdout.write(out.trimEnd() + "\n");
}

main().catch((err) => {
  stderr.write(`error: ${err?.message ?? err}\n`);
  exit(1);
});
