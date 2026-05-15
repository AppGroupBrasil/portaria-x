const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = fs.readFileSync(path.resolve(__dirname, '..', 'tsc-errs.tmp'), 'utf8');

const errors = [];
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\.$/);
  if (m) errors.push({ file: m[1], line: +m[2], col: +m[3], name: m[4] });
}
console.log('total TS6133:', errors.length);

const byFile = new Map();
for (const e of errors) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

let totalRemoved = 0;
let filesTouched = 0;
const root = path.resolve(__dirname, '..');

for (const [file, errs] of byFile) {
  const full = path.resolve(root, file);
  if (!fs.existsSync(full)) { console.log('miss:', full); continue; }
  let src = fs.readFileSync(full, 'utf8');
  const lines = src.split('\n');
  let changed = false;

  const errsByLine = new Map();
  for (const e of errs) {
    if (!errsByLine.has(e.line)) errsByLine.set(e.line, []);
    errsByLine.get(e.line).push(e.name);
  }

  for (const [lineNum, names] of errsByLine) {
    const idx = lineNum - 1;
    const ln = lines[idx];
    if (!ln) continue;
    const im = ln.match(/^(\s*import\s*(?:type\s+)?\{)([^}]+)(\}\s*from\s*["'].+?["'];?\s*)$/);
    if (im) {
      const items = im[2].split(',').map(s => s.trim()).filter(Boolean);
      const remaining = items.filter(it => {
        const bare = it.replace(/^type\s+/, '').replace(/\s+as\s+\w+$/, '').trim();
        return !names.includes(bare);
      });
      if (remaining.length === 0) {
        lines[idx] = '';
      } else if (remaining.length !== items.length) {
        lines[idx] = im[1] + ' ' + remaining.join(', ') + ' ' + im[3];
      } else continue;
      totalRemoved += items.length - remaining.length;
      changed = true;
      continue;
    }
    const single = ln.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*,?\s*)$/);
    if (single && names.includes(single[2])) {
      let j = idx - 1;
      while (j >= 0 && !/import\s*(?:type\s+)?\{/.test(lines[j]) && !/from\s*["']/.test(lines[j])) j--;
      if (j >= 0 && /import\s*(?:type\s+)?\{/.test(lines[j])) {
        lines[idx] = '';
        totalRemoved++;
        changed = true;
      }
    }
  }
  if (changed) {
    const newSrc = lines.filter((l, i) => !(l === '' && lines[i-1] === '')).join('\n');
    fs.writeFileSync(full, newSrc);
    filesTouched++;
  }
}
console.log('files touched:', filesTouched, 'imports removed:', totalRemoved);
