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

let totalReplaced = 0;
let filesTouched = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  const orig = src;

  // (g?)?lobalThis\.?confirm or alert — capture the call
  // 1) if (!confirm("...")) return;  /  if (!globalThis.confirm("...")) return;
  src = src.replace(
    /\b(?:globalThis\.|window\.)?confirm\(/g,
    'await dialogConfirm('
  );

  // 2) Standalone alert calls
  //    "alert(...)" → "void dialogAlert(...)" — but only if not part of e.g. "calert"
  //    Use word boundary on left.
  src = src.replace(
    /\b(?:globalThis\.|window\.)?alert\(/g,
    'void dialogAlert('
  );

  // Handle "return void dialogAlert(...)" patterns left as-is — caller code may have used "return alert(...)" pattern
  // Convert "return void dialogAlert" into "{ void dialogAlert(...); return; }" — but that needs balanced parens detection.
  // We'll fix manually if needed.

  if (src === orig) continue;

  // Add imports if not present
  if (/\bdialogConfirm\b|\bdialogAlert\b/.test(src) && !/from\s+["']@\/lib\/dialog["']/.test(src)) {
    const usedConfirm = /\bdialogConfirm\b/.test(src);
    const usedAlert = /\bdialogAlert\b/.test(src);
    const names = [usedConfirm && 'dialogConfirm', usedAlert && 'dialogAlert'].filter(Boolean).join(', ');
    const imp = `import { ${names} } from "@/lib/dialog";`;

    // Insert after last import line at the top of file
    const lines = src.split('\n');
    let lastImport = -1;
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      if (/^\s*import\s+/.test(lines[i])) lastImport = i;
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, imp);
    } else {
      lines.unshift(imp);
    }
    src = lines.join('\n');
  }

  const matches = (src.match(/await dialogConfirm|void dialogAlert/g) || []).length
                - (orig.match(/await dialogConfirm|void dialogAlert/g) || []).length;

  fs.writeFileSync(f, src);
  filesTouched++;
  totalReplaced += matches;
}
console.log('files touched:', filesTouched, 'calls replaced:', totalReplaced);
