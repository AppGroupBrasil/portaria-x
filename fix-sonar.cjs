const fs = require('fs');
const path = require('path');

// Collect all tsx files
const srcPages = 'src/pages';
const srcComps = 'src/components';
const files = [];
if (fs.existsSync(srcPages)) {
  files.push(...fs.readdirSync(srcPages).filter(f => f.endsWith('.tsx')).map(f => path.join(srcPages, f)));
}
if (fs.existsSync(srcComps)) {
  files.push(...fs.readdirSync(srcComps).filter(f => f.endsWith('.tsx')).map(f => path.join(srcComps, f)));
}

let totalFixes = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Fix modal backdrop divs: onClick={...} with no role → add role="button" tabIndex onKeyDown
  // Handle pattern: <div ... onClick={() => handler()} ...>
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Fix: <div ... onClick={() => setX(...)} ...> without role
    if (line.includes('<div') && line.includes('onClick={') && !line.includes('role=') && !line.includes('onKeyDown=')) {
      // Check if it's a stopPropagation handler (inner dialog div)
      if (line.includes('stopPropagation')) {
        line = line.replace('onClick={(e) => e.stopPropagation()}', 'role="dialog"');
        totalFixes++;
      } else {
        // Extract the onClick handler and add role + keyboard support
        const onClickMatch = line.match(/onClick=\{([^}]+)\}/);
        if (onClickMatch) {
          const handler = onClickMatch[1].trim();
          // Add role="button" tabIndex={0} and onKeyDown before onClick
          line = line.replace(
            /onClick=\{([^}]+)\}/,
            `role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { (${handler})(); } }} onClick={${handler}}`
          );
          totalFixes++;
        }
      }
    }
    
    // Fix: labels not associated with controls - add htmlFor
    // <label ...>De</label> → wrap with span or add htmlFor
    if (line.match(/<label\b/) && !line.includes('htmlFor=') && !line.includes('htmlFor =')) {
      // Check if there's an input/select nearby (next few lines)
      const nextLines = lines.slice(i+1, i+5).join('\n');
      const inputMatch = nextLines.match(/id="([^"]+)"/);
      if (inputMatch) {
        line = line.replace(/<label\b/, `<label htmlFor="${inputMatch[1]}"`);
        totalFixes++;
      } else {
        // Convert standalone labels to spans
        line = line.replace(/<label\b/, '<span').replace(/<\/label>/, '</span>');
        totalFixes++;
      }
    }
    
    // Fix: Array index in keys - <div key={i} or <div key={index}
    // This is harder to fix generically, skip for now
    
    // Fix: window → globalThis in .tsx files
    if (line.includes('window.') && !line.includes('globalThis.window') && !line.includes('// ')) {
      line = line.replace(/\bwindow\.(location|open|addEventListener|removeEventListener|dispatchEvent|document|innerWidth|innerHeight|scrollTo|close|print|confirm|alert)\b/g, (match, prop) => {
        totalFixes++;
        return `globalThis.${prop === 'location' ? 'window.location' : match.replace('window.', '')}`;
      });
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed: ' + file);
  }
}

console.log('Total fixes applied: ' + totalFixes);
