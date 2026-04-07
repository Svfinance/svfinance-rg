export const THEMES = {

  // ══════════════════════
  // 🔵 AZUL / ROXO (padrão)
  // ══════════════════════
  blue: {
    id: "blue",
    name: "Azul & Roxo",
    emoji: "🔵",
    description: "Tema padrão do sistema",
    isGlassTheme: false,

    bgPrimary:   "#020617",
    bgSecondary: "#0f172a",
    bgCard:      "rgba(255,255,255,0.03)",
    bgCardHover: "rgba(255,255,255,0.06)",
    bgInput:     "rgba(255,255,255,0.05)",
    bgModal:     "#0f172a",

    border:       "rgba(255,255,255,0.07)",
    borderCard:   "rgba(255,255,255,0.08)",
    borderInput:  "rgba(255,255,255,0.1)",
    borderActive: "rgba(99,102,241,0.6)",

    primary:       "#3b82f6",
    primaryDark:   "#2563eb",
    primaryGrad:   "linear-gradient(135deg, #3b82f6, #2563eb)",
    accent:        "#6366f1",
    accentGrad:    "linear-gradient(135deg, #4f46e5, #6366f1)",

    textPrimary:   "#ffffff",
    textSecondary: "#94a3b8",
    textMuted:     "#64748b",
    textActive:    "#60a5fa",

    income:  "#22c55e",
    expense: "#ef4444",
    warning: "#f59e0b",
    purple:  "#a855f7",

    sidebarBg:      "rgba(255,255,255,0.04)",
    sidebarActive:  "rgba(59,130,246,0.15)",
    sidebarBorder:  "rgba(59,130,246,0.3)",
    sidebarShadow:  "rgba(59,130,246,0.15)",

    cardBorderTop:   "#3b82f6",
    cardShadow:      "rgba(0,0,0,0.5)",
    cardBackdrop:    "none",
    sidebarBackdrop: "none",

    mapOpacity: "0.07",
    isLight: false,

    chartColors: ["#3b82f6","#6366f1","#22c55e","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6"],
  },

  // ══════════════════════════════════════════════════
  // 🪟 GLASS — Ultra Glassmorphism fundo gelo
  // ══════════════════════════════════════════════════
  glass: {
    id: "glass",
    name: "Glass & Gelo",
    emoji: "🪟",
    description: "Ultra glassmorphism — fundo gelo",
    isGlassTheme: true,
    bgImageAsset: "fundoglassegelo.jpg",   // ← arquivo em src/assets/
    bgImageFallback: "#c9d8e8",
    bgOverlay: "rgba(200,215,235,0.25)",

    bgPrimary:   "transparent",
    bgSecondary: "rgba(255,255,255,0.08)",
    bgCard:      "rgba(255,255,255,0.12)",
    bgCardHover: "rgba(255,255,255,0.22)",
    bgInput:     "rgba(255,255,255,0.18)",
    bgModal:     "rgba(255,255,255,0.55)",

    border:       "rgba(255,255,255,0.3)",
    borderCard:   "rgba(255,255,255,0.35)",
    borderInput:  "rgba(255,255,255,0.4)",
    borderActive: "rgba(30,80,180,0.4)",

    primary:       "#1d4ed8",
    primaryDark:   "#1e40af",
    primaryGrad:   "linear-gradient(135deg, rgba(29,78,216,0.7), rgba(99,102,241,0.7))",
    accent:        "#4f46e5",
    accentGrad:    "linear-gradient(135deg, rgba(79,70,229,0.65), rgba(99,102,241,0.65))",

    textPrimary:   "#0a0f1a",
    textSecondary: "#1e293b",
    textMuted:     "#334155",
    textActive:    "#1d4ed8",

    income:  "#15803d",
    expense: "#b91c1c",
    warning: "#b45309",
    purple:  "#6d28d9",

    sidebarBg:      "rgba(255,255,255,0.15)",
    sidebarActive:  "rgba(29,78,216,0.12)",
    sidebarBorder:  "rgba(29,78,216,0.25)",
    sidebarShadow:  "rgba(29,78,216,0.08)",

    cardBorderTop:   "rgba(255,255,255,0.6)",
    cardShadow:      "rgba(0,0,0,0.06)",
    cardBackdrop:    "blur(18px) saturate(180%)",
    sidebarBackdrop: "blur(24px) saturate(160%)",

    mapOpacity: "0",
    isLight: true,

    chartColors: ["#1d4ed8","#4f46e5","#15803d","#b45309","#b91c1c","#6d28d9","#be185d","#0e7490"],
  },

  // ══════════════════════════════════════
  // 🌌 AURORA — Dark Glass Iridescente
  // ══════════════════════════════════════
  aurora: {
    id: "aurora",
    name: "Aurora Glass",
    emoji: "🌌",
    description: "Dark glass com brilho iridescente",
    isGlassTheme: false,

    bgPrimary:   "#070d1a",
    bgSecondary: "#0c1528",
    bgCard:      "rgba(255,255,255,0.04)",
    bgCardHover: "rgba(255,255,255,0.08)",
    bgInput:     "rgba(255,255,255,0.06)",
    bgModal:     "rgba(10,18,38,0.95)",

    border:       "rgba(255,255,255,0.06)",
    borderCard:   "rgba(255,255,255,0.09)",
    borderInput:  "rgba(255,255,255,0.12)",
    borderActive: "rgba(129,196,255,0.5)",

    primary:       "#38bdf8",
    primaryDark:   "#0ea5e9",
    primaryGrad:   "linear-gradient(135deg, #38bdf8, #818cf8)",
    accent:        "#818cf8",
    accentGrad:    "linear-gradient(135deg, #0ea5e9, #6366f1, #a78bfa)",

    textPrimary:   "#e8f4ff",
    textSecondary: "#94b8d4",
    textMuted:     "#526d88",
    textActive:    "#7dd3fc",

    income:  "#34d399",
    expense: "#f87171",
    warning: "#fbbf24",
    purple:  "#c084fc",

    sidebarBg:      "rgba(255,255,255,0.03)",
    sidebarActive:  "rgba(56,189,248,0.12)",
    sidebarBorder:  "rgba(56,189,248,0.25)",
    sidebarShadow:  "rgba(56,189,248,0.1)",

    cardBorderTop:   "#38bdf8",
    cardShadow:      "rgba(0,0,0,0.6)",
    cardBackdrop:    "none",
    sidebarBackdrop: "none",

    mapOpacity: "0.06",
    isLight: false,

    chartColors: ["#38bdf8","#818cf8","#34d399","#fbbf24","#f87171","#c084fc","#ec4899","#2dd4bf"],
  },

  // ══════════════════════════════════════════════════════
  // ⚪ CINZA & PRATA — Glassmorphism Executivo
  // Mesmo padrão visual do Glass & Gelo, fundo de escritório
  // ══════════════════════════════════════════════════════
  gray: {
    id: "gray",
    name: "Cinza & Prata",
    emoji: "⚪",
    description: "Glass executivo — fundo escritório",
    isGlassTheme: true,
    bgImageAsset: "fundocinzaprata.jpg",   // ← arquivo em src/assets/ — troque quando quiser!
    bgImageFallback: "#1a1f2e",            // fallback escuro enquanto imagem carrega
    bgOverlay: "rgba(15,20,35,0.45)",      // overlay mais escuro que o glass para contraste

    bgPrimary:   "transparent",
    bgSecondary: "rgba(255,255,255,0.05)",
    bgCard:      "rgba(255,255,255,0.08)",
    bgCardHover: "rgba(255,255,255,0.14)",
    bgInput:     "rgba(255,255,255,0.10)",
    bgModal:     "rgba(20,25,40,0.85)",

    border:       "rgba(255,255,255,0.12)",
    borderCard:   "rgba(255,255,255,0.15)",
    borderInput:  "rgba(255,255,255,0.2)",
    borderActive: "rgba(148,163,184,0.6)",

    // prata/slate como cor primária
    primary:       "#94a3b8",
    primaryDark:   "#64748b",
    primaryGrad:   "linear-gradient(135deg, #94a3b8, #64748b)",
    accent:        "#cbd5e1",
    accentGrad:    "linear-gradient(135deg, #64748b, #475569)",

    textPrimary:   "#f1f5f9",
    textSecondary: "#cbd5e1",
    textMuted:     "#94a3b8",
    textActive:    "#e2e8f0",

    income:  "#4ade80",
    expense: "#f87171",
    warning: "#fbbf24",
    purple:  "#c084fc",

    sidebarBg:      "rgba(255,255,255,0.07)",
    sidebarActive:  "rgba(148,163,184,0.18)",
    sidebarBorder:  "rgba(148,163,184,0.35)",
    sidebarShadow:  "rgba(148,163,184,0.1)",

    cardBorderTop:   "rgba(255,255,255,0.3)",
    cardShadow:      "rgba(0,0,0,0.25)",
    cardBackdrop:    "blur(18px) saturate(160%)",
    sidebarBackdrop: "blur(24px) saturate(140%)",

    mapOpacity: "0",
    isLight: false,   // texto claro sobre fundo escuro

    chartColors: ["#94a3b8","#cbd5e1","#4ade80","#fbbf24","#f87171","#c084fc","#38bdf8","#fb923c"],
  },
};

export const DEFAULT_THEME = "blue";