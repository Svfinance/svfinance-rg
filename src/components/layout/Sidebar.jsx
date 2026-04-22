import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { logoutUser } from "../../services/api";

// ─── Persistência do estilo ───────────────────────────────────────────────────
const SIDEBAR_STYLE_KEY = "sv_sidebar_style";
export function getSidebarStyle() {
  return localStorage.getItem(SIDEBAR_STYLE_KEY) || "vertical";
}
export function setSidebarStyleLS(s) {
  localStorage.setItem(SIDEBAR_STYLE_KEY, s);
}

// ─── Menu items ───────────────────────────────────────────────────────────────
function useMenuItems() {
  const role        = localStorage.getItem("role")         || "viewer";
  const accountType = localStorage.getItem("account_type") || "business";
  const isPersonal  = accountType === "personal";

  const all = isPersonal ? [
    { to:"/dashboard",    icon:"🏠", label:"Dashboard"         },
    { to:"/transactions", icon:"💰", label:"Transações"        },
    { to:"/bills",        icon:"📄", label:"Contas"            },
    { to:"/analytics",   icon:"📊", label:"Analytics"         },
    { to:"/goals",        icon:"🎯", label:"Metas"             },
    { to:"/settings",     icon:"⚙️", label:"Configurações"     },
  ] : [
    { to:"/dashboard",     icon:"🏠", label:"Dashboard",                        roles:null },
    { to:"/clients",       icon:"👥", label:"Clientes",                          roles:null },
    { to:"/transactions",  icon:"💰", label:"Transações",                        roles:["admin","financial"] },
    { to:"/bills",         icon:"📄", label:"Contas",                            roles:["admin","financial"] },
    { to:"/analytics",    icon:"📊", label:"Analytics",                         roles:["admin","financial"] },
    { to:"/reports",       icon:"📈", label:"Relatórios",                        roles:["admin","financial"] },
    { to:"/products",      icon:"📦", label:"Produtos",                          roles:["admin","financial","stock","seller"] },
    { to:"/quotes",        icon:"🧾", label:"Orçamentos",                        roles:null },
    { to:"/sales",         icon:"🛒", label:"Vendas",                            roles:null },
    { to:"/team",          icon:"👤", label:"Equipe",                            roles:["admin"] },
    { to:"/import-export", icon:"📂", label:"Importar/Exportar",                 roles:["admin","financial"] },
    { to:"/settings",      icon:"⚙️", label:"Configurações",                     roles:null },
  ];

  return all.filter(item => !item.roles || item.roles.includes(role));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 1 — VERTICAL (atual, retrátil no hover)
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarVertical({ menuItems, theme, isGlass, sidebarOpen, setSidebarOpen }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();

  const bg       = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg;
  const backdrop = isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const border   = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;
  const shadow   = isGlass
    ? "4px 0 24px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.5)"
    : "4px 0 24px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.06)";

  return (
    <div style={{ height:"100vh", position:"sticky", top:0, background:bg,
      backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      borderRight:`1px solid ${border}`, boxShadow:shadow,
      padding:"20px 10px 10px", transition:"all 0.3s ease",
      overflow:"hidden", width:sidebarOpen?"220px":"70px",
      display:"flex", flexDirection:"column", zIndex:100 }}
      onMouseEnter={() => setSidebarOpen(true)}
      onMouseLeave={() => setSidebarOpen(false)}
    >
      <div style={{ flexShrink:0, marginBottom:20 }}>
        <div style={{ opacity:sidebarOpen?1:0, transition:"0.3s" }}>
          <h2 style={{ whiteSpace:"nowrap", margin:0, fontWeight:600, letterSpacing:1, color:theme.textPrimary }}>SV Finance</h2>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
        {menuItems.map(item => {
          const active   = isActive(item.to);
          const activeBg = isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive;
          const hoverBg  = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`;
          return (
            <div key={item.to}
              style={{ padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s", marginBottom:6,
                background:active?activeBg:"transparent",
                border:active?`1px solid ${isGlass?"rgba(255,255,255,0.55)":theme.sidebarBorder}`:"1px solid transparent",
                boxShadow:active?(isGlass?"0 4px 16px rgba(0,0,0,0.08)":`0 4px 16px ${theme.sidebarShadow||"rgba(0,0,0,0.2)"}`):"none" }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background=hoverBg; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent"; }}
            >
              <Link to={item.to} style={{ textDecoration:"none", color:theme.textPrimary, display:"flex", alignItems:"center", gap:12, width:"100%" }}>
                <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>{item.icon}</span>
                <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", fontWeight:active?600:400 }}>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </div>

      <div style={{ flexShrink:0, borderTop:`1px solid ${border}`, paddingTop:10, marginTop:10 }}>
        <div style={{ padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}
          onClick={() => { logoutUser(); navigate("/"); }}
        >
          <span style={{ display:"flex", alignItems:"center", gap:12, color:theme.textPrimary }}>
            <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>🚪</span>
            <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:"#ef4444", fontWeight:500 }}>Sair</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 2 — HORIZONTAL (barra no topo)
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarHorizontal({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();

  const bg      = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg || theme.bgSecondary;
  const border  = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;
  const backdrop= isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:200,
      background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      borderBottom:`1px solid ${border}`,
      boxShadow:isGlass?"0 4px 24px rgba(0,0,0,0.08)":"0 4px 24px rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", padding:"0 16px", height:58, gap:4 }}
    >
      {/* Logo */}
      <span style={{ fontWeight:700, fontSize:15, color:theme.textPrimary, marginRight:12, whiteSpace:"nowrap", letterSpacing:1 }}>
        SV Finance
      </span>

      {/* Items */}
      <div style={{ display:"flex", alignItems:"center", gap:2, flex:1, overflowX:"auto" }}>
        {menuItems.map(item => {
          const active  = isActive(item.to);
          const hoverBg = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}18`;
          return (
            <Link key={item.to} to={item.to}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px",
                borderRadius:10, textDecoration:"none", whiteSpace:"nowrap",
                color:active?theme.textActive:theme.textMuted,
                background:active?(isGlass?"rgba(255,255,255,0.3)":`${theme.primary}22`):"transparent",
                border:active?`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`:"1px solid transparent",
                fontWeight:active?700:400, fontSize:13, transition:"all 0.2s",
                flexShrink:0 }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background=hoverBg; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ fontSize:16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <button onClick={() => { logoutUser(); navigate("/"); }}
        style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
          borderRadius:10, color:"#ef4444", padding:"7px 14px", cursor:"pointer",
          fontWeight:600, fontSize:13, flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
        🚪 Sair
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 3 — DOCK (bolinhas meia lua, hover eleva e abre label)
// ═══════════════════════════════════════════════════════════════════════════════
function DockItem({ item, active, theme, isGlass }) {
  const [hovered, setHovered] = useState(false);

  const activeBg  = isGlass ? "rgba(255,255,255,0.5)"  : theme.primary;
  const hoverBg   = isGlass ? "rgba(255,255,255,0.35)" : `${theme.primary}44`;
  const defaultBg = isGlass ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)";
  const border    = isGlass ? "rgba(255,255,255,0.6)"  : active ? theme.primary : "rgba(255,255,255,0.1)";

  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip label — aparece à direita */}
      <div style={{
        position:"absolute", left:62, top:"50%", transform:"translateY(-50%)",
        background:isGlass?"rgba(255,255,255,0.9)":"rgba(15,23,42,0.95)",
        color:isGlass?"#1e293b":theme.textPrimary,
        padding:"6px 14px", borderRadius:10, fontSize:13, fontWeight:600,
        whiteSpace:"nowrap", pointerEvents:"none",
        border:`1px solid ${isGlass?"rgba(255,255,255,0.8)":theme.borderCard}`,
        boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
        opacity:hovered?1:0, transition:"opacity 0.15s, transform 0.15s",
        transform:`translateY(-50%) translateX(${hovered?0:-6}px)`,
        zIndex:300,
      }}>
        {item.label}
        {/* seta */}
        <div style={{ position:"absolute", left:-5, top:"50%", transform:"translateY(-50%) rotate(45deg)",
          width:8, height:8,
          background:isGlass?"rgba(255,255,255,0.9)":"rgba(15,23,42,0.95)",
          border:`1px solid ${isGlass?"rgba(255,255,255,0.8)":theme.borderCard}`,
          borderRight:"none", borderTop:"none" }}/>
      </div>

      {/* Bolinha */}
      <Link to={item.to} style={{ textDecoration:"none" }}>
        <div style={{
          width:46, height:46, borderRadius:"50%", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:20, cursor:"pointer",
          background:active?activeBg:hovered?hoverBg:defaultBg,
          border:`2px solid ${border}`,
          boxShadow:active
            ? `0 0 0 4px ${theme.primary}33, 0 6px 20px ${theme.primary}44`
            : hovered ? `0 8px 24px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
          transform:hovered?"translateY(-4px) scale(1.08)":"translateY(0) scale(1)",
          transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          backdropFilter:isGlass?"blur(12px)":undefined,
        }}>
          {item.icon}
        </div>
      </Link>
    </div>
  );
}

function SidebarDock({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const [logHover, setLogHover] = useState(false);

  const trackBg  = isGlass ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)";
  const border   = isGlass ? "rgba(255,255,255,0.3)"  : "rgba(255,255,255,0.08)";

  return (
    <div style={{
      position:"fixed", left:12, top:"50%", transform:"translateY(-50%)",
      zIndex:200, display:"flex", flexDirection:"column", alignItems:"center",
      gap:8, padding:"14px 10px",
      background:trackBg,
      backdropFilter:isGlass?"blur(20px) saturate(180%)":"blur(16px)",
      WebkitBackdropFilter:isGlass?"blur(20px) saturate(180%)":"blur(16px)",
      border:`1px solid ${border}`,
      borderRadius:32,
      boxShadow:isGlass
        ? "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)"
        : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {/* Logo mini */}
      <div style={{ fontSize:18, marginBottom:4 }}>💎</div>
      <div style={{ width:24, height:1, background:border, marginBottom:4 }}/>

      {/* Items */}
      {menuItems.map(item => (
        <DockItem key={item.to} item={item} active={isActive(item.to)} theme={theme} isGlass={isGlass}/>
      ))}

      {/* Divisor + logout */}
      <div style={{ width:24, height:1, background:border, marginTop:4 }}/>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}
        onMouseEnter={() => setLogHover(true)}
        onMouseLeave={() => setLogHover(false)}
      >
        <div style={{
          position:"absolute", left:62, top:"50%", transform:"translateY(-50%)",
          background:isGlass?"rgba(255,255,255,0.9)":"rgba(15,23,42,0.95)",
          color:"#ef4444", padding:"6px 14px", borderRadius:10, fontSize:13, fontWeight:600,
          whiteSpace:"nowrap", pointerEvents:"none",
          border:`1px solid rgba(239,68,68,0.3)`,
          opacity:logHover?1:0, transition:"opacity 0.15s",
          zIndex:300,
        }}>Sair</div>
        <div onClick={() => { logoutUser(); navigate("/"); }}
          style={{
            width:46, height:46, borderRadius:"50%", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:20, cursor:"pointer",
            background:logHover?"rgba(239,68,68,0.2)":isGlass?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)",
            border:`2px solid ${logHover?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.1)"}`,
            transform:logHover?"translateY(-4px) scale(1.08)":"scale(1)",
            transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow:logHover?"0 8px 24px rgba(239,68,68,0.3)":"0 2px 8px rgba(0,0,0,0.2)",
          }}>
          🚪
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE — hamburguer (igual ao atual, independente do estilo)
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarMobile({ menuItems, theme, isGlass }) {
  const location   = useLocation();
  const isActive   = p => location.pathname === p;
  const navigate   = useNavigate();
  const [open, setOpen] = useState(false);

  const backdrop = isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const border   = isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard;

  return (
    <>
      <button onClick={() => setOpen(!open)}
        style={{ position:"fixed", top:16, left:16, zIndex:200,
          background:isGlass?"rgba(255,255,255,0.35)":theme.bgSecondary,
          backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
          border:`1px solid ${border}`, borderRadius:10,
          color:theme.textPrimary, fontSize:20, width:44, height:44,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:150, backdropFilter:"blur(2px)" }}
          onClick={() => setOpen(false)}/>
      )}

      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:260,
        background:isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary,
        backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
        borderRight:`1px solid ${border}`, zIndex:160,
        display:"flex", flexDirection:"column",
        transition:"transform 0.3s ease",
        transform:open?"translateX(0)":"translateX(-100%)",
        boxShadow:isGlass?"8px 0 32px rgba(0,0,0,0.15)":"8px 0 32px rgba(0,0,0,0.5)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 20px 16px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
          <span style={{ fontSize:18, fontWeight:700, color:theme.textPrimary, letterSpacing:1 }}>SV Finance</span>
          <button onClick={() => setOpen(false)}
            style={{ background:`${theme.primary}22`, border:"none", color:theme.textPrimary,
              borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>

        <div style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:6, overflowY:"auto" }}>
          {menuItems.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                borderRadius:12, textDecoration:"none", color:theme.textPrimary,
                fontSize:15, fontWeight:500, transition:"all 0.2s",
                background:isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                border:isActive(item.to)?`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.sidebarBorder}`:"1px solid transparent" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ fontWeight:isActive(item.to)?600:400 }}>{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ padding:12, flexShrink:0 }}>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ width:"100%", padding:"14px 16px",
              background:isGlass?"rgba(239,68,68,0.12)":"rgba(239,68,68,0.1)",
              border:"1px solid rgba(239,68,68,0.25)", borderRadius:12,
              color:"#ef4444", fontSize:15, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
            🚪 Sair
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray";
  const isMobile = window.innerWidth <= 768;
  const menuItems = useMenuItems();

  const [sidebarStyle, setSidebarStyleState] = useState(getSidebarStyle());

  // Escuta mudanças de estilo feitas em Settings.jsx
  useEffect(() => {
    const handler = () => setSidebarStyleState(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", handler);
    return () => window.removeEventListener("sv_sidebar_style_changed", handler);
  }, []);

  if (isMobile) return <SidebarMobile menuItems={menuItems} theme={theme} isGlass={isGlass}/>;

  if (sidebarStyle === "horizontal") {
    return <SidebarHorizontal menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  }
  if (sidebarStyle === "dock") {
    return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  }
  return <SidebarVertical menuItems={menuItems} theme={theme} isGlass={isGlass} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>;
}