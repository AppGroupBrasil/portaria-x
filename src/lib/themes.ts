/* ═══════════════════════════════════════════════
   THEME PALETTES — 5 Temas do sistema
   ═══════════════════════════════════════════════ */

export type ThemeId = "dark" | "light" | "steel" | "emerald" | "midnight";

export interface ThemePalette {
  id: ThemeId;
  name: string;
  isDarkBase: boolean;
  swatch: string;           // cor p/ preview no seletor

  // Page
  pageBg: string;
  headerBg: string;
  headerBorder: string;
  headerShadow: string;

  // Buttons / interactive
  btnBg: string;
  btnBorder: string;
  btnGrad: string;           // premium gradient for primary buttons
  btnGradHover: string;      // premium gradient for hover state
  badgeGrad: string;         // premium gradient for badges / pills

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;
  textHeading: string;
  textSemi: string;
  textDim: string;

  // Cards / surfaces
  cardBg: string;
  cardBorder: string;
  surfaceBg: string;

  // Icons
  iconColor: string;
  iconBoxBg: string;
  iconBoxBorder: string;

  // Features
  featureBg: string;
  featureBorder: string;
  featureIconBoxBg: string;
  featureIconBoxBorder: string;

  // Accent / brand
  accent: string;
  accentBright: string;
  accentLight: string;

  // Misc
  divider: string;
}

/* ─── Dark (Padrão) ─── */
export const DARK: ThemePalette = {
  id: "dark",
  name: "Azul Escuro",
  isDarkBase: true,
  swatch: "#003580",
  pageBg: "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)",
  headerBg: "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)",
  headerBorder: "1px solid rgba(255,255,255,0.08)",
  headerShadow: "0 4px 24px rgba(0,0,0,0.3)",
  btnBg: "rgba(255,255,255,0.08)",
  btnBorder: "1px solid rgba(255,255,255,0.1)",
  btnGrad: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
  btnGradHover: "linear-gradient(135deg, #0070e0 0%, #004aad 50%, #002a66 100%)",
  badgeGrad: "linear-gradient(135deg, #004eb5 0%, #003580 50%, #002060 100%)",
  text: "#fff",
  textSecondary: "#d0d9e2",
  textMuted: "#a8b8c8",
  textAccent: "#fff",
  textHeading: "#f1f5f9",
  textSemi: "#e8eef4",
  textDim: "rgba(255,255,255,0.85)",
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "1px solid rgba(255,255,255,0.1)",
  surfaceBg: "rgba(255,255,255,0.04)",
  iconColor: "#fff",
  iconBoxBg: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
  iconBoxBorder: "1px solid rgba(255,255,255,0.12)",
  featureBg: "rgba(255,255,255,0.06)",
  featureBorder: "2px solid rgba(255,255,255,0.12)",
  featureIconBoxBg: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
  featureIconBoxBorder: "1px solid rgba(255,255,255,0.12)",
  accent: "#003580",
  accentBright: "#7dd3fc",
  accentLight: "rgba(0,53,128,0.2)",
  divider: "rgba(255,255,255,0.08)",
};

/* ─── Light (Claro) ─── */
export const LIGHT: ThemePalette = {
  id: "light",
  name: "Claro",
  isDarkBase: false,
  swatch: "#f0f4f8",
  pageBg: "#f0f4f8",
  headerBg: "#ffffff",
  headerBorder: "1px solid #e2e8f0",
  headerShadow: "0 2px 8px rgba(0,0,0,0.06)",
  btnBg: "#f8fafc",
  btnBorder: "1px solid #cbd5e1",
  btnGrad: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
  btnGradHover: "linear-gradient(135deg, #0070e0 0%, #004aad 50%, #002a66 100%)",
  badgeGrad: "linear-gradient(135deg, #004eb5 0%, #003580 50%, #002060 100%)",
  text: "#1e293b",
  textSecondary: "#475569",
  textMuted: "#64748b",
  textAccent: "#003580",
  textHeading: "#0f172a",
  textSemi: "#334155",
  textDim: "#475569",
  cardBg: "#ffffff",
  cardBorder: "1px solid #e2e8f0",
  surfaceBg: "#f8fafc",
  iconColor: "#1e293b",
  iconBoxBg: "linear-gradient(135deg, #e2e8f0, #f1f5f9)",
  iconBoxBorder: "1px solid #cbd5e1",
  featureBg: "#f8fafc",
  featureBorder: "2px solid #cbd5e1",
  featureIconBoxBg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  featureIconBoxBorder: "1px solid #93c5fd",
  accent: "#003580",
  accentBright: "#003580",
  accentLight: "rgba(0,53,128,0.08)",
  divider: "#e2e8f0",
};

