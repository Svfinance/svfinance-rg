// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import { getSidebarStyle } from "../components/layout/Sidebar";

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { texto: "Bom dia",   emoji: "☀️" };
  if (h >= 12 && h < 18) return { texto: "Boa tarde",  emoji: "🌤️" };
  return                        { texto: "Boa noite",  emoji: "🌙" };
}

function getDataFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

export default function HomePage() {
  const navigate   = useNavigate();
  const nome       = localStorage.getItem("name") || "Colaborador";
  const role       = localStorage.getItem("role") || "viewer";
  const saudacao   = getSaudacao();
  const data       = getDataFormatada();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hora, setHora]               = useState(new Date());
  const [visible, setVisible]         = useState(false);
  const isHorizontal = getSidebarStyle() === "horizontal";
  const TOPBAR_H     = 54;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    const iv = setInterval(() => setHora(new Date()), 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const horaStr = hora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Atalhos rápidos por role
  const atalhos = [
    { icon: "📋", label: "Ordens de Serviço", to: "/orders",  roles: ["admin","financial","seller","stock","viewer","encarregado"] },
    { icon: "👥", label: "Clientes",           to: "/clients", roles: ["admin","financial","seller","encarregado"] },
    { icon: "🔑", label: "Check-in",           to: "/autorizacao-checkin", roles: ["admin","encarregado"] },
    { icon: "💰", label: "Transações",          to: "/transactions", roles: ["admin","financial"] },
    { icon: "📊", label: "Analytics",           to: "/analytics",   roles: ["admin","financial"] },
    { icon: "👤", label: "Equipe",              to: "/team",         roles: ["admin"] },
    { icon: "⚙️", label: "Configurações",       to: "/settings",     roles: ["admin"] },
  ].filter(a => a.roles.includes(role));

  return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: isHorizontal ? `${TOPBAR_H + 32}px 24px 48px` : "32px 24px 48px",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Logo central girando no eixo Y */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}>

          {/* Logo grande com spin Y */}
          <div style={{
            width: "min(260px, 55vw)",
            height: "min(260px, 55vw)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            filter: "drop-shadow(0 8px 32px rgba(43,81,2,0.25))",
            animation: "rgSpinY 8s linear infinite",
          }}>
            <img
              src="/icons/rg/icon-192.png"
              alt="Restaura Glass"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 32,
              }}
            />
          </div>

          {/* Saudação */}
          <div style={{
            textAlign: "center",
            marginTop: 24,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.9s ease 0.2s, transform 0.9s ease 0.2s",
          }}>
            <div style={{
              fontSize: "clamp(13px, 3vw, 15px)",
              color: "#6b8c3a",
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              {saudacao.emoji} {saudacao.texto}
            </div>
            <div style={{
              fontSize: "clamp(22px, 6vw, 38px)",
              fontWeight: 700,
              color: "#1a3a02",
              lineHeight: 1.15,
              marginBottom: 6,
            }}>
              {nome.split(" ")[0]}
            </div>
            <div style={{
              fontSize: "clamp(32px, 9vw, 56px)",
              fontWeight: 800,
              color: "#2B5102",
              letterSpacing: -1,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {horaStr}
            </div>
            <div style={{
              fontSize: "clamp(11px, 2.5vw, 13px)",
              color: "#6b8c3a",
              marginTop: 8,
              textTransform: "capitalize",
            }}>
              {data}
            </div>
          </div>
        </div>

        {/* Linha divisória */}
        <div style={{
          width: "min(320px, 80vw)",
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(43,81,2,0.25), transparent)",
          margin: "32px 0",
          opacity: visible ? 1 : 0,
          transition: "opacity 1s ease 0.5s",
        }} />

        {/* Atalhos rápidos */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
          maxWidth: 600,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.9s ease 0.6s, transform 0.9s ease 0.6s",
        }}>
          {atalhos.map((a, i) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(43,81,2,0.18)",
                color: "#1a3a02",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 12px rgba(43,81,2,0.08)",
                animationDelay: `${0.7 + i * 0.07}s`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(43,81,2,0.12)";
                e.currentTarget.style.borderColor = "rgba(43,81,2,0.4)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(43,81,2,0.15)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.55)";
                e.currentTarget.style.borderColor = "rgba(43,81,2,0.18)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(43,81,2,0.08)";
              }}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* Slogan */}
        <div style={{
          marginTop: 48,
          fontSize: "clamp(11px, 2.5vw, 13px)",
          color: "rgba(43,81,2,0.4)",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: visible ? 1 : 0,
          transition: "opacity 1.2s ease 1s",
        }}>
          Restaura Glass · Sistema de Gestão
        </div>
      </main>

      <style>{`
        @keyframes rgSpinY {
          0%   { transform: rotateY(0deg);   }
          100% { transform: rotateY(360deg); }
        }
        @media (max-width: 480px) {
          @keyframes rgSpinY {
            0%   { transform: rotateY(0deg);   }
            100% { transform: rotateY(360deg); }
          }
        }
      `}</style>
    </PageLayout>
  );
}