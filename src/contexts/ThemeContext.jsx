import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME, RG_COMPANY_ID, RG_THEMES } from "../themes/themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const cid = localStorage.getItem("company_id") || "";
    // Usuário RG sempre começa com o tema clean
    if (String(cid) === RG_COMPANY_ID) {
      localStorage.setItem("sv_theme", "clean");
      return "clean";
    }
    const saved = localStorage.getItem("sv_theme") || DEFAULT_THEME;
    return THEMES[saved] ? saved : DEFAULT_THEME;
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  function changeTheme(id) {
    const cid = localStorage.getItem("company_id") || "";
    // RG só pode usar temas RG
    if (String(cid) === RG_COMPANY_ID && !RG_THEMES.includes(id)) return;
    if (!THEMES[id]) return;
    setThemeId(id);
    localStorage.setItem("sv_theme", id);
  }

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
