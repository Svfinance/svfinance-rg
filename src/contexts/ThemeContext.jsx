// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME, RG_THEMES } from "../themes/themes";

const ThemeContext = createContext(null);

// Incrementar este número a cada deploy que mude o tema padrão
// Isso invalida o localStorage antigo em QUALQUER dispositivo/cache
const CACHE_VERSION = "rg-v3";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    // Se a versão mudou (deploy novo), força reset do tema salvo
    if (localStorage.getItem("sv_tv") !== CACHE_VERSION) {
      localStorage.setItem("sv_tv", CACHE_VERSION);
      localStorage.setItem("sv_theme", DEFAULT_THEME);
      return DEFAULT_THEME;
    }
    const saved = localStorage.getItem("sv_theme");
    // Aceita apenas temas válidos deste frontend — rejeita "blue", "aurora" etc
    if (saved && RG_THEMES.includes(saved) && THEMES[saved]) return saved;
    localStorage.setItem("sv_theme", DEFAULT_THEME);
    return DEFAULT_THEME;
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  function changeTheme(id) {
    if (!RG_THEMES.includes(id) || !THEMES[id]) return;
    setThemeId(id);
    localStorage.setItem("sv_theme", id);
  }

  useEffect(() => {
    document.body.style.background = theme.bgPrimary;
    document.body.style.color      = theme.textPrimary;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, changeTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro do ThemeProvider");
  return ctx;
}