#!/usr/bin/env node
// Single-pass fontSize bump (no cascade).
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve("src");
const DRY = process.argv.includes("--dry");

const FONT_MAP = { 9: 11, 10: 12, 11: 12, 12: 13, 13: 14, 14: 15, 15: 16 };

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".tsx")) files.push(p);
  }
}
walk(ROOT);

let total = 0;
const perFile = [];
for (const file of files) {
  const orig = readFileSync(file, "utf8");
  let count = 0;
  const cur = orig.replace(/fontSize:\s*["'](\d+)px["']/g, (m, n) => {
    const next = FONT_MAP[Number(n)];
    if (!next) return m;
    count++;
    return `fontSize: "${next}px"`;
  });
  if (count > 0) {
    total += count;
    perFile.push([file, count]);
    if (!DRY) writeFileSync(file, cur);
  }
}
perFile.sort((a, b) => b[1] - a[1]);
console.log(`${DRY ? "[DRY] " : ""}Total: ${total} in ${perFile.length} files`);
for (const [f, c] of perFile.slice(0, 12)) console.log(`  ${c.toString().padStart(3)}  ${f}`);
