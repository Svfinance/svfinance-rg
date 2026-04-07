import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME } from "../themes/themes";

// =========================
// CONTEXTO
// =========================

const ThemeContext = createContext(null);

// =========================
// PROVIDER
// =========================

export function ThemeProvider({ children }) {

  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem("sv_theme") || DEFAULT_THEME;
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  function changeTheme(id) {
    if (!THEMES[id]) return;
    setThemeId(id);
    localStorage.setItem("sv_theme", id);
  }

  // Aplica o fundo global no body
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

// =========================
// HOOK
// =========================

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro do ThemeProvider");
  return ctx;
}