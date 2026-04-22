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
    <div ref={ref} className="sv-dropdown" style={{
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
// ESTILO 2 — HORIZONTAL com auto-hide + setas de navegação + dropdown
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarHorizontal({ menuItems, theme, isGlass }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();

  const [autoHide, setAutoHideState] = useState(getAutoHide());
  const [visible,  setVisible]       = useState(true);
  const [openMenu, setOpenMenu]      = useState(null);
  const [canScrollL, setCanScrollL]  = useState(false);
  const [canScrollR, setCanScrollR]  = useState(false);
  const scrollRef  = useRef(null);
  const hideTimer  = useRef(null);

  // Fechar dropdown ao clicar fora sem bloquear a tela
  useEffect(() => {
    if (openMenu === null) return;
    const handler = (e) => {
      if (!e.target.closest("[data-navitem]") && !e.target.closest(".sv-dropdown"))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);
  const barH       = 54;

  // Verificar se pode scrollar
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollL(el.scrollLeft > 4);
    setCanScrollR(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };
  useEffect(() => { checkScroll(); }, [menuItems]);

  const scrollNav = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 160, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  // Auto-hide logic
  useEffect(() => {
    if (autoHide) setVisible(false);
    else setVisible(true);
  }, [autoHide]);

  const showBar  = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const startHide= () => {
    if (!autoHide) return;
    hideTimer.current = setTimeout(() => { setVisible(false); setOpenMenu(null); }, 700);
  };

  const toggleAutoHide = () => {
    const next = !autoHide;
    setAutoHideState(next);
    setAutoHideLS(next);
    if (!next) setVisible(true);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
  };

  const bg      = isGlass ? "rgba(15,20,40,0.75)" : "rgba(12,16,32,0.88)";
  const border  = isGlass ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)";

  return (
    <>
      {/* Zona de trigger — strip no topo */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height: autoHide ? 8 : barH,
        zIndex:201, pointerEvents:"all" }}
        onMouseEnter={showBar} onMouseLeave={startHide}/>

      {/* Barra principal */}
      <div
        onMouseEnter={showBar}
        onMouseLeave={startHide}
        style={{
          position:"fixed", top:0, left:0, right:0, zIndex:200, height:barH,
          background:bg,
          backdropFilter:"blur(28px) saturate(180%)",
          WebkitBackdropFilter:"blur(28px) saturate(180%)",
          borderBottom:`1px solid ${border}`,
          boxShadow:"0 4px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset",
          display:"flex", alignItems:"center", gap:0,
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}>

        {/* Logo */}
        <span style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.92)",
          padding:"0 16px", whiteSpace:"nowrap", letterSpacing:0.5, flexShrink:0 }}>
          SV Finance
        </span>

        {/* Seta esquerda */}
        {canScrollL && (
          <button onClick={() => scrollNav(-1)}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
              fontSize:16, cursor:"pointer", padding:"0 6px", flexShrink:0,
              transition:"color 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.9)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>
            ‹
          </button>
        )}

        {/* Items com scroll oculto */}
        <div ref={scrollRef} onScroll={checkScroll}
          style={{ display:"flex", alignItems:"center", gap:2, flex:1,
            overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}>
          <style>{`.sv-nav::-webkit-scrollbar{display:none}`}</style>
          <div className="sv-nav" style={{ display:"flex", alignItems:"center", gap:2, minWidth:"max-content", padding:"0 4px" }}>
            {menuItems.map((item, idx) => {
              const active   = isActive(item.to);
              const hasChild = item.children?.length > 0;
              const isOpen   = openMenu === idx;

              return (
                <div key={item.to} style={{ position:"relative", flexShrink:0 }}>
                  <div
                    data-navitem={idx}
                    onClick={() => {
                      if (hasChild) { setOpenMenu(isOpen ? null : idx); }
                      else { navigate(item.to); setOpenMenu(null); }
                    }}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
                      borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none",
                      color: active ? "#fff" : "rgba(255,255,255,0.65)",
                      background: active ? `${theme.primary}` : "transparent",
                      fontWeight: active ? 600 : 400, fontSize:13, transition:"all 0.18s", flexShrink:0 }}
                    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}}
                    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}}>
                    <span style={{ fontSize:15 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {hasChild && (
                      <span style={{ fontSize:8, opacity:0.6, marginLeft:1,
                        transform:isOpen?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s" }}>▼</span>
                    )}
                  </div>

                  {/* Dropdown via portal */}
                  {hasChild && isOpen && (
                    <DropdownPortal
                      items={item.children} anchorIdx={idx}
                      theme={theme} isGlass={isGlass} border={border}
                      isActive={isActive}
                      onSelect={(to) => { navigate(to); setOpenMenu(null); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Seta direita */}
        {canScrollR && (
          <button onClick={() => scrollNav(1)}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
              fontSize:16, cursor:"pointer", padding:"0 6px", flexShrink:0,
              transition:"color 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.9)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>
            ›
          </button>
        )}

        {/* Auto-hide toggle + Logout */}
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 12px", flexShrink:0 }}>
          <button onClick={toggleAutoHide}
            title={autoHide ? "Fixar barra" : "Esconder no hover"}
            style={{ background:"transparent", border:"none",
              color: autoHide ? theme.primary : "rgba(255,255,255,0.4)",
              fontSize:16, cursor:"pointer", padding:"4px 6px",
              transition:"all 0.2s", borderRadius:6 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {autoHide ? "📌" : "👁"}
          </button>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:8, color:"#f87171", padding:"5px 12px", cursor:"pointer",
              fontWeight:600, fontSize:12, transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(239,68,68,0.25)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="rgba(239,68,68,0.15)"; }}>
            Sair
          </button>
        </div>
      </div>



      <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-10px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 3 e 4 — DOCK com hamburguer e animação
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarDock({ menuItems, theme, isGlass, convex = true }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [vh,      setVh]      = useState(window.innerHeight);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const R           = 26;
  const GAP         = 10;
  const MIN_SPACING = R * 2 + GAP;
  const allItems    = [...menuItems, { to:"__logout__", icon:"🚪", label:"Sair" }];
  const n           = allItems.length;
  const totalH      = MIN_SPACING * (n - 1);
  const startY      = (vh - totalH) / 2;

  // Curvatura parabólica
  const getX = (i) => {
    const t     = (i / (n - 1)) * 2 - 1;
    const curve = 1 - t * t;
    return 6 + curve * 48;
  };

  // Posição do hamburguer — canto inferior esquerdo (convexo) ou direito (côncavo)
  const hamSize = 40;
  const hamBottom = 24;
  const hamSide   = 16;

  return (
    <>
      {/* Overlay para fechar ao clicar fora — só ativo quando aberto */}
      <div style={{ position:"fixed", inset:0, zIndex:198,
        pointerEvents: open ? "all" : "none" }}
        onClick={() => setOpen(false)}/>

      {/* Botão hamburguer */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          position:"fixed",
          left:  convex ? hamSide : "auto",
          right: convex ? "auto"  : hamSide,
          bottom: hamBottom,
          zIndex:210,
          width: hamSize, height: hamSize,
          borderRadius:"50%",
          background: open
            ? theme.primary
            : isGlass ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
          border:`2px solid ${open ? theme.primary : isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`,
          backdropFilter:"blur(14px)",
          WebkitBackdropFilter:"blur(14px)",
          boxShadow: open
            ? `0 0 0 5px ${theme.primary}30, 0 8px 28px ${theme.primary}55`
            : "0 4px 20px rgba(0,0,0,0.4)",
          cursor:"pointer",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap: open ? 0 : 5,
          transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
        {/* 3 traços que viram X */}
        <span style={{
          display:"block", width:18, height:2, borderRadius:2,
          background: open ? "#fff" : isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.7)",
          transform: open ? "rotate(45deg) translate(1px, 1px)" : "none",
          transition:"all 0.3s ease",
          transformOrigin:"center",
        }}/>
        <span style={{
          display:"block", width:18, height:2, borderRadius:2,
          background: open ? "#fff" : isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.7)",
          transform: open ? "scaleX(0)" : "none",
          opacity: open ? 0 : 1,
          transition:"all 0.3s ease",
        }}/>
        <span style={{
          display:"block", width:18, height:2, borderRadius:2,
          background: open ? "#fff" : isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.7)",
          transform: open ? "rotate(-45deg) translate(1px, -1px)" : "none",
          transition:"all 0.3s ease",
          transformOrigin:"center",
        }}/>
      </div>

      {/* Bolinhas do arco */}
      <div style={{
        position:"fixed",
        left:  convex ? 0 : "auto",
        right: convex ? "auto" : 0,
        top:0, bottom:0,
        zIndex:200,
        width: open ? (52 + R*2 + 60) : 0,
        pointerEvents:"none",
        overflow:"visible",
      }}>
        {allItems.map((item, i) => {
          const cy    = startY + i * MIN_SPACING + R;
          const xOff  = getX(i);
          const active= item.to !== "__logout__" && isActive(item.to);
          const isLog = item.to === "__logout__";
          const hov   = hovered === i;

          // Animação de entrada em cascata
          const delay = open
            ? `${i * 35}ms`
            : `${(n - 1 - i) * 25}ms`;
          const translateX = convex
            ? (open ? 0 : -(xOff + R*2))
            : (open ? 0 :  (xOff + R*2));

          const bgColor = active
            ? theme.primary
            : isLog && hov ? "rgba(239,68,68,0.9)"
            : isGlass ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)";

          const borderColor = active ? theme.primary
            : isLog && hov ? "rgba(239,68,68,0.7)"
            : isGlass ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)";

          const scale = hov ? 1.28 : active ? 1.1 : 1;
          const pushX = hov ? (convex ? 8 : -8) : 0;

          return (
            <div
              key={item.to}
              style={{
                position:"absolute",
                left:  convex ? xOff : "auto",
                right: convex ? "auto" : xOff,
                top:   cy - R,
                width: R*2, height: R*2,
                pointerEvents: open ? "all" : "none",
                transform:`translateX(${translateX}px)`,
                opacity: open ? 1 : 0,
                transition: `transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${delay}, opacity 0.28s ease ${delay}`,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { if (isLog) { logoutUser(); navigate("/"); } }}
            >
              {/* Bolinha */}
              <div style={{
                width:R*2, height:R*2, borderRadius:"50%",
                background:bgColor,
                border:`2.5px solid ${borderColor}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:17, cursor:"pointer",
                transform:`scale(${scale}) translateX(${pushX}px)`,
                transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.2s",
                boxShadow: active
                  ? `0 0 0 5px ${theme.primary}35, 0 6px 24px ${theme.primary}55`
                  : hov ? "0 8px 28px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.3)",
                backdropFilter:isGlass?"blur(14px)":undefined,
                WebkitBackdropFilter:isGlass?"blur(14px)":undefined,
              }}>
                {isLog
                  ? <span style={{ fontSize:16 }}>🚪</span>
                  : <Link to={item.to} onClick={() => setOpen(false)}
                      style={{ textDecoration:"none", display:"flex", alignItems:"center",
                        justifyContent:"center", width:"100%", height:"100%", borderRadius:"50%" }}>
                      <span style={{ fontSize:16 }}>{item.icon}</span>
                    </Link>
                }
              </div>

              {/* Tooltip */}
              {hov && open && (
                <div style={{
                  position:"absolute",
                  left:  convex ? R*2+10 : "auto",
                  right: convex ? "auto" : R*2+10,
                  top:"50%", transform:"translateY(-50%)",
                  background:"rgba(10,15,30,0.95)",
                  color:isLog?"#f87171":"rgba(255,255,255,0.92)",
                  padding:"5px 13px", borderRadius:9,
                  fontSize:13, fontWeight:600, whiteSpace:"nowrap",
                  pointerEvents:"none",
                  border:"1px solid rgba(255,255,255,0.1)",
                  boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
                  zIndex:300,
                  animation:"tipIn 0.14s ease",
                }}>
                  {item.label}
                  <div style={{
                    position:"absolute",
                    [convex?"left":"right"]:-4,
                    top:"50%", transform:"translateY(-50%) rotate(45deg)",
                    width:7, height:7,
                    background:"rgba(10,15,30,0.95)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    [convex?"borderRight":"borderLeft"]:"none",
                    borderTop:"none",
                  }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes tipIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
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