import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { logoutUser } from "../../services/api";

const SIDEBAR_STYLE_KEY    = "sv_sidebar_style";
const SIDEBAR_AUTOHIDE_KEY = "sv_sidebar_autohide";
export function getSidebarStyle()    { return localStorage.getItem(SIDEBAR_STYLE_KEY) || "vertical"; }
export function setSidebarStyleLS(s) { localStorage.setItem(SIDEBAR_STYLE_KEY, s); }
export function getAutoHide()        { return localStorage.getItem(SIDEBAR_AUTOHIDE_KEY) === "true"; }
export function setAutoHideLS(v)     { localStorage.setItem(SIDEBAR_AUTOHIDE_KEY, String(v)); }

function useMenuItems() {
  const role        = localStorage.getItem("role")         || "viewer";
  const accountType = localStorage.getItem("account_type") || "business";
  const isPersonal  = accountType === "personal";

  const all = isPersonal ? [
    { to:"/dashboard",    icon:"🏠", label:"Dashboard"     },
    { to:"/transactions", icon:"💰", label:"Transações"    },
    { to:"/bills",        icon:"📄", label:"Contas"        },
    { to:"/analytics",   icon:"📊", label:"Analytics"     },
    { to:"/goals",        icon:"🎯", label:"Metas"         },
    { to:"/settings",     icon:"⚙️", label:"Configurações" },
  ] : [
    { to:"/dashboard",    icon:"🏠", label:"Dashboard",        roles:null },
    { to:"/clients",      icon:"👥", label:"Clientes",          roles:null },
    { to:"/transactions", icon:"💰", label:"Transações",        roles:["admin","financial"], children:[
      { to:"/transactions", label:"Todas as transações" },
      { to:"/bills",        label:"Contas a pagar/receber" },
    ]},
    { to:"/analytics",   icon:"📊", label:"Analytics",         roles:["admin","financial"] },
    { to:"/reports",      icon:"📈", label:"Relatórios",        roles:["admin","financial"] },
    { to:"/products",     icon:"📦", label:"Produtos",          roles:["admin","financial","stock","seller"] },
    { to:"/quotes",       icon:"🧾", label:"Orçamentos",        roles:null },
    { to:"/sales",        icon:"🛒", label:"Vendas",            roles:null },
    { to:"/team",         icon:"👤", label:"Equipe",            roles:["admin"] },
    { to:"/import-export",icon:"📂", label:"Importar/Exportar", roles:["admin","financial"] },
    { to:"/settings",     icon:"⚙️", label:"Configurações",     roles:null },
  ];
  return all.filter(i => !i.roles || i.roles.includes(role));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 1 — VERTICAL
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarVertical({ menuItems, theme, isGlass, sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const bg      = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg;
  const backdrop= isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const border  = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;
  const shadow  = isGlass ? "4px 0 24px rgba(0,0,0,0.1)" : "4px 0 24px rgba(0,0,0,0.4)";

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
      <div style={{ flexShrink:0, marginBottom:20, opacity:sidebarOpen?1:0, transition:"0.3s" }}>
        <h2 style={{ whiteSpace:"nowrap", margin:0, fontWeight:600, letterSpacing:1, color:theme.textPrimary }}>SV Finance</h2>
      </div>
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
        {menuItems.map(item => {
          const active   = isActive(item.to);
          const activeBg = isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive;
          const hoverBg  = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`;
          return (
            <div key={item.to} style={{ padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s", marginBottom:6,
              background:active?activeBg:"transparent",
              border:active?`1px solid ${isGlass?"rgba(255,255,255,0.55)":theme.sidebarBorder}`:"1px solid transparent" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=hoverBg; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
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
          onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.12)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          onClick={() => { logoutUser(); navigate("/"); }}>
          <span style={{ display:"flex", alignItems:"center", gap:12, color:theme.textPrimary }}>
            <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>🚪</span>
            <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:"#ef4444", fontWeight:500 }}>Sair</span>
          </span>
        </div>
      </div>
    </div>
  );
}


// ─── DropdownPortal — renderiza o dropdown em fixed direto na tela ────────────
function DropdownPortal({ items, anchorIdx, theme, isGlass, border, isActive, onSelect }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    // Pega a posição do item pai no DOM pelo data-idx
    const anchor = document.querySelector(`[data-navitem="${anchorIdx}"]`);
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, [anchorIdx]);

  if (!pos) return null;

  return (
    <div ref={ref} style={{
      position:"fixed",
      top: pos.top, left: pos.left,
      zIndex:9999,
      background: isGlass
        ? "rgba(20,25,40,0.82)"
        : "rgba(15,20,35,0.90)",
      backdropFilter:"blur(28px) saturate(180%)",
      WebkitBackdropFilter:"blur(28px) saturate(180%)",
      border:`1px solid ${isGlass?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.1)"}`,
      borderRadius:14,
      boxShadow:"0 16px 48px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.06) inset",
      overflow:"hidden",
      minWidth:220,
      animation:"dropIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {items.map((child, ci) => {
        const active = isActive(child.to);
        return (
          <div key={child.to}
            onClick={() => onSelect(child.to)}
            style={{
              padding:"12px 20px", fontSize:13.5, cursor:"pointer",
              color: active ? theme.primary : "rgba(255,255,255,0.85)",
              background: active ? `${theme.primary}18` : "transparent",
              fontWeight: active ? 600 : 400,
              borderBottom: ci < items.length-1
                ? "1px solid rgba(255,255,255,0.07)" : "none",
              transition:"all 0.15s",
              display:"flex", alignItems:"center", gap:8,
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background=`${theme.primary}20`;
              e.currentTarget.style.paddingLeft="28px";
              e.currentTarget.style.color=theme.primary;
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background=active?`${theme.primary}18`:"transparent";
              e.currentTarget.style.paddingLeft="20px";
              e.currentTarget.style.color=active?theme.primary:"rgba(255,255,255,0.85)";
            }}>
            <span style={{ opacity:0.5, fontSize:11 }}>▸</span>
            {child.label}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 2 — HORIZONTAL com auto-hide + dropdown
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarHorizontal({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();

  const [autoHide, setAutoHideState] = useState(getAutoHide());
  const [visible,  setVisible]       = useState(!getAutoHide());
  const [openMenu, setOpenMenu]      = useState(null);
  const hideTimer = useRef(null);

  const bg      = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg || theme.bgSecondary;
  const border  = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;
  const backdrop= isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";

  const showBar = () => {
    clearTimeout(hideTimer.current);
    setVisible(true);
  };
  const startHide = () => {
    if (!autoHide) return;
    hideTimer.current = setTimeout(() => { setVisible(false); setOpenMenu(null); }, 600);
  };

  const toggleAutoHide = () => {
    const next = !autoHide;
    setAutoHideState(next);
    setAutoHideLS(next);
    setVisible(!next);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
  };

  // Zona de trigger no topo quando escondido
  const triggerH = 6;
  const barH     = 58;

  return (
    <>
      {/* Zona de ativação — strip invisível no topo */}
      {autoHide && !visible && (
        <div style={{ position:"fixed", top:0, left:0, right:0, height:triggerH, zIndex:210 }}
          onMouseEnter={showBar}/>
      )}

      {/* Barra principal */}
      <div
        onMouseEnter={showBar}
        onMouseLeave={startHide}
        style={{
          position:"fixed", top:0, left:0, right:0, zIndex:200,
          height:barH,
          background:bg,
          backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
          borderBottom:`1px solid ${border}`,
          boxShadow:"0 4px 24px rgba(0,0,0,0.25)",
          display:"flex", alignItems:"center", padding:"0 16px", gap:4,
          transform:visible?"translateY(0)":"translateY(-100%)",
          transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
        {/* Logo */}
        <span style={{ fontWeight:700, fontSize:15, color:theme.textPrimary, marginRight:12, whiteSpace:"nowrap", letterSpacing:1 }}>
          SV Finance
        </span>

        {/* Items */}
        <div style={{ display:"flex", alignItems:"center", gap:2, flex:1, overflowX:"auto" }}>
          {menuItems.map((item, idx) => {
            const active    = isActive(item.to);
            const hasChild  = item.children?.length > 0;
            const isOpen    = openMenu === idx;
            const hoverBg   = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}18`;

            return (
              <div key={item.to} style={{ position:"relative" }}>
                <div
                  onClick={() => {
                    if (hasChild) { setOpenMenu(isOpen ? null : idx); }
                    else { navigate(item.to); setOpenMenu(null); }
                  }}
                  data-navitem={idx}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px",
                    borderRadius:10, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none",
                    color:active?theme.textPrimary:theme.textMuted,
                    background:active?(isGlass?"rgba(255,255,255,0.3)":`${theme.primary}22`):"transparent",
                    border:active?`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`:"1px solid transparent",
                    fontWeight:active?700:400, fontSize:13, transition:"all 0.2s", flexShrink:0 }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=hoverBg; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {hasChild && (
                    <span style={{ fontSize:9, marginLeft:2, opacity:0.7, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
                  )}
                </div>

                {/* Dropdown — fixed abaixo do item, transparente */}
                {hasChild && isOpen && (
                  <DropdownPortal
                    items={item.children}
                    anchorIdx={idx}
                    theme={theme} isGlass={isGlass} border={border}
                    isActive={isActive}
                    onSelect={(to) => { navigate(to); setOpenMenu(null); }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Auto-hide toggle + Logout */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <button onClick={toggleAutoHide}
            title={autoHide ? "Desativar auto-hide" : "Ativar auto-hide"}
            style={{ background:autoHide?`${theme.primary}22`:"transparent",
              border:`1px solid ${autoHide?theme.primary:border}`,
              borderRadius:8, color:autoHide?theme.primary:theme.textMuted,
              padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:600,
              transition:"all 0.2s" }}>
            {autoHide ? "👁 Visível no hover" : "📌 Fixo"}
          </button>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:10, color:"#ef4444", padding:"7px 14px", cursor:"pointer",
              fontWeight:600, fontSize:13 }}>
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Fecha dropdown ao clicar fora */}
      {openMenu !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:199 }} onClick={() => setOpenMenu(null)}/>
      )}

      <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 3 — DOCK arco convexo (ícones projetam para a direita)
// ESTILO 4 — DOCK arco côncavo (ícones ficam recuados, curva para dentro)
// ═══════════════════════════════════════════════════════════════════════════════

function calcArcPositions(n, convex = true) {
  const positions = [];
  const radius    = convex ? 170 : 170;
  const cx        = convex ? -75 : 75;   // convexo: centro fora à esq; côncavo: centro fora à dir
  const angleSpan = 90;

  for (let i = 0; i < n; i++) {
    const angleDeg = n === 1 ? 0 : -angleSpan/2 + (angleSpan * i) / (n - 1);
    const angleRad = (angleDeg * Math.PI) / 180;
    positions.push({
      x: cx + radius * Math.cos(angleRad),
      y: radius * Math.sin(angleRad),
    });
  }
  return positions;
}

function DockBubble({ item, cx, cy, R, active, hovered, theme, isGlass, isLogout, onEnter, onLeave, onClick, convex }) {
  const bgColor = active
    ? theme.primary
    : isLogout && hovered ? "rgba(239,68,68,0.85)"
    : isGlass ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)";

  const borderColor = active ? theme.primary
    : isLogout && hovered ? "rgba(239,68,68,0.6)"
    : isGlass ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.16)";

  const scale  = hovered ? 1.28 : active ? 1.1 : 1;
  const lift   = hovered ? (convex ? -6 : 6) : 0;    // convexo salta para direita, côncavo para esquerda
  const shadow = active
    ? `0 0 0 6px ${theme.primary}30, 0 8px 28px ${theme.primary}55`
    : hovered ? "0 10px 36px rgba(0,0,0,0.45)" : "0 3px 12px rgba(0,0,0,0.25)";

  const tooltipLeft = convex ? R*2 + 14 : "auto";
  const tooltipRight= convex ? "auto"    : R*2 + 14;

  return (
    <div style={{ position:"absolute", left:cx-R, top:cy-R, width:R*2, height:R*2,
      pointerEvents:"all", display:"flex", alignItems:"center" }}
      onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>

      {/* Bolinha */}
      <div style={{ width:R*2, height:R*2, borderRadius:"50%",
        background:bgColor, border:`2.5px solid ${borderColor}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:20, cursor:"pointer",
        transform:`scale(${scale}) translateX(${lift}px)`,
        transition:"all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow:shadow,
        backdropFilter:isGlass?"blur(14px)":undefined,
        WebkitBackdropFilter:isGlass?"blur(14px)":undefined,
        flexShrink:0 }}>
        {isLogout
          ? <span style={{ fontSize:18 }}>🚪</span>
          : <Link to={item.to} style={{ textDecoration:"none", display:"flex", alignItems:"center",
              justifyContent:"center", width:"100%", height:"100%", borderRadius:"50%" }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
            </Link>
        }
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position:"absolute",
          left:tooltipLeft, right:tooltipRight,
          top:"50%", transform:"translateY(-50%)",
          background:isGlass?"rgba(255,255,255,0.95)":"rgba(10,15,30,0.96)",
          color:isLogout?"#ef4444":isGlass?"#1e293b":theme.textPrimary,
          padding:"6px 15px", borderRadius:10, fontSize:14, fontWeight:600,
          whiteSpace:"nowrap", pointerEvents:"none",
          border:`1px solid ${isGlass?"rgba(255,255,255,0.7)":theme.borderCard||"rgba(255,255,255,0.12)"}`,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
          zIndex:300,
          animation:"tooltipIn 0.14s ease",
        }}>
          {item?.label}
          {/* Seta */}
          <div style={{
            position:"absolute",
            [convex?"left":"right"]: -5,
            top:"50%", transform:"translateY(-50%) rotate(45deg)",
            width:8, height:8,
            background:isGlass?"rgba(255,255,255,0.95)":"rgba(10,15,30,0.96)",
            border:`1px solid ${isGlass?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.12)"}`,
            [convex?"borderRight":"borderLeft"]:"none",
            borderTop:"none",
          }}/>
        </div>
      )}
    </div>
  );
}

function SidebarDock({ menuItems, theme, isGlass, convex = true }) {
  const location   = useLocation();
  const isActive   = p => location.pathname === p;
  const navigate   = useNavigate();
  const [hovered, setHovered] = useState(null);

  const R       = 28;   // raio das bolinhas — MAIORES
  const GAP     = 14;   // espaçamento extra entre bolinhas

  const allItems = [...menuItems, { to:"__logout__", icon:"🚪", label:"Sair" }];
  const n        = allItems.length;
  const pos      = calcArcPositions(n, convex);

  const ys    = pos.map(p => p.y);
  const xs    = pos.map(p => p.x);
  const minY  = Math.min(...ys);
  const maxY  = Math.max(...ys);
  const minX  = Math.min(...xs);
  const maxX  = Math.max(...xs);

  // dimensão do container
  const W = maxX - minX + R*2 + 20;
  const H = (maxY - minY) + R*2 + GAP*(n-1) + 20;

  // redistribuir Y com espaçamento mínimo garantido
  const minSpacing  = R*2 + GAP;
  const totalNeeded = minSpacing * (n-1);
  const PAD_V       = R + 16;  // padding vertical extra para não cortar topo/base
  const spreadPositions = pos.map((p, i) => ({
    x: p.x - minX + R + 8,
    y: (i / (n-1)) * totalNeeded + PAD_V,
  }));

  const containerH = totalNeeded + PAD_V * 2;
  const containerW = maxX - minX + R*2 + 60;

  return (
    <div style={{
      position:"fixed",
      left: convex ? 0 : "auto",
      right: convex ? "auto" : 0,
      top:"50%", transform:"translateY(-50%)",
      zIndex:200,
      width:containerW,
      height:containerH,
      pointerEvents:"none",
      overflow:"visible",
    }}>
      {allItems.map((item, i) => {
        const { x, y } = spreadPositions[i];
        const active    = item.to !== "__logout__" && isActive(item.to);
        const isLogout  = item.to === "__logout__";
        const label     = item.label || "Sair";

        return (
          <DockBubble key={item.to}
            item={{ ...item, label }}
            cx={x} cy={y} R={R}
            active={active}
            hovered={hovered === i}
            theme={theme} isGlass={isGlass}
            isLogout={isLogout}
            convex={convex}
            onEnter={() => setHovered(i)}
            onLeave={() => setHovered(null)}
            onClick={() => { if (isLogout) { logoutUser(); navigate("/"); } }}
          />
        );
      })}
      <style>{`
        @keyframes tooltipIn {
          from { opacity:0; transform:translateY(-50%) translateX(${convex?"-6px":"6px"}); }
          to   { opacity:1; transform:translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarMobile({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const backdrop= isGlass?"blur(24px) saturate(160%)":"blur(18px)";
  const border  = isGlass?"rgba(255,255,255,0.4)":theme.borderCard;

  return (
    <>
      <button onClick={() => setOpen(!open)}
        style={{ position:"fixed", top:16, left:16, zIndex:210,
          background:isGlass?"rgba(255,255,255,0.35)":theme.bgSecondary,
          backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
          border:`1px solid ${border}`, borderRadius:10,
          color:theme.textPrimary, fontSize:20, width:44, height:44,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {open?"✕":"☰"}
      </button>
      {open && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:150, backdropFilter:"blur(2px)" }} onClick={() => setOpen(false)}/>}
      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:260,
        background:isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary,
        backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
        borderRight:`1px solid ${border}`, zIndex:160, display:"flex", flexDirection:"column",
        transition:"transform 0.3s ease", transform:open?"translateX(0)":"translateX(-100%)",
        boxShadow:"8px 0 32px rgba(0,0,0,0.5)" }}>
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
                fontSize:15, fontWeight:isActive(item.to)?600:400, transition:"all 0.2s",
                background:isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                border:isActive(item.to)?`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.sidebarBorder}`:"1px solid transparent" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div style={{ padding:12, flexShrink:0 }}>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ width:"100%", padding:"14px 16px",
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:12, color:"#ef4444", fontSize:15, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
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
  const isGlass   = themeId === "glass" || themeId === "gray";
  const isMobile  = window.innerWidth <= 768;
  const menuItems = useMenuItems();

  const [sidebarStyle, setSidebarStyleState] = useState(getSidebarStyle());

  useEffect(() => {
    const handler = () => setSidebarStyleState(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", handler);
    return () => window.removeEventListener("sv_sidebar_style_changed", handler);
  }, []);

  if (isMobile) return <SidebarMobile menuItems={menuItems} theme={theme} isGlass={isGlass}/>;

  if (sidebarStyle === "horizontal")
    return <SidebarHorizontal menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  if (sidebarStyle === "dock")
    return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={true}/>;
  if (sidebarStyle === "dock_concave")
    return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={false}/>;

  return <SidebarVertical menuItems={menuItems} theme={theme} isGlass={isGlass} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>;
}
