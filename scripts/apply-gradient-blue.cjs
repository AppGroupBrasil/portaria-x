/**
 * Batch script: Replace flat #003580 backgrounds with premium gradient blue
 * Targets only background/bg properties — leaves text color and borders untouched.
 */
const fs = require("fs");
const path = require("path");

const GRAD = "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)";
const GRAD_HOVER = "linear-gradient(135deg, #0070e0 0%, #004aad 50%, #002a66 100%)";
const GRAD_BADGE = "linear-gradient(135deg, #004eb5 0%, #003580 50%, #002060 100%)";
const GRAD_SOFT = "linear-gradient(135deg, #0062d1 0%, #003580 100%)";

const srcDir = path.join(__dirname, "src");
let totalReplacements = 0;
let filesChanged = 0;

function getAllTsx(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllTsx(full));
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) results.push(full);
  }
  return results;
}

const files = getAllTsx(srcDir);

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const original = src;
  let count = 0;

  // ─── Pattern 1: background: "#003580" → gradient ───
  // Matches: background: "#003580"  or  background: '#003580'
  src = src.replace(/background:\s*["']#003580["']/g, (m) => {
    count++;
    return `background: "${GRAD}"`;
  });

  // ─── Pattern 2: backgroundColor: "#003580" → gradient ───
  src = src.replace(/backgroundColor:\s*["']#003580["']/g, (m) => {
    count++;
    return `background: "${GRAD}"`;
  });

  // ─── Pattern 3: background: isDark ? "...#003580..." : "..." ───
  // Only replace the #003580 in dark gradient strings that already have linear-gradient
  // e.g. background: isDark ? "linear-gradient(180deg, #002a66 0%, #003580 40%, #004aad 100%)" : "#f0f4f8"
  // These get upgraded to richer premium gradients
  src = src.replace(
    /background:\s*isDark\s*\?\s*["']linear-gradient\(180deg,\s*#002a66\s+0%,\s*#003580\s+40%,\s*#004aad\s+100%\)["']/g,
    (m) => {
      count++;
      return `background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)"`;
    }
  );

  src = src.replace(
    /background:\s*isDark\s*\?\s*["']linear-gradient\(135deg,\s*#001d4a\s+0%,\s*#002a66\s+50%,\s*#003580\s+100%\)["']/g,
    (m) => {
      count++;
      return `background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)"`;
    }
  );

  // ─── Pattern 4: backgroundColor: isDark ? "#003580" : "#ffffff" ───
  src = src.replace(
    /backgroundColor:\s*isDark\s*\?\s*["']#003580["']\s*:\s*["']#ffffff["']/g,
    (m) => {
      count++;
      return `background: isDark ? "${GRAD}" : "#ffffff"`;
    }
  );

  // ─── Pattern 5: background: isDark ? "#003580" : "#ffffff" ───
  src = src.replace(
    /background:\s*isDark\s*\?\s*["']#003580["']\s*:\s*["']#ffffff["']/g,
    (m) => {
      count++;
      return `background: isDark ? "${GRAD}" : "#ffffff"`;
    }
  );

  // ─── Pattern 6: style={{ background: "linear-gradient(135deg, #003580, #002060)" }} ───
  src = src.replace(
    /["']linear-gradient\(135deg,\s*#003580,\s*#002060\)["']/g,
    (m) => {
      count++;
      return `"${GRAD}"`;
    }
  );

  // ─── Pattern 7: style={{ background: "linear-gradient(135deg, #003580, #004eb5)" }} ───
  src = src.replace(
    /["']linear-gradient\(135deg,\s*#003580,\s*#004eb5\)["']/g,
    (m) => {
      count++;
      return `"${GRAD}"`;
    }
  );

  // ─── Pattern 8: background: "linear-gradient(135deg, #003580 0%, #002060 100%)" ───
  src = src.replace(
    /["']linear-gradient\(135deg,\s*#003580\s+0%,\s*#002060\s+100%\)["']/g,
    (m) => {
      count++;
      return `"${GRAD}"`;
    }
  );

  // ─── Pattern 9: background: isDark ? "linear-gradient(135deg, #003580 0%, #002060 100%)" ───
  src = src.replace(
    /isDark\s*\?\s*["']linear-gradient\(135deg,\s*#003580\s+0%,\s*#002060\s+100%\)["']/g,
    (m) => {
      count++;
      return `isDark ? "${GRAD}"`;
    }
  );

  // ─── Pattern 10: Login page gradient ───
  src = src.replace(
    /["']linear-gradient\(180deg,\s*#001a3d\s+0%,\s*#002a66\s+40%,\s*#003580\s+100%\)["']/g,
    (m) => {
      count++;
      return `"linear-gradient(180deg, #001028 0%, #001d4a 25%, #003580 55%, #004aad 100%)"`;
    }
  );

  // ─── Pattern 11: saved ? "#003580" (button bg) → gradient ───
  src = src.replace(
    /saved\s*\?\s*["']#10b981["']\s*:\s*["']#003580["']/g,
    (m) => {
      count++;
      return `saved ? "#10b981" : "${GRAD_SOFT}"`;
    }
  );

  // ─── Pattern 12: showForm ? "#ef4444" : "#003580" ───
  src = src.replace(
    /showForm\s*\?\s*["']#ef4444["']\s*:\s*["']#003580["']/g,
    (m) => {
      count++;
      return `showForm ? "#ef4444" : "${GRAD_SOFT}"`;
    }
  );

  // ─── Pattern 13: saving ? "#94a3b8" : "#003580" ───
  src = src.replace(
    /saving\s*\?\s*["']#94a3b8["']\s*:\s*["']#003580["']/g,
    (m) => {
      count++;
      return `saving ? "#94a3b8" : "${GRAD_SOFT}"`;
    }
  );

  // ─── Pattern 14: saved ? "bg-emerald-500" : "bg-[#003580]..." ───
  src = src.replace(
    /saved\s*\?\s*["']bg-emerald-500["']\s*:\s*["']bg-\[#003580\](?:\s*hover:bg-\[#002a66\])?["']/g,
    (m) => {
      count++;
      return `saved ? "bg-emerald-500" : "btn-grad-blue"`;
    }
  );

  // ─── Pattern 15: "bg-[#003580] text-white" in className concatenation ───
  // Replace standalone bg-[#003580] usages in conditional className strings
  // These are already handled by the CSS override we added, so no need to change

  // ─── Pattern 16: background: saved ? "linear-gradient(135deg, #10b981, #059669)" : "#003580" ───
  src = src.replace(
    /saved\s*\?\s*["']linear-gradient\(135deg,\s*#10b981,\s*#059669\)["']\s*:\s*["']#003580["']/g,
    (m) => {
      count++;
      return `saved ? "linear-gradient(135deg, #10b981, #059669)" : "${GRAD}"`;
    }
  );

  // ─── Pattern 17: background: "#003580" but only as a style value ───
  // Catch remaining flat background instances like style={{ background: "#003580" }}
  // Not caught above because they may have quotes like style={{ background: "#003580", ...
  // Already handled by Pattern 1

  if (count > 0) {
    fs.writeFileSync(file, src, "utf8");
    filesChanged++;
    totalReplacements += count;
    console.log(`  ✅ ${path.relative(__dirname, file)} — ${count} replacement(s)`);
  }
}

console.log(`\n🎨 Done! ${filesChanged} files changed, ${totalReplacements} total gradient replacements.`);
