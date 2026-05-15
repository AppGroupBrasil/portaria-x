#!/usr/bin/env node
// Narrow, safe contrast sweep:
// Replaces form-label and body-text dark colors with CSS variable that
// switches automatically per theme. Only touches very specific patterns.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve("src");
const DRY = process.argv.includes("--dry");

const REPLACEMENTS = [
  // Card backgrounds (white) → theme variable so cards darken in dark themes
  { from: /background:\s*["']#fff["']/g, to: 'background: "var(--color-card, #fff)"' },
  { from: /background:\s*["']#ffffff["']/g, to: 'background: "var(--color-card, #fff)"' },
  // Dark text on cards → card foreground variable (auto switches per theme)
  { from: /color:\s*["']#1e293b["']/g, to: 'color: "var(--card-foreground)"' },
  { from: /color:\s*["']#0f172a["']/g, to: 'color: "var(--card-foreground)"' },
  { from: /color:\s*["']#0c4a6e["']/g, to: 'color: "var(--card-foreground)"' },
  { from: /color:\s*["']#334155["']/g, to: 'color: "var(--card-foreground)"' },
  // Muted body text
  { from: /color:\s*["']#475569["']/g, to: 'color: "var(--muted-foreground)"' },
  { from: /color:\s*["']#64748b["']/g, to: 'color: "var(--muted-foreground)"' },
];

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) files.push(p);
  }
}
walk(ROOT);

let totalChanges = 0;
const perFile = [];

for (const file of files) {
  const orig = readFileSync(file, "utf8");
  let cur = orig;
  let count = 0;
  for (const { from, to } of REPLACEMENTS) {
    cur = cur.replace(from, (m) => { count++; return to; });
  }
  if (count > 0) {
    totalChanges += count;
    perFile.push([file, count]);
    if (!DRY) writeFileSync(file, cur);
  }
}

perFile.sort((a, b) => b[1] - a[1]);
console.log(`${DRY ? "[DRY] " : ""}Total substitutions: ${totalChanges}`);
console.log(`Files touched: ${perFile.length}`);
for (const [f, c] of perFile) console.log(`  ${c.toString().padStart(3)}  ${f}`);
