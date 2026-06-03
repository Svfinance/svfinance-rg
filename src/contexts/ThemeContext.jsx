// src/contexts/ThemeContext.jsx
// Frontend finance-control-solucoes — exclusivo Restaura Glass
// DEFAULT_THEME = "clean" => qualquer usuário abre com o tema branco
// Sem lógica de company_id: este frontend inteiro é da Restaura Glass

import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME, RG_THEMES } from "../themes/themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem("sv_theme");
    // Aceita apenas temas válidos para este frontend
    // Se tiver "blue", "aurora" etc salvo de outro acesso → ignora, usa clean
    if (saved && RG_THEMES.includes(saved) && THEMES[saved]) return saved;
    // Qualquer outro caso (primeiro acesso, tema inválido, mobile sem histórico) → clean
    localStorage.setItem("sv_theme", DEFAULT_THEME);
    return DEFAULT_THEME;
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  function changeTheme(id) {
    // Só aceita temas deste frontend
    if (!RG_THEMES.includes(id) || !THEMES[id]) return;
    setThemeId(id);
    localStorage.setItem("sv_theme", id);
  }

  useEffect(() => {
    // Garantia extra: se por qualquer motivo o tema for inválido, corrige
    if (!RG_THEMES.includes(themeId) || !THEMES[themeId]) {
      setThemeId(DEFAULT_THEME);
      localStorage.setItem("sv_theme", DEFAULT_THEME);
    }
  }, [themeId]);

  useEffect(() => {
    document.body.style.background = theme.bgPrimary;
    document.body.style.color = theme.textPrimary;
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