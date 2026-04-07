import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function Settings() {
  const { theme, themeId, changeTheme, themes } = useTheme();
  const isGlass = themeId === "glass";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const isMobile = useIsMobile();

  function handleChange(id) {
    changeTheme(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sectionCard = {
    background: isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius: 20,
    padding: isMobile ? "24px 20px" : "32px",
    marginBottom: 32,
    ...(isGlass && {
      backdropFilter: "blur(18px) saturate(180%)",
      WebkitBackdropFilter: "blur(18px) saturate(180%)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    }),
  };

  const previewCardStyle = (color) => ({
    background: isGlass ? "rgba(255,255,255,0.25)" : theme.bgPrimary,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderTop: `2px solid ${color}`,
    borderRadius: 14,
    padding: "18px 20px",
    boxShadow: isGlass ? "0 4px 16px rgba(0,0,0,0.06)" : `0 8px 24px ${theme.cardShadow}`,
    ...(isGlass && { backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }),
  });

  const previewBarStyle = {
    background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgPrimary,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: 12,
    ...(isGlass && { backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }),
  };

  const infoBoxStyle = {
    background: isGlass ? "rgba(255,255,255,0.2)" : `${theme.primary}11`,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : `${theme.primary}33`}`,
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex", gap: 12, alignItems: "flex-start",
    ...(isGlass && { backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }),
  };

  return (
    <PageLayout>

      <style>{`
        .theme-card {
          border-radius: 16px; padding: 24px; cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative; overflow: hidden;
        }
        .theme-card:hover { transform: translateY(-6px); }
        .theme-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        }
        .color-dot {
          width: 28px; height: 28px; border-radius: 50%;
          transition: transform 0.2s ease;
        }
        .color-dot:hover { transform: scale(1.2); }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 40px", overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <img src={logoGif} alt="logo" style={{ width: isMobile ? 44 : 60, height: isMobile ? 44 : 60, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
          <div>
            <h1 style={{ fontSize: isMobile ? "22px" : "1.75rem", fontWeight: 700, margin: 0, color: theme.textPrimary }}>Configurações</h1>
            <p style={{ color: theme.textMuted, margin: "4px 0 0", fontSize: "0.9rem" }}>Personalize a aparência do sistema</p>
          </div>
        </div>

        {/* TOAST */}
        {saved && (
          <div style={{ position: "fixed", bottom: 28, right: 28, background: theme.primaryGrad, color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
            ✅ Tema aplicado com sucesso!
          </div>
        )}

        {/* SEÇÃO TEMAS */}
        <div style={sectionCard}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px 0", color: theme.textPrimary }}>🎨 Tema do Sistema</h2>
          <p style={{ color: theme.textMuted, fontSize: "0.85rem", margin: "0 0 28px 0" }}>O tema é salvo automaticamente e aplicado em todas as páginas.</p>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
            {Object.values(themes).map(t => {
              const isActive = themeId === t.id;
              const isThisGlass = t.id === "glass";

              return (
                <div key={t.id} className="theme-card" onClick={() => handleChange(t.id)} style={{
                  background: isThisGlass
                    ? "linear-gradient(135deg, rgba(200,215,235,0.6), rgba(220,230,245,0.4))"
                    : t.bgCard,
                  border: isActive
                    ? `2px solid ${t.primary}`
                    : isThisGlass ? "1px solid rgba(255,255,255,0.6)" : `1px solid ${t.borderCard}`,
                  boxShadow: isActive
                    ? `0 0 24px ${t.primary}33, 0 8px 32px rgba(0,0,0,0.3)`
                    : isThisGlass ? "0 4px 20px rgba(0,0,0,0.08)" : "0 8px 24px rgba(0,0,0,0.3)",
                  ...(isThisGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
                }}>
                  {isActive && (
                    <div style={{ position: "absolute", top: 10, right: 10, background: t.primaryGrad, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.05em" }}>ATIVO</div>
                  )}
                  <div style={{ fontSize: "2rem", marginBottom: 10 }}>{t.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isActive ? t.primary : (isThisGlass ? "#1e2d4a" : "#e2e8f0"), marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: "0.75rem", color: isActive ? t.textSecondary : (isThisGlass ? "#4a607d" : "#64748b"), marginBottom: 16 }}>{t.description}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <div className="color-dot" style={{ background: t.primary }} />
                    <div className="color-dot" style={{ background: t.accent }} />
                    <div className="color-dot" style={{ background: t.income }} />
                    <div className="color-dot" style={{ background: t.expense }} />
                  </div>
                  <div style={{ background: isThisGlass ? "rgba(255,255,255,0.4)" : t.bgPrimary, borderRadius: 10, padding: "10px 12px", border: isThisGlass ? "1px solid rgba(255,255,255,0.6)" : `1px solid ${t.border}`, ...(isThisGlass && { backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }) }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, color: isThisGlass ? "#4a607d" : t.textMuted }}>Entradas</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: t.income }}>R$ 12.500,00</div>
                    <div style={{ height: 3, borderRadius: 3, background: t.primaryGrad, marginTop: 6, opacity: 0.6 }} />
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleChange(t.id); }} style={{
                    marginTop: 14, width: "100%", padding: "9px", borderRadius: 10, border: "none",
                    cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                    background: isActive ? t.primaryGrad : isThisGlass ? "rgba(255,255,255,0.4)" : `${t.primary}22`,
                    color: isActive ? "#fff" : (isThisGlass ? "#1d4ed8" : t.primary),
                    transition: "all 0.2s",
                    ...(isThisGlass && !isActive && { border:"1px solid rgba(255,255,255,0.6)" }),
                  }}>
                    {isActive ? "✓ Tema Ativo" : "Aplicar Tema"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* PREVIEW */}
        <div style={sectionCard}>
          <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 20px 0", color: theme.textPrimary }}>👁️ Preview do Tema Atual</h2>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
            {[
              { label:"Entradas", value:"R$ 12.500,00", color: theme.income,  icon:"📈" },
              { label:"Saídas",   value:"R$ 4.200,00",  color: theme.expense, icon:"📉" },
              { label:"Saldo",    value:"R$ 8.300,00",  color: theme.primary, icon:"💰" },
            ].map((c,i) => (
              <div key={i} style={previewCardStyle(c.color)}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c.color, marginTop: 6 }}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={previewBarStyle}>
            <div style={{ display:"flex", gap: 8 }}>
              {["Todos","Entradas","Saídas"].map((f,i) => (
                <button key={i} style={{
                  background: i===0 ? theme.primaryGrad : isGlass ? "rgba(255,255,255,0.25)" : "transparent",
                  color: i===0 ? "#fff" : theme.textMuted,
                  border: i===0 ? "none" : `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
                  borderRadius: 8, padding:"6px 14px", fontSize: 12, cursor:"pointer", fontWeight: 600,
                }}>{f}</button>
              ))}
            </div>
            <button style={{ background: theme.primaryGrad, color:"#fff", border:"none", borderRadius: 10, padding:"8px 18px", fontWeight: 600, fontSize: 13, cursor:"pointer", boxShadow: `0 4px 15px ${theme.primary}44` }}>
              + Nova Transação
            </button>
          </div>
        </div>

        {/* INFO */}
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, color: isGlass ? "#1d4ed8" : theme.primary, marginBottom: 4, fontSize: "0.9rem" }}>Tema salvo automaticamente</div>
            <div style={{ color: theme.textMuted, fontSize: "0.82rem", lineHeight: 1.6 }}>
              O tema escolhido é salvo no seu navegador e aplicado automaticamente em todas as páginas do sistema. Você pode trocar a qualquer momento.
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}