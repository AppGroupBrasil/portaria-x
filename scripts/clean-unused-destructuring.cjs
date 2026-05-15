const fs = require('fs');
const path = require('path');

const tscOut = fs.readFileSync(path.resolve(__dirname, '..', 'tsc-errs.tmp'), 'utf8');

const errors = [];
for (const line of tscOut.split(/\r?\n/)) {
  const m = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\.$/);
  if (m) errors.push({ file: m[1], line: +m[2], col: +m[3], name: m[4] });
}

const SAFE_DESTRUCTURING_NAMES = new Set(['user', 'isDark', 'p', 'devicesLoading']);
const SAFE_IMPORT_NAMES = new Set(['LucideIcon', 'CircleGauge', 'TStep', 'StepIcon']);

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
  if (!fs.existsSync(full)) continue;
  let src = fs.readFileSync(full, 'utf8');
  const lines = src.split('\n');
  let changed = false;

  for (const e of errs) {
    const idx = e.line - 1;
    const ln = lines[idx];
    if (!ln) continue;

    // Pattern 1: Named import "import X from 'mod'" or "import { ..., X, ... } from"
    if (SAFE_IMPORT_NAMES.has(e.name)) {
      // Default import: import CircleGauge from "..." → remove line
      const defaultImp = ln.match(/^\s*import\s+(\w+)\s+from\s+["'][^"']+["'];?\s*$/);
      if (defaultImp && defaultImp[1] === e.name) {
        lines[idx] = '';
        totalRemoved++;
        changed = true;
        continue;
      }
      // Named: import { X, Y } from "..." — strip X
      const namedImp = ln.match(/^(\s*import\s*(?:type\s+)?\{)([^}]+)(\}\s*from\s*["'][^"']+["'];?\s*)$/);
      if (namedImp) {
        const items = namedImp[2].split(',').map(s => s.trim()).filter(Boolean);
        const remaining = items.filter(it => it.replace(/^type\s+/, '').replace(/\s+as\s+\w+$/, '').trim() !== e.name);
        if (remaining.length === 0) lines[idx] = '';
        else if (remaining.length !== items.length) lines[idx] = namedImp[1] + ' ' + remaining.join(', ') + ' ' + namedImp[3];
        else continue;
        totalRemoved++;
        changed = true;
        continue;
      }
    }

    // Pattern 2: Destructuring: const { a, NAME, b } = ...
    if (SAFE_DESTRUCTURING_NAMES.has(e.name)) {
      const destruct = ln.match(/^(\s*const\s*\{)([^}]+)(\}\s*=\s*[^;]+;\s*)$/);
      if (destruct) {
        const items = destruct[2].split(',').map(s => s.trim()).filter(Boolean);
        const remaining = items.filter(it => {
          const bare = it.replace(/:\s*\w+$/, '').trim();
          return bare !== e.name;
        });
        if (remaining.length === 0) lines[idx] = '';
        else if (remaining.length !== items.length) lines[idx] = destruct[1] + ' ' + remaining.join(', ') + ' ' + destruct[3];
        else continue;
        totalRemoved++;
        changed = true;
        continue;
      }
    }
  }

  if (changed) {
    const newSrc = lines.filter((l, i) => !(l === '' && lines[i - 1] === '')).join('\n');
    fs.writeFileSync(full, newSrc);
    filesTouched++;
  }
}
console.log('files touched:', filesTouched, 'cleaned:', totalRemoved);
