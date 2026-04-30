import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useNicho } from "../../contexts/NichoContext";
import { logoutUser } from "../../services/api";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STYLE_KEY    = "sv_sidebar_style";
const AUTOHIDE_KEY = "sv_sidebar_autohide";

export function getSidebarStyle()    { return localStorage.getItem(STYLE_KEY) || "vertical"; }
export function setSidebarStyleLS(s) { localStorage.setItem(STYLE_KEY, s); }
export function getAutoHide()        { return localStorage.getItem(AUTOHIDE_KEY) === "true"; }
export function setAutoHideLS(v)     { localStorage.setItem(AUTOHIDE_KEY, String(v)); }

// ─── Menu items — com labels dinâmicos por nicho ──────────────────────────────
function useMenuItems() {
  const role        = localStorage.getItem("role")         || "viewer";
  const accountType = localStorage.getItem("account_type") || "business";
  const isPersonal  = accountType === "personal";
  const { label, hasModule } = useNicho();

  const all = isPersonal ? [
    { to:"/dashboard",    icon:"🏠", label:"Dashboard"     },
    { to:"/transactions", icon:"💰", label:"Transações"    },
    { to:"/bills",        icon:"📄", label:"Contas"        },
    { to:"/analytics",   icon:"📊", label:"Analytics"     },
    { to:"/goals",        icon:"🎯", label:"Metas"         },
    { to:"/settings",     icon:"⚙️", label:"Configurações" },
  ] : [
    { to:"/dashboard",     icon:"🏠", label:"Dashboard",                        roles:null,                               module:"dashboard"    },
    { to:"/clients",       icon:"👥", label:label("clients"),                   roles:null,                               module:"clients"      },
    { to:"/transactions",  icon:"💰", label:"Transações",                        roles:["admin","financial"],              module:"transactions", children:[
      { to:"/transactions", label:"Todas as transações" },
      { to:"/bills",        label:"Contas a pagar/receber" },
    ]},
    { to:"/analytics",    icon:"📊", label:"Analytics",                         roles:["admin","financial"],              module:"analytics"    },
    { to:"/reports",       icon:"📈", label:"Relatórios",                        roles:["admin","financial"],              module:"reports"      },
    { to:"/products",      icon:"📦", label:label("products"),                   roles:["admin","financial","stock","seller"], module:"products" },
    { to:"/quotes",        icon:"🧾", label:"Orçamentos",                        roles:null,                               module:"quotes"       },
    { to:"/sales",         icon:"🛒", label:label("sales"),                      roles:null,                               module:"orders"       },
    { to:"/team",          icon:"👤", label:"Equipe",                            roles:["admin"],                          module:"team"         },
    { to:"/commissions",   icon:"💸", label:"Comissões",                         roles:["admin","financial","seller"],     module:"commissions"  },
    { to:"/import-export", icon:"📂", label:"Importar/Exportar",                 roles:["admin","financial"],              module:"import"       },
    { to:"/goals",         icon:"🎯", label:"Metas",                             roles:null,                               module:"goals"        },
    { to:"/settings",      icon:"⚙️", label:"Configurações",                     roles:null,                               module:"settings"     },
  ];

  return all.filter(i => {
    // Filtra por role
    if (i.roles && !i.roles.includes(role)) return false;
    // Filtra por módulo do nicho (se definido)
    if (i.module && !hasModule(i.module)) return false;
    return true;
  });
}