/* ─── Steel (Aço Corporativo) ─── */
export const STEEL: ThemePalette = {
  id: "steel",
  name: "Aço Corporativo",
  isDarkBase: true,
  swatch: "#3d5a80",
  pageBg: "linear-gradient(180deg, #1a2332 0%, #243447 40%, #2d4058 100%)",
  headerBg: "linear-gradient(135deg, #151d2a 0%, #1e3045 50%, #263d56 100%)",
  headerBorder: "1px solid rgba(148,163,184,0.12)",
  headerShadow: "0 4px 24px rgba(0,0,0,0.35)",
  btnBg: "rgba(148,163,184,0.1)",
  btnBorder: "1px solid rgba(148,163,184,0.15)",
  btnGrad: "linear-gradient(135deg, #4a90d9 0%, #3d7ac0 50%, #2d5f9a 100%)",
  btnGradHover: "linear-gradient(135deg, #5ba0e8 0%, #4a8ad4 50%, #3a6fb0 100%)",
  badgeGrad: "linear-gradient(135deg, #4a90d9 0%, #3d7ac0 50%, #2d5f9a 100%)",
  text: "#edf2f7",
  textSecondary: "#c8d4de",
  textMuted: "#a0b4c2",
  textAccent: "#edf2f7",
  textHeading: "#f1f5f9",
  textSemi: "#dae4ec",
  textDim: "rgba(200,212,222,0.88)",
  cardBg: "rgba(148,163,184,0.07)",
  cardBorder: "1px solid rgba(148,163,184,0.12)",
  surfaceBg: "rgba(148,163,184,0.04)",
  iconColor: "#e2e8f0",
  iconBoxBg: "linear-gradient(135deg, rgba(148,163,184,0.15), rgba(148,163,184,0.05))",
  iconBoxBorder: "1px solid rgba(148,163,184,0.15)",
  featureBg: "rgba(148,163,184,0.07)",
  featureBorder: "2px solid rgba(148,163,184,0.15)",
  featureIconBoxBg: "linear-gradient(135deg, rgba(74,144,217,0.2), rgba(74,144,217,0.06))",
  featureIconBoxBorder: "1px solid rgba(74,144,217,0.2)",
  accent: "#4a90d9",
  accentBright: "#60a5fa",
  accentLight: "rgba(74,144,217,0.15)",
  divider: "rgba(148,163,184,0.1)",
};

