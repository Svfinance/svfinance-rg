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
    { to:"/transactions", icon:"💰", label:"Transações",        roles:["admin","financial"] },
    { to:"/bills",        icon:"📄", label:"Contas",            roles:["admin","financial"] },
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

// ═══════════════════════════════════════════════════════
// ESTILO 1 — VERTICAL (retrátil no hover)
// ═══════════════════════════════════════════════════════
function SidebarVertical({ menuItems, theme, isGlass, sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const bg      = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg;
  const backdrop= isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const border  = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;

  return (
    <div
      style={{ height:"100vh", position:"sticky", top:0,
        background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
        borderRight:`1px solid ${border}`,
        boxShadow:isGlass?"4px 0 24px rgba(0,0,0,0.1)":"4px 0 24px rgba(0,0,0,0.4)",
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
          const active  = isActive(item.to);
          const activeBg= isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive;
          const hoverBg = isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`;
          return (
            <div key={item.to}
              style={{ padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s", marginBottom:6,
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
          <span style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>🚪</span>
            <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:"#ef4444", fontWeight:500 }}>Sair</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ESTILO 2 — HORIZONTAL com auto-hide e setas
// ═══════════════════════════════════════════════════════
function SidebarHorizontal({ menuItems, theme, isGlass }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();
  const [autoHide, setAutoHideState] = useState(getAutoHide());
  const [visible,  setVisible]       = useState(!getAutoHide());
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const scrollRef = useRef(null);
  const hideTimer = useRef(null);
  const barH = 54;

  // Avisar o conteúdo que precisa de paddingTop
  useEffect(() => {
    document.body.style.setProperty("--sv-topbar-height", visible ? `${barH}px` : "0px");
    return () => document.body.style.removeProperty("--sv-topbar-height");
  }, [visible, barH]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => { setTimeout(checkScroll, 100); }, [menuItems]);

  const showBar  = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const startHide= () => {
    if (!autoHide) return;
    hideTimer.current = setTimeout(() => setVisible(false), 800);
  };

  const toggleAH = () => {
    const next = !autoHide;
    setAutoHideState(next);
    setAutoHideLS(next);
    setVisible(!next);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
  };

  const scrollNav = (dir) => {
    scrollRef.current?.scrollBy({ left: dir*160, behavior:"smooth" });
    setTimeout(checkScroll, 350);
  };

  const bg     = "rgba(12,16,32,0.90)";
  const border = "rgba(255,255,255,0.08)";

  return (
    <>
      {/* Zona trigger topo — só ativa no auto-hide quando barra escondida */}
      {autoHide && !visible && (
        <div style={{ position:"fixed", top:0, left:0, right:0, height:8, zIndex:201, pointerEvents:"all" }}
          onMouseEnter={showBar}/>
      )}

      {/* Barra */}
      <div
        onMouseEnter={showBar}
        onMouseLeave={startHide}
        style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:barH,
          background:bg,
          backdropFilter:"blur(28px) saturate(180%)",
          WebkitBackdropFilter:"blur(28px) saturate(180%)",
          borderBottom:`1px solid ${border}`,
          boxShadow:"0 4px 32px rgba(0,0,0,0.4)",
          display:"flex", alignItems:"center",
          transform:visible?"translateY(0)":"translateY(-100%)",
          transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: visible ? "all" : "none",
        }}>

        <span style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.92)",
          padding:"0 16px", whiteSpace:"nowrap", letterSpacing:0.5, flexShrink:0 }}>
          SV Finance
        </span>

        {canL && (
          <button onClick={() => scrollNav(-1)}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
              fontSize:20, cursor:"pointer", padding:"0 4px", flexShrink:0, lineHeight:1 }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>‹</button>
        )}

        <div ref={scrollRef} onScroll={checkScroll}
          style={{ display:"flex", alignItems:"center", flex:1,
            overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}>
          <style>{`.__svnav::-webkit-scrollbar{display:none}`}</style>
          <div className="__svnav" style={{ display:"flex", alignItems:"center", gap:2,
            minWidth:"max-content", padding:"0 4px" }}>
            {menuItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
                    borderRadius:8, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0,
                    color: active?"#fff":"rgba(255,255,255,0.65)",
                    background: active ? theme.primary : "transparent",
                    fontWeight: active?600:400, fontSize:13, transition:"all 0.18s" }}
                  onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}}
                  onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}}>
                  <span style={{ fontSize:15 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {canR && (
          <button onClick={() => scrollNav(1)}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
              fontSize:20, cursor:"pointer", padding:"0 4px", flexShrink:0, lineHeight:1 }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>›</button>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 12px", flexShrink:0 }}>
          <button onClick={toggleAH}
            title={autoHide?"Fixar barra":"Auto-hide no hover"}
            style={{ background:"transparent", border:"none",
              color:autoHide?theme.primary:"rgba(255,255,255,0.4)",
              fontSize:16, cursor:"pointer", padding:"4px 6px", borderRadius:6 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {autoHide?"📌":"👁"}
          </button>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:8, color:"#f87171", padding:"5px 12px", cursor:"pointer",
              fontWeight:600, fontSize:12, transition:"all 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.28)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"}>
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// ESTILO 3/4 — DOCK com hamburguer
// ═══════════════════════════════════════════════════════
function SidebarDock({ menuItems, theme, isGlass, convex = true }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [vh,      setVh]      = useState(window.innerHeight);

  useEffect(() => {
    const fn = () => setVh(window.innerHeight);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const R           = 26;
  const GAP         = 10;
  const SPACING     = R*2 + GAP;
  const allItems    = [...menuItems, { to:"__logout__", icon:"🚪", label:"Sair" }];
  const n           = allItems.length;
  const totalH      = SPACING * (n-1);
  const startY      = Math.max(R+8, (vh - totalH) / 2);

  const getXOffset = (i) => {
    const t     = n===1 ? 0 : (i/(n-1))*2 - 1;
    const curve = 1 - t*t;
    return 6 + curve*48;
  };

  const hamSize = 42;
  const HAM_KEY = `sv_dock_ham_${convex?"conv":"conc"}`;

  // Posição do hamburguer — começa no centro vertical
  const getInitialPos = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(HAM_KEY));
      if (saved) return saved;
    } catch {}
    return {
      x: convex ? 14 : window.innerWidth - 14 - hamSize,
      y: Math.round(window.innerHeight / 2 - hamSize / 2),
    };
  };

  const [hamPos, setHamPos] = useState(getInitialPos);
  const dragging  = useRef(false);
  const dragStart = useRef({ mx:0, my:0, bx:0, by:0 });
  const hamRef    = useRef(null);
  const didDrag   = useRef(false);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current  = true;
    didDrag.current   = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, bx: hamPos.x, by: hamPos.y };

    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth  - hamSize, dragStart.current.bx + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - hamSize, dragStart.current.by + dy));
      setHamPos({ x: newX, y: newY });
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      // Salvar posição
      setHamPos(p => {
        localStorage.setItem(HAM_KEY, JSON.stringify(p));
        return p;
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  };

  // Touch support
  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragging.current  = true;
    didDrag.current   = false;
    dragStart.current = { mx: t.clientX, my: t.clientY, bx: hamPos.x, by: hamPos.y };

    const onMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mx;
      const dy = t.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth  - hamSize, dragStart.current.bx + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - hamSize, dragStart.current.by + dy));
      setHamPos({ x: newX, y: newY });
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend",  onUp);
      setHamPos(p => {
        localStorage.setItem(HAM_KEY, JSON.stringify(p));
        return p;
      });
    };

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend",  onUp);
  };

  return (
    <>
      {/* Hamburguer arrastável */}
      <div
        ref={hamRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => { if (!didDrag.current) setOpen(o => !o); }}
        style={{
          position:"fixed",
          left: hamPos.x,
          top:  hamPos.y,
          zIndex:300,
          width:hamSize, height:hamSize, borderRadius:"50%",
          background: open ? theme.primary : isGlass?"rgba(255,255,255,0.18)":"rgba(30,35,55,0.92)",
          border:`2px solid ${open?theme.primary:isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.18)"}`,
          backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
          boxShadow: open
            ? `0 0 0 5px ${theme.primary}30, 0 8px 28px ${theme.primary}55`
            : "0 4px 20px rgba(0,0,0,0.5)",
          cursor: dragging.current ? "grabbing" : "grab",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:0,
          transition: dragging.current ? "none" : "background 0.3s, border 0.3s, box-shadow 0.3s",
          pointerEvents:"all",
          userSelect:"none",
        }}>
        <span style={{ display:"block", width:18, height:2, borderRadius:2, marginBottom: open?0:5,
          background:"rgba(255,255,255,0.85)",
          transform:open?"rotate(45deg) translate(0px, 2px)":"none",
          transition:"all 0.3s ease" }}/>
        <span style={{ display:"block", width:18, height:2, borderRadius:2, marginBottom: open?0:5,
          background:"rgba(255,255,255,0.85)",
          opacity:open?0:1, transform:open?"scaleX(0)":"none",
          transition:"all 0.25s ease" }}/>
        <span style={{ display:"block", width:18, height:2, borderRadius:2,
          background:"rgba(255,255,255,0.85)",
          transform:open?"rotate(-45deg) translate(0px, -2px)":"none",
          transition:"all 0.3s ease" }}/>
      </div>

      {/* Bolinhas — adaptam direção e posição ao local do hamburguer */}
      {allItems.map((item, i) => {
        const hamCX = hamPos.x + hamSize/2;
        const hamCY = hamPos.y + hamSize/2;

        // Quadrante da tela onde está o hamburguer
        const isRight  = hamCX > window.innerWidth  * 0.5;
        const isBottom = hamCY > window.innerHeight * 0.6;
        const isTop    = hamCY < window.innerHeight * 0.4;
        const isMid    = !isTop && !isBottom;

        // Índice de abertura: se no topo abre para baixo, se na base abre para cima
        const orderedI = isBottom ? (n - 1 - i) : i;

        // Posição Y: adapta ponto de ancoragem
        let cy;
        if (isTop) {
          // Ancora no topo do hamburguer, abre para baixo
          cy = hamPos.y + hamSize + 8 + i * SPACING;
        } else if (isBottom) {
          // Ancora na base do hamburguer, abre para cima
          cy = hamPos.y - 8 - (i + 1) * SPACING;
        } else {
          // Meio da tela: centraliza verticalmente no hamburguer
          cy = hamCY - (totalH / 2) + i * SPACING;
        }

        // Curvatura X: se no meio aplica parábola, senão fica mais reto
        const t     = n === 1 ? 0 : (i / (n-1)) * 2 - 1;
        const curve = isMid ? (1 - t*t) : (isTop ? (i/(n-1)) * 0.6 : ((n-1-i)/(n-1)) * 0.6);
        const xOff  = 6 + curve * 48;

        // Posição X: esquerda ou direita do hamburguer
        const bubbleX = isRight
          ? hamPos.x - xOff - R*2
          : hamPos.x + hamSize + xOff - R;

        // Slide de entrada: sai da direção do hamburguer
        const slideX = isRight
          ? (open ? 0 :  (xOff + R*2 + 20))
          : (open ? 0 : -(xOff + R*2 + 20));

        // Tooltip: aparece no lado oposto ao arco
        const tipLeft  = isRight ? "auto" : R*2 + 10;
        const tipRight = isRight ? R*2 + 10 : "auto";
        // Push de hover: empurra no sentido do arco
        const pushX = hovered === i ? (isRight ? -8 : 8) : 0;

        const active = item.to !== "__logout__" && isActive(item.to);
        const isLog  = item.to === "__logout__";
        const hov    = hovered === i;
        const delay  = open ? `${orderedI*40}ms` : `${(n-1-orderedI)*25}ms`;

        return (
          <div key={item.to} style={{
            position:"fixed",
            left:  bubbleX,
            top:   cy,
            width: R*2, height: R*2,
            zIndex: 200,
            pointerEvents: open ? "all" : "none",
            transform:`translateX(${slideX}px)`,
            opacity: open ? 1 : 0,
            transition:`transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${delay}, opacity 0.25s ease ${delay}`,
          }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (isLog) { logoutUser(); navigate("/"); }
              else setOpen(false);
            }}>

            {/* Bolinha */}
            <div style={{
              width:R*2, height:R*2, borderRadius:"50%",
              background: active ? theme.primary
                : isLog&&hov ? "rgba(239,68,68,0.9)"
                : isGlass?"rgba(255,255,255,0.2)":"rgba(30,35,55,0.92)",
              border:`2.5px solid ${active?theme.primary:isLog&&hov?"rgba(239,68,68,0.7)":isGlass?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.18)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:17, cursor:"pointer",
              transform:`scale(${hov?1.28:active?1.1:1}) translateX(${pushX}px)`,
              transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
              boxShadow: active
                ? `0 0 0 5px ${theme.primary}35, 0 6px 24px ${theme.primary}55`
                : hov?"0 8px 28px rgba(0,0,0,0.5)":"0 2px 10px rgba(0,0,0,0.3)",
              backdropFilter:isGlass?"blur(14px)":undefined,
              WebkitBackdropFilter:isGlass?"blur(14px)":undefined,
            }}>
              {isLog
                ? <span>🚪</span>
                : <Link to={item.to} style={{ textDecoration:"none", display:"flex",
                    alignItems:"center", justifyContent:"center",
                    width:"100%", height:"100%", borderRadius:"50%" }}>
                    <span>{item.icon}</span>
                  </Link>
              }
            </div>

            {/* Tooltip */}
            {hov && (
              <div style={{
                position:"absolute",
                left:  tipLeft,
                right: tipRight,
                top:"50%", transform:"translateY(-50%)",
                background:"rgba(10,15,30,0.95)",
                color:isLog?"#f87171":"rgba(255,255,255,0.92)",
                padding:"5px 13px", borderRadius:9,
                fontSize:13, fontWeight:600, whiteSpace:"nowrap",
                pointerEvents:"none",
                border:"1px solid rgba(255,255,255,0.1)",
                boxShadow:"0 4px 20px rgba(0,0,0,0.4)", zIndex:400,
              }}>
                {item.label}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MOBILE — com seletor de estilo
// ═══════════════════════════════════════════════════════
const MOBILE_STYLES = [
  { id:"slide_left",  label:"◀ Lateral Esquerda", desc:"Desliza da esquerda" },
  { id:"slide_right", label:"Lateral Direita ▶",  desc:"Desliza da direita" },
  { id:"slide_bottom",label:"▲ Bottom Sheet",      desc:"Sobe da base" },
  { id:"slide_top",   label:"▼ Top Sheet",         desc:"Desce do topo" },
];

function SidebarMobile({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const [open,       setOpen]       = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [mobileStyle, setMobileStyleState] = useState(
    localStorage.getItem("sv_mobile_style") || "slide_left"
  );

  const setMobileStyle = (s) => {
    setMobileStyleState(s);
    localStorage.setItem("sv_mobile_style", s);
    setShowStyles(false);
  };

  const backdrop = isGlass?"blur(24px)":"blur(18px)";
  const border   = isGlass?"rgba(255,255,255,0.4)":theme.borderCard;

  // Dimensões e transform por estilo
  const panelStyle = () => {
    const base = {
      position:"fixed", zIndex:160,
      background:isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary,
      backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      display:"flex", flexDirection:"column",
      transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)",
      boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
    };
    switch(mobileStyle) {
      case "slide_right":
        return { ...base, top:0, right:0, bottom:0, width:280,
          borderLeft:`1px solid ${border}`,
          transform:open?"translateX(0)":"translateX(100%)" };
      case "slide_bottom":
        return { ...base, left:0, right:0, bottom:0, height:"75vh",
          borderTop:`1px solid ${border}`, borderRadius:"20px 20px 0 0",
          transform:open?"translateY(0)":"translateY(100%)" };
      case "slide_top":
        return { ...base, left:0, right:0, top:0, height:"75vh",
          borderBottom:`1px solid ${border}`, borderRadius:"0 0 20px 20px",
          transform:open?"translateY(0)":"translateY(-100%)" };
      default: // slide_left
        return { ...base, top:0, left:0, bottom:0, width:280,
          borderRight:`1px solid ${border}`,
          transform:open?"translateX(0)":"translateX(-100%)" };
    }
  };

  // Posição do botão hamburguer por estilo
  const hamBtnStyle = () => {
    const base = { position:"fixed", zIndex:300,
      background:isGlass?"rgba(255,255,255,0.35)":theme.bgSecondary,
      backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      border:`1px solid ${border}`, borderRadius:12,
      color:theme.textPrimary, fontSize:22, width:46, height:46,
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 4px 16px rgba(0,0,0,0.4)" };
    switch(mobileStyle) {
      case "slide_right":  return { ...base, top:16, right:16 };
      case "slide_bottom": return { ...base, bottom:20, left:"50%", transform:"translateX(-50%)", borderRadius:"50%" };
      case "slide_top":    return { ...base, top:16, left:"50%", transform:"translateX(-50%)", borderRadius:"50%" };
      default:             return { ...base, top:16, left:16 };
    }
  };

  return (
    <>
      {/* Botão hamburguer */}
      <button onClick={() => setOpen(!open)} style={hamBtnStyle()}>
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay */}
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          zIndex:150, backdropFilter:"blur(2px)" }}
          onClick={() => setOpen(false)}/>
      )}

      {/* Painel */}
      <div style={panelStyle()}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 20px 14px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
          <span style={{ fontSize:17, fontWeight:700, color:theme.textPrimary, letterSpacing:1 }}>SV Finance</span>
          <div style={{ display:"flex", gap:8 }}>
            {/* Botão mudar estilo */}
            <button onClick={() => setShowStyles(s=>!s)}
              title="Mudar estilo do menu"
              style={{ background:showStyles?`${theme.primary}22`:"transparent",
                border:`1px solid ${showStyles?theme.primary:border}`,
                color:showStyles?theme.primary:theme.textMuted,
                borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:13 }}>⚙</button>
            <button onClick={() => setOpen(false)}
              style={{ background:`${theme.primary}22`, border:"none", color:theme.textPrimary,
                borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
        </div>

        {/* Seletor de estilos */}
        {showStyles && (
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
            <div style={{ fontSize:11, color:theme.textMuted, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.5px", marginBottom:8 }}>Estilo do menu mobile</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {MOBILE_STYLES.map(s => (
                <div key={s.id} onClick={() => setMobileStyle(s.id)}
                  style={{ padding:"8px 10px", borderRadius:8, cursor:"pointer", transition:"all 0.15s",
                    background:mobileStyle===s.id?`${theme.primary}22`:"transparent",
                    border:`1px solid ${mobileStyle===s.id?theme.primary:border}`,
                    color:mobileStyle===s.id?theme.primary:theme.textMuted,
                    fontSize:12, fontWeight:mobileStyle===s.id?700:400, textAlign:"center" }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ flex:1, padding:"12px 12px", display:"flex", flexDirection:"column", gap:4, overflowY:"auto" }}>
          {menuItems.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px",
                borderRadius:12, textDecoration:"none", color:theme.textPrimary,
                fontSize:15, fontWeight:isActive(item.to)?600:400, transition:"all 0.2s",
                background:isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                border:isActive(item.to)?`1px solid ${border}`:"1px solid transparent" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding:12, flexShrink:0 }}>
          <button onClick={() => { logoutUser(); navigate("/"); }}
            style={{ width:"100%", padding:"13px 16px",
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:12, color:"#ef4444", fontSize:15, fontWeight:600,
              cursor:"pointer", textAlign:"left" }}>
            🚪 Sair
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════
export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { theme, themeId } = useTheme();
  const isGlass   = themeId === "glass" || themeId === "gray";
  const isMobile  = window.innerWidth <= 768;
  const menuItems = useMenuItems();
  const [style, setStyle] = useState(getSidebarStyle());

  useEffect(() => {
    const fn = () => setStyle(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", fn);
    return () => window.removeEventListener("sv_sidebar_style_changed", fn);
  }, []);

  if (isMobile) return <SidebarMobile menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  if (style === "horizontal")    return <SidebarHorizontal menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  if (style === "dock")          return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={true}/>;
  if (style === "dock_concave")  return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={false}/>;
  return <SidebarVertical menuItems={menuItems} theme={theme} isGlass={isGlass} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>;
}