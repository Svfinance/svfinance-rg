import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { logoutUser } from "../../services/api";

function Sidebar({ sidebarOpen, setSidebarOpen }) {

  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, themeId } = useTheme();

  const isGlass  = themeId === "glass";
  const isMobile = window.innerWidth <= 768;
  const role     = localStorage.getItem("role") || "viewer";

  const allMenuItems = [
    { to: "/dashboard",    icon: "🏠", label: "Dashboard",  roles: null },
    { to: "/clients",      icon: "👥", label: "Clientes",   roles: null },
    { to: "/transactions", icon: "💰", label: "Transações", roles: ["admin", "financial"] },
    { to: "/bills",        icon: "📄", label: "Contas",     roles: ["admin", "financial"] },
    { to: "/analytics",    icon: "📊", label: "Analytics",  roles: ["admin", "financial"] },
    { to: "/products",     icon: "📦", label: "Produtos",   roles: null },
    { to: "/quotes",       icon: "🧾", label: "Orçamentos", roles: null },
    { to: "/sales",        icon: "🛒", label: "Vendas",     roles: null },
    { to: "/team",         icon: "👤", label: "Equipe",     roles: ["admin"] },
    { to: "/settings",     icon: "🎨", label: "Temas",      roles: null },
  ];

  const menuItems = allMenuItems.filter(item =>
    item.roles === null || item.roles.includes(role)
  );

  const handleLogout = () => {
    logoutUser();
    window.location.href = "/";
  };

  const sidebarGlassBg   = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg;
  const sidebarBackdrop  = isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const sidebarBorder    = isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard;
  const sidebarBoxShadow = isGlass
    ? "4px 0 24px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.5)"
    : "4px 0 24px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.06)";

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position:"fixed", top:16, left:16, zIndex:200,
            background: isGlass?"rgba(255,255,255,0.35)":theme.bgSecondary,
            backdropFilter: sidebarBackdrop, WebkitBackdropFilter: sidebarBackdrop,
            border:`1px solid ${sidebarBorder}`, borderRadius:10,
            color:theme.textPrimary, fontSize:20, width:44, height:44,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}
        >
          {mobileOpen?"✕":"☰"}
        </button>

        {mobileOpen && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:150, backdropFilter:"blur(2px)" }} onClick={() => setMobileOpen(false)} />
        )}

        <div style={{
          position:"fixed", top:0, left:0, bottom:0, width:260,
          background: isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary,
          backdropFilter:sidebarBackdrop, WebkitBackdropFilter:sidebarBackdrop,
          borderRight:`1px solid ${sidebarBorder}`, zIndex:160,
          display:"flex", flexDirection:"column",
          transition:"transform 0.3s ease",
          transform: mobileOpen?"translateX(0)":"translateX(-100%)",
          boxShadow: isGlass?"8px 0 32px rgba(0,0,0,0.15)":"8px 0 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 20px 16px", borderBottom:`1px solid ${sidebarBorder}` }}>
            <span style={{ fontSize:18, fontWeight:700, color:theme.textPrimary, letterSpacing:1 }}>Finance</span>
            <button onClick={() => setMobileOpen(false)} style={{ background: isGlass?"rgba(255,255,255,0.3)":`${theme.primary}22`, border:"none", color:theme.textPrimary, borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✕</button>
          </div>

          <div style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:6, overflowY:"auto" }}>
            {menuItems.map(item => (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"14px 16px", borderRadius:12,
                textDecoration:"none", color:theme.textPrimary,
                fontSize:15, fontWeight:500, transition:"all 0.2s",
                background: isActive(item.to) ? (isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive) : "transparent",
                border: isActive(item.to) ? `1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.sidebarBorder}` : "1px solid transparent",
              }}>
                <span style={{ fontSize:20 }}>{item.icon}</span>
                <span style={{ fontWeight:500 }}>{item.label}</span>
              </Link>
            ))}
          </div>

          <button onClick={handleLogout} style={{ margin:"0 12px 24px", padding:"14px 16px", background: isGlass?"rgba(239,68,68,0.12)":"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, color:"#ef4444", fontSize:15, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
            🚪 Sair
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        height:"100vh", position:"sticky", top:0,
        background:sidebarGlassBg,
        backdropFilter:sidebarBackdrop, WebkitBackdropFilter:sidebarBackdrop,
        borderRight:`1px solid ${sidebarBorder}`,
        boxShadow:sidebarBoxShadow,
        padding:"20px 10px", transition:"all 0.3s ease",
        overflow:"hidden",
        width: sidebarOpen?"220px":"70px",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        zIndex:100,
      }}
      onMouseEnter={() => setSidebarOpen(true)}
      onMouseLeave={() => setSidebarOpen(false)}
    >
      <div>
        <h2 style={{ opacity: sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", marginBottom:"40px", fontWeight:"600", letterSpacing:"1px", color:theme.textPrimary }}>
          Finance
        </h2>

        {menuItems.map(item => (
          <MenuItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={isActive(item.to)}
            sidebarOpen={sidebarOpen}
            theme={theme}
            isGlass={isGlass}
          />
        ))}
      </div>

      <div>
        <div
          style={{ padding:"12px", cursor:"pointer", borderRadius:"10px", transition:"all 0.2s ease", marginBottom:"10px", marginTop:"20px", borderTop:`1px solid ${sidebarBorder}`, paddingTop:"15px" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}
          onClick={handleLogout}
        >
          <span style={{ textDecoration:"none", color:theme.textPrimary, display:"flex", alignItems:"center", gap:"12px", width:"100%" }}>
            <span style={{ fontSize:"18px", minWidth:"24px", textAlign:"center" }}>🚪</span>
            <span style={{ opacity: sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:"#ef4444", fontWeight:500 }}>Sair</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ to, icon, label, active, sidebarOpen, theme, isGlass }) {
  const activeBg     = isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive;
  const activeBorder = isGlass?"rgba(255,255,255,0.55)":theme.sidebarBorder;
  const hoverBg      = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`;

  return (
    <div
      style={{ padding:"12px", cursor:"pointer", borderRadius:"10px", transition:"all 0.2s ease", marginBottom:"10px", background: active?activeBg:"transparent", border: active?`1px solid ${activeBorder}`:"1px solid transparent", boxShadow: active?(isGlass?"0 4px 16px rgba(0,0,0,0.08)":`0 4px 16px ${theme.sidebarShadow}`):"none", position:"relative" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background=hoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background="transparent"; }}
    >
      <Link to={to} style={{ textDecoration:"none", color:theme.textPrimary, display:"flex", alignItems:"center", gap:"12px", width:"100%" }}>
        <span style={{ fontSize:"18px", minWidth:"24px", textAlign:"center" }}>{icon}</span>
        <span style={{ opacity: sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:theme.textPrimary, fontWeight: active?600:400 }}>{label}</span>
      </Link>
    </div>
  );
}

export default Sidebar;