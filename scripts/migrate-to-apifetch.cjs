const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
  return files;
}

const root = path.resolve(__dirname, '..', 'src');
const files = walk(root);

let filesTouched = 0;
let callsReplaced = 0;

for (const f of files) {
  // Skip api.ts (it's the wrapper itself)
  if (f.endsWith('api.ts')) continue;

  let src = fs.readFileSync(f, 'utf8');
  const orig = src;

  // Replace fetch( calls — but ONLY when the first arg looks like a relative path,
  // /api/..., or a variable. Skip when first arg starts with "http" (external).
  // Heuristic: look at the call site and inspect first arg.
  // Easier: replace `await fetch(` and `const ... = fetch(` everywhere except where
  // the first arg literal is "http..." or "https..." or "`http..."

  // Use regex with lookahead: NOT followed by https?://
  src = src.replace(
    /\bfetch\((?!\s*[`"'])/g,
    'apiFetch('
  );
  // For string-literal first args:
  src = src.replace(
    /\bfetch\(\s*(["'`])(?!https?:\/\/)([^)]*?)/g,
    (m, q, rest) => `apiFetch(${q}${rest}`
  );

  if (src === orig) continue;

  // Add import if missing
  if (!/from\s+["']@\/lib\/api["']/.test(src)) {
    const lines = src.split('\n');
    let lastImport = -1;
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      if (/^\s*import\s+/.test(lines[i])) lastImport = i;
    }
    const imp = 'import { apiFetch } from "@/lib/api";';
    if (lastImport >= 0) lines.splice(lastImport + 1, 0, imp);
    else lines.unshift(imp);
    src = lines.join('\n');
  } else {
    // Existing import — check if it has apiFetch named import
    const importLine = src.match(/import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/api["']/);
    if (importLine && !/\bapiFetch\b/.test(importLine[1])) {
      src = src.replace(
        /import\s*\{([^}]*)\}\s*from\s*(["']@\/lib\/api["'])/,
        (m, inner, q) => `import { apiFetch,${inner}} from ${q}`
      );
    }
  }

  // Count replacements
  const diff = (src.match(/\bapiFetch\(/g) || []).length - (orig.match(/\bapiFetch\(/g) || []).length;
  callsReplaced += diff;
  fs.writeFileSync(f, src);
  filesTouched++;
}

console.log('files touched:', filesTouched, 'calls replaced:', callsReplaced);