/* ─── Emerald (Esmeralda Executivo) ─── */
export const EMERALD: ThemePalette = {
  id: "emerald",
  name: "Esmeralda Executivo",
  isDarkBase: true,
  swatch: "#10b981",
  pageBg: "linear-gradient(180deg, #0c1f17 0%, #133527 40%, #1a4d36 100%)",
  headerBg: "linear-gradient(135deg, #091a11 0%, #0f2b1d 50%, #17422d 100%)",
  headerBorder: "1px solid rgba(16,185,129,0.15)",
  headerShadow: "0 4px 24px rgba(0,0,0,0.35)",
  btnBg: "rgba(16,185,129,0.1)",
  btnBorder: "1px solid rgba(16,185,129,0.18)",
  btnGrad: "linear-gradient(135deg, #10b981 0%, #0d9668 50%, #065f46 100%)",
  btnGradHover: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #0d9668 100%)",
  badgeGrad: "linear-gradient(135deg, #10b981 0%, #0d9668 50%, #065f46 100%)",
  text: "#f0fdf6",
  textSecondary: "#c8e2d4",
  textMuted: "#a0c4ae",
  textAccent: "#f0fdf6",
  textHeading: "#ecfce8",
  textSemi: "#d2ecde",
  textDim: "rgba(200,226,212,0.88)",
  cardBg: "rgba(16,185,129,0.07)",
  cardBorder: "1px solid rgba(16,185,129,0.14)",
  surfaceBg: "rgba(16,185,129,0.04)",
  iconColor: "#ecfdf5",
  iconBoxBg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))",
  iconBoxBorder: "1px solid rgba(16,185,129,0.18)",
  featureBg: "rgba(16,185,129,0.07)",
  featureBorder: "2px solid rgba(16,185,129,0.18)",
  featureIconBoxBg: "linear-gradient(135deg, rgba(52,211,153,0.22), rgba(52,211,153,0.06))",
  featureIconBoxBorder: "1px solid rgba(52,211,153,0.22)",
  accent: "#10b981",
  accentBright: "#34d399",
  accentLight: "rgba(16,185,129,0.15)",
  divider: "rgba(16,185,129,0.1)",
};

/* ─── Midnight (Meia-Noite Violeta) ─── */
export const MIDNIGHT: ThemePalette = {
  id: "midnight",
  name: "Meia-Noite",
  isDarkBase: true,
  swatch: "#8b5cf6",
  pageBg: "linear-gradient(180deg, #13111c 0%, #1c1730 40%, #261f42 100%)",
  headerBg: "linear-gradient(135deg, #100e19 0%, #19142c 50%, #211a3a 100%)",
  headerBorder: "1px solid rgba(139,92,246,0.14)",
  headerShadow: "0 4px 24px rgba(0,0,0,0.4)",
  btnBg: "rgba(139,92,246,0.1)",
  btnBorder: "1px solid rgba(139,92,246,0.18)",
  btnGrad: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #5b21b6 100%)",
  btnGradHover: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)",
  badgeGrad: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #5b21b6 100%)",
  text: "#f3f0ff",
  textSecondary: "#d8d2ee",
  textMuted: "#ada6cc",
  textAccent: "#f3f0ff",
  textHeading: "#ede6ff",
  textSemi: "#e0d8fd",
  textDim: "rgba(216,210,238,0.88)",
  cardBg: "rgba(139,92,246,0.07)",
  cardBorder: "1px solid rgba(139,92,246,0.14)",
  surfaceBg: "rgba(139,92,246,0.04)",
  iconColor: "#ede9fe",
  iconBoxBg: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))",
  iconBoxBorder: "1px solid rgba(139,92,246,0.18)",
  featureBg: "rgba(139,92,246,0.07)",
  featureBorder: "2px solid rgba(139,92,246,0.18)",
  featureIconBoxBg: "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(167,139,250,0.06))",
  featureIconBoxBorder: "1px solid rgba(167,139,250,0.22)",
  accent: "#8b5cf6",
  accentBright: "#a78bfa",
  accentLight: "rgba(139,92,246,0.15)",
  divider: "rgba(139,92,246,0.1)",
};

/* ─── Mapa de temas ─── */
export const THEME_MAP: Record<ThemeId, ThemePalette> = {
  dark: DARK,
  light: LIGHT,
  steel: STEEL,
  emerald: EMERALD,
  midnight: MIDNIGHT,
};

export const THEME_LIST: ThemePalette[] = [DARK, LIGHT, STEEL, EMERALD, MIDNIGHT];

export const ALL_THEME_IDS: ThemeId[] = ["dark", "light", "steel", "emerald", "midnight"];
