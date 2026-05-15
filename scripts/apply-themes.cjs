/**
 * apply-themes.cjs — Batch transform all pages to use theme palette (p) from useTheme.
 * Replaces common isDark ternary patterns with p.* palette references.
 * Run: node apply-themes.cjs
 */

const fs = require("fs");
const path = require("path");

const pagesDir = path.join(__dirname, "src", "pages");
const hooksDir = path.join(__dirname, "src", "hooks");
const componentsDir = path.join(__dirname, "src", "components");

// All dirs to scan
const dirs = [pagesDir, componentsDir];

// ─── Pattern replacements ───
// Each entry: [exact old string, replacement]
const PATTERNS = [
  // ── Page background ──
  ['isDark ? "linear-gradient(180deg, #002a66 0%, #003580 40%, #004aad 100%)" : "#f0f4f8"', 'p.pageBg'],

  // ── Header background ──
  ['isDark ? "linear-gradient(135deg, #001d4a 0%, #002a66 50%, #003580 100%)" : "#ffffff"', 'p.headerBg'],

  // ── Header border ──
  ['isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0"', 'p.headerBorder'],

  // ── Header shadow ──
  ['isDark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)"', 'p.headerShadow'],

  // ── Button / icon bg ──
  ['isDark ? "rgba(255,255,255,0.08)" : "#f8fafc"', 'p.btnBg'],

  // ── Button / icon border ──
  ['isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1"', 'p.btnBorder'],

  // ── Text primary ──
  ['isDark ? "#fff" : "#1e293b"', 'p.text'],

  // ── Text heading (e2e8f0 / 1e293b) ──
  ['isDark ? "#e2e8f0" : "#1e293b"', 'p.textHeading'],

  // ── Text secondary (#94a3b8 / #64748b) ──
  ['isDark ? "#94a3b8" : "#64748b"', 'p.textSecondary'],

  // ── Text dim (rgba / #64748b) ──
  ['isDark ? "rgba(255,255,255,0.5)" : "#64748b"', 'p.textDim'],

  // ── Text muted (#64748b / #94a3b8) ──
  ['isDark ? "#64748b" : "#94a3b8"', 'p.textMuted'],

  // ── Text semi-light ──
  ['isDark ? "#cbd5e1" : "#475569"', 'p.textSemi'],

  // ── Text accent (white / brand) ──
  ['isDark ? "#fff" : "#003580"', 'p.textAccent'],

  // ── Card bg ──
  ['isDark ? "rgba(255,255,255,0.06)" : "#fff"', 'p.cardBg'],
  ['isDark ? "rgba(255,255,255,0.06)" : "#ffffff"', 'p.cardBg'],

  // ── Surface bg ──
  ['isDark ? "rgba(255,255,255,0.06)" : "#f8fafc"', 'p.surfaceBg'],
  ['isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"', 'p.surfaceBg'],
  ['isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"', 'p.surfaceBg'],
  ['isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"', 'p.surfaceBg'],

  // ── Card border ──
  ['isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0"', 'p.cardBorder'],
  ['isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0"', 'p.cardBorder'],

  // ── Card border alt / icon box border ──
  ['isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1"', 'p.iconBoxBorder'],

  // ── Feature border ──
  ['isDark ? "2px solid rgba(255,255,255,0.12)" : "2px solid #cbd5e1"', 'p.featureBorder'],

  // ── Icon box bg ──
  ['isDark ? "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)" : "linear-gradient(135deg, #e2e8f0, #f1f5f9)"', 'p.iconBoxBg'],

  // ── Feature icon box bg ──
  ['isDark ? "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)" : "linear-gradient(135deg, #dbeafe, #eff6ff)"', 'p.featureIconBoxBg'],

  // ── Feature icon box border ──
  ['isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #93c5fd"', 'p.featureIconBoxBorder'],

  // ── Feature bg ──
  ['isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.06)"', 'p.featureBg'],

  // ── Divider ──
  ['isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"', 'p.divider'],

  // ── Header border with borderBottom syntax ──
  ['isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(226,232,240,0.8)"', 'p.headerBorder'],

  // ── Assorted text colors used as icon colors ──
  ["isDark ? '#fff' : '#1e293b'", 'p.text'],
  ["isDark ? '#fff' : '#1e40af'", 'p.textAccent'],

  // ── Accent light bg ──
  ['isDark ? "rgba(0,53,128,0.2)" : "rgba(0,53,128,0.08)"', 'p.accentLight'],
];

// ─── Update useTheme destructuring to include `p` ───
function addPaletteDestructuring(content) {
  // Match: const { ... } = useTheme()  or  const { ... } = useTheme();
  const regex = /const\s*\{([^}]+)\}\s*=\s*useTheme\(\)/g;
  return content.replace(regex, (match, props) => {
    const trimmed = props.trim();
    if (trimmed.includes(" p") || trimmed.includes(",p") || trimmed === "p") {
      return match; // already has p
    }
    return `const { ${trimmed}, p } = useTheme()`;
  });
}

// ─── Main ───
let totalFiles = 0;
let totalChanges = 0;
const report = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, "utf-8");
    const original = content;

    // Skip files that don't use useTheme
    if (!content.includes("useTheme")) continue;

    let fileChanges = 0;

    // Step 1: Add `p` to useTheme destructuring
    const before = content;
    content = addPaletteDestructuring(content);
    if (content !== before) fileChanges++;

    // Step 2: Apply pattern replacements
    for (const [oldStr, newStr] of PATTERNS) {
      while (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        fileChanges++;
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      totalFiles++;
      totalChanges += fileChanges;
      report.push(`✓ ${file} (${fileChanges} changes)`);
    }
  }
}

console.log(`\n═══ Theme Palette Migration Complete ═══`);
console.log(`Files updated: ${totalFiles}`);
console.log(`Total replacements: ${totalChanges}\n`);
report.forEach((r) => console.log("  " + r));
console.log("");
