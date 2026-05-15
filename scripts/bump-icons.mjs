#!/usr/bin/env node
// Bumps icon sizes in a single pass (no cascading).
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve("src");
const DRY = process.argv.includes("--dry");

// Tailwind class map (single pass)
const CLASS_MAP = { 3: 4, 4: 5, 5: 6, 6: 7 };
// Inline numeric map
const NUM_MAP = { 12: 16, 14: 18, 16: 20, 18: 22, 20: 24, 22: 26, 24: 28 };

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
  let cur = orig.replace(/\bw-(\d+) h-(\d+)\b/g, (m, a, b) => {
    if (a !== b) return m;
    const n = Number(a);
    const next = CLASS_MAP[n];
    if (!next) return m;
    count++;
    return `w-${next} h-${next}`;
  });
  cur = cur.replace(/width:\s*(\d+),\s*height:\s*(\d+)\b/g, (m, a, b) => {
    if (a !== b) return m;
    const n = Number(a);
    const next = NUM_MAP[n];
    if (!next) return m;
    count++;
    return `width: ${next}, height: ${next}`;
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