// ─── Dropdown Portal (fixed, sem overflow) ────────────────────────────────────
function DropdownPortal({ items, anchorEl, theme, isGlass, isActive, onSelect }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [anchorEl]);

  if (!pos) return null;

  return (
    <div ref={ref} className="sv-dropdown" style={{
      position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
      background:"rgba(12,18,35,0.97)",
      backdropFilter:"blur(28px) saturate(180%)",
      WebkitBackdropFilter:"blur(28px) saturate(180%)",
      border:"1px solid rgba(255,255,255,0.1)",
      borderRadius:14, minWidth:220,
      boxShadow:"0 16px 48px rgba(0,0,0,0.6)",
      overflow:"hidden",
      animation:"dropIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {items.map((child, ci) => {
        const active = isActive(child.to);
        return (
          <div key={child.to} onClick={() => onSelect(child.to)}
            style={{ padding:"12px 20px", fontSize:13.5, cursor:"pointer",
              color:active?theme.primary:"rgba(255,255,255,0.85)",
              background:active?`${theme.primary}18`:"transparent",
              fontWeight:active?600:400,
              borderBottom:ci<items.length-1?"1px solid rgba(255,255,255,0.07)":"none",
              display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=`${theme.primary}20`; e.currentTarget.style.paddingLeft="28px"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=active?`${theme.primary}18`:"transparent"; e.currentTarget.style.paddingLeft="20px"; }}>
            <span style={{ opacity:0.5, fontSize:11 }}>▸</span>
            {child.label}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 1 — VERTICAL
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarVertical({ menuItems, theme, isGlass, sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const bg      = isGlass?"rgba(255,255,255,0.18)":theme.sidebarBg;
  const backdrop= isGlass?"blur(24px) saturate(160%)":"blur(18px)";
  const border  = isGlass?"rgba(255,255,255,0.4)":theme.borderCard;

  return (
    <div style={{ height:"100vh", position:"sticky", top:0,
      background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      borderRight:`1px solid ${border}`,
      boxShadow:isGlass?"4px 0 24px rgba(0,0,0,0.1)":"4px 0 24px rgba(0,0,0,0.4)",
      padding:"20px 10px 10px", transition:"all 0.3s ease",
      overflow:"hidden", width:sidebarOpen?"220px":"70px",
      display:"flex", flexDirection:"column", zIndex:100 }}
      onMouseEnter={()=>setSidebarOpen(true)}
      onMouseLeave={()=>setSidebarOpen(false)}>

      <div style={{ flexShrink:0, marginBottom:20, opacity:sidebarOpen?1:0, transition:"0.3s" }}>
        <h2 style={{ whiteSpace:"nowrap", margin:0, fontWeight:600, letterSpacing:1, color:theme.textPrimary }}>SV Finance</h2>
      </div>

      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
        {menuItems.map(item => {
          const active  = isActive(item.to);
          const activeBg= isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive;
          return (
            <div key={item.to} style={{ padding:12, cursor:"pointer", borderRadius:10,
              transition:"all 0.2s", marginBottom:6,
              background:active?activeBg:"transparent",
              border:active?`1px solid ${isGlass?"rgba(255,255,255,0.55)":theme.sidebarBorder}`:"1px solid transparent" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
              <Link to={item.to} style={{ textDecoration:"none", color:theme.textPrimary,
                display:"flex", alignItems:"center", gap:12, width:"100%" }}>
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
          onClick={()=>{ logoutUser(); navigate("/"); }}>
          <span style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>🚪</span>
            <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", color:"#ef4444", fontWeight:500 }}>Sair</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 2 — HORIZONTAL com auto-hide, setas e dropdown
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarHorizontal({ menuItems, theme, isGlass }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();
  const [autoHide, setAutoHideState] = useState(getAutoHide());
  const [visible,  setVisible]       = useState(!getAutoHide());
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const [openIdx,  setOpenIdx]  = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const scrollRef = useRef(null);
  const hideTimer = useRef(null);
  const barH = 54;

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => { setTimeout(checkScroll, 100); }, [menuItems]);

  useEffect(() => {
    if (openIdx === null) return;
    const fn = (e) => {
      if (!e.target.closest("[data-navitem]") && !e.target.closest(".sv-dropdown"))
        setOpenIdx(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [openIdx]);

  const showBar   = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const startHide = () => {
    if (!autoHide) return;
    hideTimer.current = setTimeout(() => { setVisible(false); setOpenIdx(null); }, 800);
  };

  const toggleAH = () => {
    const next = !autoHide;
    setAutoHideState(next); setAutoHideLS(next); setVisible(!next);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
  };

  const scrollNav = (dir) => {
    scrollRef.current?.scrollBy({ left:dir*160, behavior:"smooth" });
    setTimeout(checkScroll, 350);
  };

  const handleItemClick = (item, idx, el) => {
    if (item.children?.length) {
      setOpenIdx(openIdx===idx ? null : idx);
      setAnchorEl(el);
    } else {
      navigate(item.to);
      setOpenIdx(null);
    }
  };

  const bg     = "rgba(12,16,32,0.90)";
  const border = "rgba(255,255,255,0.08)";

  return (
    <>
      {autoHide && !visible && (
        <div style={{ position:"fixed", top:0, left:0, right:0, height:8, zIndex:201, pointerEvents:"all" }}
          onMouseEnter={showBar}/>
      )}

      <div onMouseEnter={showBar} onMouseLeave={startHide}
        style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:barH,
          background:bg,
          backdropFilter:"blur(28px) saturate(180%)",
          WebkitBackdropFilter:"blur(28px) saturate(180%)",
          borderBottom:`1px solid ${border}`,
          boxShadow:"0 4px 32px rgba(0,0,0,0.4)",
          display:"flex", alignItems:"center",
          transform:visible?"translateY(0)":"translateY(-100%)",
          transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents:visible?"all":"none",
        }}>

        <span style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.92)",
          padding:"0 16px", whiteSpace:"nowrap", letterSpacing:0.5, flexShrink:0 }}>
          SV Finance
        </span>

        {canL && (
          <button onClick={()=>scrollNav(-1)} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,0.5)", fontSize:20, cursor:"pointer", padding:"0 4px", flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>‹</button>
        )}

        <div ref={scrollRef} onScroll={checkScroll}
          style={{ display:"flex", alignItems:"center", flex:1,
            overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}>
          <style>{`.__svnav::-webkit-scrollbar{display:none}`}</style>
          <div className="__svnav" style={{ display:"flex", alignItems:"center", gap:2,
            minWidth:"max-content", padding:"0 4px" }}>
            {menuItems.map((item, idx) => {
              const active    = isActive(item.to);
              const hasChild  = item.children?.length > 0;
              const isOpen    = openIdx === idx;
              return (
                <div key={item.to} style={{ position:"relative", flexShrink:0 }}>
                  <div data-navitem={idx}
                    onClick={e => handleItemClick(item, idx, e.currentTarget)}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
                      borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none",
                      color:active?"#fff":"rgba(255,255,255,0.65)",
                      background:active?theme.primary:"transparent",
                      fontWeight:active?600:400, fontSize:13, transition:"all 0.18s" }}
                    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}}
                    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}}>
                    <span style={{ fontSize:15 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {hasChild && (
                      <span style={{ fontSize:8, opacity:0.6, marginLeft:1,
                        transform:isOpen?"rotate(180deg)":"rotate(0)",
                        transition:"transform 0.2s", display:"inline-block" }}>▼</span>
                    )}
                  </div>
                  {hasChild && isOpen && anchorEl && (
                    <DropdownPortal items={item.children} anchorEl={anchorEl}
                      theme={theme} isGlass={isGlass}
                      isActive={isActive}
                      onSelect={to=>{ navigate(to); setOpenIdx(null); }}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {canR && (
          <button onClick={()=>scrollNav(1)} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,0.5)", fontSize:20, cursor:"pointer", padding:"0 4px", flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>›</button>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 12px", flexShrink:0 }}>
          <button onClick={toggleAH} title={autoHide?"Fixar barra":"Auto-hide"}
            style={{ background:"transparent", border:"none",
              color:autoHide?theme.primary:"rgba(255,255,255,0.4)",
              fontSize:16, cursor:"pointer", padding:"4px 6px", borderRadius:6 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {autoHide?"📌":"👁"}
          </button>
          <button onClick={()=>{ logoutUser(); navigate("/"); }}
            style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:8, color:"#f87171", padding:"5px 12px", cursor:"pointer",
              fontWeight:600, fontSize:12 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.28)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"}>
            Sair
          </button>
        </div>
      </div>
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-10px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILO 3/4 — DOCK arrastável com arco adaptativo
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarDock({ menuItems, theme, isGlass, convex=true }) {
  const location  = useLocation();
  const isActive  = p => location.pathname === p;
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [vh,      setVh]      = useState(window.innerHeight);
  const dragging  = useRef(false);
  const dragStart = useRef({});
  const didDrag   = useRef(false);
  const HAM_KEY   = `sv_dock_ham_${convex?"conv":"conc"}`;

  useEffect(() => {
    const fn = () => setVh(window.innerHeight);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const getInitialPos = () => {
    try { const s=JSON.parse(localStorage.getItem(HAM_KEY)); if(s) return s; } catch{}
    return { x: convex?14:window.innerWidth-56, y:Math.round(window.innerHeight/2-21) };
  };
  const [hamPos, setHamPos] = useState(getInitialPos);
  const hamSize = 42;

  const startDrag = (clientX, clientY) => {
    dragging.current=true; didDrag.current=false;
    dragStart.current={ mx:clientX, my:clientY, bx:hamPos.x, by:hamPos.y };
  };
  const moveDrag = (clientX, clientY) => {
    if(!dragging.current) return;
    const dx=clientX-dragStart.current.mx, dy=clientY-dragStart.current.my;
    if(Math.abs(dx)>3||Math.abs(dy)>3) didDrag.current=true;
    setHamPos({
      x:Math.max(0,Math.min(window.innerWidth-hamSize,dragStart.current.bx+dx)),
      y:Math.max(0,Math.min(window.innerHeight-hamSize,dragStart.current.by+dy)),
    });
  };
  const endDrag = () => {
    dragging.current=false;
    setHamPos(p=>{ localStorage.setItem(HAM_KEY,JSON.stringify(p)); return p; });
  };

  const onMouseDown = (e) => {
    e.preventDefault(); startDrag(e.clientX,e.clientY);
    const mv=e=>moveDrag(e.clientX,e.clientY);
    const up=()=>{ endDrag(); document.removeEventListener("mousemove",mv); document.removeEventListener("mouseup",up); };
    document.addEventListener("mousemove",mv); document.addEventListener("mouseup",up);
  };
  const onTouchStart = (e) => {
    const t=e.touches[0]; startDrag(t.clientX,t.clientY);
    const mv=e=>{ const t=e.touches[0]; moveDrag(t.clientX,t.clientY); };
    const up=()=>{ endDrag(); document.removeEventListener("touchmove",mv); document.removeEventListener("touchend",up); };
    document.addEventListener("touchmove",mv,{passive:false}); document.addEventListener("touchend",up);
  };

  const R=26, GAP=10, SPACING=R*2+GAP;
  const allItems=[...menuItems,{to:"__logout__",icon:"🚪",label:"Sair"}];
  const n=allItems.length;
  const totalH=SPACING*(n-1);

  const hamCX=hamPos.x+hamSize/2;
  const hamCY=hamPos.y+hamSize/2;
  const isRight  = hamCX > window.innerWidth*0.5;
  const isTopZ   = hamCY < vh*0.4;
  const isBottomZ= hamCY > vh*0.6;
  const isMidZ   = !isTopZ && !isBottomZ;

  return (
    <>
      <div onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        onClick={()=>{ if(!didDrag.current) setOpen(o=>!o); }}
        style={{ position:"fixed", left:hamPos.x, top:hamPos.y, zIndex:300,
          width:hamSize, height:hamSize, borderRadius:"50%",
          background:open?theme.primary:isGlass?"rgba(255,255,255,0.18)":"rgba(30,35,55,0.92)",
          border:`2px solid ${open?theme.primary:isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.18)"}`,
          backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
          boxShadow:open?`0 0 0 5px ${theme.primary}30,0 8px 28px ${theme.primary}55`:"0 4px 20px rgba(0,0,0,0.5)",
          cursor:dragging.current?"grabbing":"grab",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          transition:dragging.current?"none":"background 0.3s,border 0.3s,box-shadow 0.3s",
          pointerEvents:"all", userSelect:"none", gap:0 }}>
        <span style={{ display:"block",width:18,height:2,borderRadius:2,background:"rgba(255,255,255,0.85)",marginBottom:open?0:5,
          transform:open?"rotate(45deg) translate(0,2px)":"none",transition:"all 0.3s ease" }}/>
        <span style={{ display:"block",width:18,height:2,borderRadius:2,background:"rgba(255,255,255,0.85)",marginBottom:open?0:5,
          opacity:open?0:1,transition:"all 0.25s ease" }}/>
        <span style={{ display:"block",width:18,height:2,borderRadius:2,background:"rgba(255,255,255,0.85)",
          transform:open?"rotate(-45deg) translate(0,-2px)":"none",transition:"all 0.3s ease" }}/>
      </div>

      {allItems.map((item,i)=>{
        let cy;
        const orderedI = isBottomZ ? n-1-i : i;
        if(isTopZ)         cy = hamPos.y+hamSize+8+i*SPACING;
        else if(isBottomZ) cy = hamPos.y-8-(i+1)*SPACING;
        else               cy = hamCY-(totalH/2)+i*SPACING;

        const t     = n===1?0:(i/(n-1))*2-1;
        const curve = isMidZ?(1-t*t):(isTopZ?(i/(n-1))*0.6:((n-1-i)/(n-1))*0.6);
        const xOff  = 6+curve*48;
        const bubbleX= isRight ? hamPos.x-xOff-R*2 : hamPos.x+hamSize+xOff-R;

        const slideX = isRight?(open?0:xOff+R*2+20):(open?0:-(xOff+R*2+20));
        const delay  = open?`${orderedI*40}ms`:`${(n-1-orderedI)*25}ms`;

        const active = item.to!=="__logout__"&&isActive(item.to);
        const isLog  = item.to==="__logout__";
        const hov    = hovered===i;
        const pushX  = hov?(isRight?-8:8):0;

        return (
          <div key={item.to} style={{ position:"fixed", left:bubbleX, top:cy,
            width:R*2, height:R*2, zIndex:200,
            pointerEvents:open?"all":"none",
            transform:`translateX(${slideX}px)`,
            opacity:open?1:0,
            transition:`transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${delay},opacity 0.25s ease ${delay}` }}
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
            onClick={()=>{ if(isLog){logoutUser();navigate("/");} else setOpen(false); }}>

            <div style={{ width:R*2,height:R*2,borderRadius:"50%",
              background:active?theme.primary:isLog&&hov?"rgba(239,68,68,0.9)":isGlass?"rgba(255,255,255,0.2)":"rgba(30,35,55,0.92)",
              border:`2.5px solid ${active?theme.primary:isLog&&hov?"rgba(239,68,68,0.7)":isGlass?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.18)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,cursor:"pointer",
              transform:`scale(${hov?1.28:active?1.1:1}) translateX(${pushX}px)`,
              transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s",
              boxShadow:active?`0 0 0 5px ${theme.primary}35,0 6px 24px ${theme.primary}55`:hov?"0 8px 28px rgba(0,0,0,0.5)":"0 2px 10px rgba(0,0,0,0.3)",
              backdropFilter:isGlass?"blur(14px)":undefined,
              WebkitBackdropFilter:isGlass?"blur(14px)":undefined }}>
              {isLog?<span>🚪</span>:
                <Link to={item.to} style={{ textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%",borderRadius:"50%" }}>
                  <span>{item.icon}</span>
                </Link>}
            </div>

            {hov&&(
              <div style={{ position:"absolute",
                left:isRight?"auto":R*2+10, right:isRight?R*2+10:"auto",
                top:"50%",transform:"translateY(-50%)",
                background:"rgba(10,15,30,0.95)",color:isLog?"#f87171":"rgba(255,255,255,0.92)",
                padding:"5px 13px",borderRadius:9,fontSize:13,fontWeight:600,whiteSpace:"nowrap",
                pointerEvents:"none",border:"1px solid rgba(255,255,255,0.1)",
                boxShadow:"0 4px 20px rgba(0,0,0,0.4)",zIndex:400,
                animation:"tipIn 0.14s ease" }}>
                {item.label}
              </div>
            )}
          </div>
        );
      })}
      <style>{`@keyframes tipIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE
// ═══════════════════════════════════════════════════════════════════════════════
const MOBILE_WEB_STYLES = [
  { id:"vertical",     icon:"▐", label:"Lateral",     desc:"Desliza da esquerda" },
  { id:"right",        icon:"▌", label:"Dir. Lateral", desc:"Desliza da direita"  },
  { id:"bottom",       icon:"▂", label:"Bottom Sheet", desc:"Sobe da base"        },
  { id:"horizontal",   icon:"▬", label:"Top Bar",      desc:"Barra no topo"       },
  { id:"dock",         icon:"⬤", label:"Dock",         desc:"Bolinhas flutuantes" },
];

function SidebarMobile({ menuItems, theme, isGlass }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const [open,       setOpen]       = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [mStyle, setMStyleState]    = useState(localStorage.getItem("sv_mobile_style")||"vertical");

  const setMStyle = (s) => { setMStyleState(s); localStorage.setItem("sv_mobile_style",s); setShowStyles(false); };

  const backdrop= isGlass?"blur(24px)":"blur(18px)";
  const border  = isGlass?"rgba(255,255,255,0.4)":theme.borderCard;
  const bg      = isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary;

  if (mStyle==="dock") {
    return (
      <>
        <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={true}/>
        <button onClick={()=>setShowStyles(s=>!s)}
          style={{ position:"fixed",top:14,left:14,zIndex:400,
            background:isGlass?"rgba(255,255,255,0.35)":bg,
            backdropFilter:backdrop,WebkitBackdropFilter:backdrop,
            border:`1px solid ${border}`,borderRadius:10,color:theme.textPrimary,
            fontSize:14,width:38,height:38,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center" }}>⚙</button>
        {showStyles&&<StylePicker styles={MOBILE_WEB_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border}/>}
      </>
    );
  }

  if (mStyle==="horizontal") {
    return (
      <>
        <div style={{ position:"fixed",top:0,left:0,right:0,zIndex:200,height:48,
          background:bg,backdropFilter:backdrop,WebkitBackdropFilter:backdrop,
          borderBottom:`1px solid ${border}`,
          display:"flex",alignItems:"center",gap:4,padding:"0 8px",
          overflowX:"auto",scrollbarWidth:"none" }}>
          <button onClick={()=>setShowStyles(s=>!s)}
            style={{ background:"transparent",border:"none",color:theme.textMuted,
              fontSize:14,cursor:"pointer",flexShrink:0,padding:"4px 6px",borderRadius:6 }}>⚙</button>
          {menuItems.map(item=>(
            <Link key={item.to} to={item.to}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 9px",
                borderRadius:8,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0,
                color:isActive(item.to)?"#fff":theme.textMuted,
                background:isActive(item.to)?theme.primary:"transparent",
                fontSize:12,fontWeight:isActive(item.to)?600:400 }}>
              <span style={{ fontSize:14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        {showStyles&&<StylePicker styles={MOBILE_WEB_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border}/>}
      </>
    );
  }

  const panelS = () => {
    const base={ position:"fixed",zIndex:160,background:bg,
      backdropFilter:backdrop,WebkitBackdropFilter:backdrop,
      display:"flex",flexDirection:"column",
      transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)",
      boxShadow:"0 8px 40px rgba(0,0,0,0.5)" };
    if(mStyle==="right")  return {...base,top:0,right:0,bottom:0,width:280,borderLeft:`1px solid ${border}`,transform:open?"translateX(0)":"translateX(100%)"};
    if(mStyle==="bottom") return {...base,left:0,right:0,bottom:0,height:"78vh",borderTop:`1px solid ${border}`,borderRadius:"20px 20px 0 0",transform:open?"translateY(0)":"translateY(100%)"};
    return {...base,top:0,left:0,bottom:0,width:280,borderRight:`1px solid ${border}`,transform:open?"translateX(0)":"translateX(-100%)"};
  };

  const hamS = () => {
    const base={ position:"fixed",zIndex:300,
      background:isGlass?"rgba(255,255,255,0.35)":bg,
      backdropFilter:backdrop,WebkitBackdropFilter:backdrop,
      border:`1px solid ${border}`,color:theme.textPrimary,
      fontSize:20,width:44,height:44,cursor:"pointer",
      display:"flex",alignItems:"center",justifyContent:"center",
      boxShadow:"0 4px 16px rgba(0,0,0,0.4)" };
    if(mStyle==="right")  return {...base,top:14,right:14,borderRadius:10};
    if(mStyle==="bottom") return {...base,bottom:18,left:"50%",transform:"translateX(-50%)",borderRadius:"50%"};
    return {...base,top:14,left:14,borderRadius:10};
  };

  return (
    <>
      <button onClick={()=>setOpen(!open)} style={hamS()}>{open?"✕":"☰"}</button>

      {open&&<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:150,backdropFilter:"blur(2px)" }} onClick={()=>setOpen(false)}/>}

      <div style={panelS()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"18px 18px 14px",borderBottom:`1px solid ${border}`,flexShrink:0 }}>
          <span style={{ fontSize:16,fontWeight:700,color:theme.textPrimary,letterSpacing:1 }}>SV Finance</span>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setShowStyles(s=>!s)}
              style={{ background:showStyles?`${theme.primary}22`:"transparent",
                border:`1px solid ${showStyles?theme.primary:border}`,
                color:showStyles?theme.primary:theme.textMuted,
                borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:13 }}>⚙</button>
            <button onClick={()=>setOpen(false)}
              style={{ background:`${theme.primary}22`,border:"none",color:theme.textPrimary,
                borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14 }}>✕</button>
          </div>
        </div>

        {showStyles&&<StylePicker styles={MOBILE_WEB_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border} inline/>}

        <div style={{ flex:1,padding:"12px",display:"flex",flexDirection:"column",gap:4,overflowY:"auto" }}>
          {menuItems.map(item=>(
            <Link key={item.to} to={item.to} onClick={()=>setOpen(false)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 16px",
                borderRadius:12,textDecoration:"none",color:theme.textPrimary,
                fontSize:15,fontWeight:isActive(item.to)?600:400,transition:"all 0.2s",
                background:isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                border:isActive(item.to)?`1px solid ${border}`:"1px solid transparent" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ padding:12,flexShrink:0 }}>
          <button onClick={()=>{ logoutUser(); navigate("/"); }}
            style={{ width:"100%",padding:"13px 16px",
              background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:12,color:"#ef4444",fontSize:15,fontWeight:600,
              cursor:"pointer",textAlign:"left" }}>
            🚪 Sair
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Style Picker ─────────────────────────────────────────────────────────────
function StylePicker({ styles, current, onSelect, theme, isGlass, border, inline }) {
  if (inline) {
    return (
      <div style={{ padding:"12px 14px",borderBottom:`1px solid ${border}`,flexShrink:0 }}>
        <div style={{ fontSize:11,color:theme.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8 }}>Estilo do menu</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
          {styles.map(s=>(
            <div key={s.id} onClick={()=>onSelect(s.id)}
              style={{ padding:"8px 6px",borderRadius:8,cursor:"pointer",transition:"all 0.15s",textAlign:"center",
                background:current===s.id?`${theme.primary}22`:"transparent",
                border:`1px solid ${current===s.id?theme.primary:border}`,
                color:current===s.id?theme.primary:theme.textMuted,
                fontSize:11,fontWeight:current===s.id?700:400 }}>
              <div style={{ fontSize:16,marginBottom:2 }}>{s.icon}</div>
              {s.label}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position:"fixed",top:58,left:14,zIndex:500,
      background:isGlass?"rgba(255,255,255,0.9)":"rgba(15,20,40,0.97)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      border:`1px solid ${border}`,borderRadius:14,padding:14,
      boxShadow:"0 12px 40px rgba(0,0,0,0.5)",minWidth:220 }}>
      <div style={{ fontSize:11,color:theme.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10 }}>Estilo do menu</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
        {styles.map(s=>(
          <div key={s.id} onClick={()=>onSelect(s.id)}
            style={{ padding:"10px 8px",borderRadius:10,cursor:"pointer",transition:"all 0.15s",textAlign:"center",
              background:current===s.id?`${theme.primary}22`:"transparent",
              border:`1px solid ${current===s.id?theme.primary:border}`,
              color:current===s.id?theme.primary:theme.textMuted,
              fontSize:12,fontWeight:current===s.id?700:400 }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
            <div>{s.label}</div>
            <div style={{ fontSize:10,opacity:0.6,marginTop:2 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { theme, themeId } = useTheme();
  const isGlass   = themeId==="glass"||themeId==="gray";
  const isMobile  = window.innerWidth <= 768;
  const menuItems = useMenuItems();
  const [style, setStyle] = useState(getSidebarStyle());

  useEffect(()=>{
    const fn=()=>setStyle(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed",fn);
    return ()=>window.removeEventListener("sv_sidebar_style_changed",fn);
  },[]);

  if (isMobile) return <SidebarMobile menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  if (style==="horizontal")   return <SidebarHorizontal menuItems={menuItems} theme={theme} isGlass={isGlass}/>;
  if (style==="dock")         return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={true}/>;
  if (style==="dock_concave") return <SidebarDock menuItems={menuItems} theme={theme} isGlass={isGlass} convex={false}/>;
  return <SidebarVertical menuItems={menuItems} theme={theme} isGlass={isGlass} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>;
}