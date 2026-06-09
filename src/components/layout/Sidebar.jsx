import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useNicho } from "../../contexts/NichoContext";
import { logoutUser } from "../../services/api";

// isRG embutido — evita erro de import dinâmico no Vite
function _isRGHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "restauraglass.svfinance.com.br" ||
    h === "solucoes.svfinance.com.br"      ||
    h === "localhost"                       ||
    h === "127.0.0.1"
  );
}

const STYLE_KEY    = "sv_sidebar_style";
const AUTOHIDE_KEY = "sv_sidebar_autohide";

export function getSidebarStyle()    { return localStorage.getItem(STYLE_KEY) || "vertical"; }
export function setSidebarStyleLS(s) { localStorage.setItem(STYLE_KEY, s); window.dispatchEvent(new Event("sv_sidebar_style_changed")); }
export function getAutoHide()        { return localStorage.getItem(AUTOHIDE_KEY) === "true"; }
export function setAutoHideLS(v)     { localStorage.setItem(AUTOHIDE_KEY, String(v)); }

const MOBILE_STYLE_KEY = "sv_mobile_style";
function getMobileStyle()    { return localStorage.getItem(MOBILE_STYLE_KEY) || "dock"; }
function setMobileStyleLS(s) { localStorage.setItem(MOBILE_STYLE_KEY, s); window.dispatchEvent(new Event("sv_mobile_style_changed")); }

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detecta Restaura Glass — POR HOSTNAME, embutido no arquivo
function isRestauraGlass() {
  return _isRGHost();
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu estruturado em grupos (APENAS para Restaura Glass)
// ─────────────────────────────────────────────────────────────────────────────
function useMenuItemsGrouped() {
  const role   = localStorage.getItem("role")    || "viewer";
  const plan   = localStorage.getItem("sv_plan") || "free";
  const canNFe = role === "admin" && (plan === "pro" || plan === "business");

  return [
    {
      id: "operacional",
      label: "Operacional",
      icon: "⚙️",
      collapsed: localStorage.getItem("sv_group_operacional") === "true",
      items: [
        { to:"/home",                icon:"🏠", label:"Início",                roles:["admin","financial","seller","stock","viewer","encarregado"] },
        { to:"/clients",             icon:"👥", label:"Clientes",              roles:["admin","financial","seller","encarregado"] },
        { to:"/orders",              icon:"📋", label:"Ordens de Serviço",    roles:["admin","financial","seller","stock","viewer","encarregado"] },
        { to:"/autorizacao-checkin", icon:"🔑", label:"Autorização Check-in", roles:["admin","encarregado"] },
        { to:"/team",                icon:"👤", label:"Equipe",               roles:["admin"] },
        { to:"/settings",            icon:"⚙️", label:"Configurações",        roles:["admin"] },
      ]
    },
    {
      id: "financeiro",
      label: "Financeiro",
      icon: "💰",
      collapsed: localStorage.getItem("sv_group_financeiro") === "true",
      items: [
        { to:"/transactions", icon:"💰", label:"Transações",         roles:["admin","financial"], children:[
          { to:"/transactions", label:"Todas as transações" },
          { to:"/bills",        label:"Contas a pagar/receber" },
        ]},
        { to:"/analytics",     icon:"📊", label:"Analytics",          roles:["admin","financial"] },
        { to:"/products",      icon:"📦", label:"Produtos",           roles:["admin","financial","stock","seller"] },
        { to:"/quotes",        icon:"🧾", label:"Orçamentos",         roles:["admin","financial"] },
        { to:"/sales",         icon:"🛒", label:"Vendas",             roles:["admin","financial"] },
        ...(canNFe ? [{ to:"/sales", icon:"🧾", label:"Emitir NF-e", roles:["admin"], nfe:true }] : []),
        { to:"/commissions",   icon:"💸", label:"Comissões",          roles:["admin","financial","seller","encarregado"] },
        { to:"/import-export", icon:"📂", label:"Importar/Exportar",  roles:["admin","financial"] },
        { to:"/goals",         icon:"🎯", label:"Metas",              roles:["admin","financial"] },
      ]
    },
    {
      id: "relatorios",
      label: "Relatórios",
      icon: "📈",
      collapsed: localStorage.getItem("sv_group_relatorios") === "true",
      items: [
        { to:"/reports", icon:"📈", label:"Relatórios", roles:["admin","financial"] },
      ]
    }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu flat (padrão SV Finance genérico)
// ─────────────────────────────────────────────────────────────────────────────
function useMenuItems() {
  const role        = localStorage.getItem("role")         || "viewer";
  const accountType = localStorage.getItem("account_type") || "business";
  const plan        = localStorage.getItem("sv_plan")      || "free";
  const isPersonal  = accountType === "personal";
  const canNFe      = role === "admin" && (plan === "pro" || plan === "business");
  const { label, hasModule } = useNicho();

  const all = isPersonal ? [
    { to:"/dashboard",    icon:"🏠", label:"Dashboard"     },
    { to:"/transactions", icon:"💰", label:"Transações"    },
    { to:"/bills",        icon:"📄", label:"Contas"        },
    { to:"/analytics",    icon:"📊", label:"Analytics"     },
    { to:"/goals",        icon:"🎯", label:"Metas"         },
    { to:"/settings",     icon:"⚙️", label:"Configurações" },
  ] : [
    { to:"/home",                icon:"🏠", label:"Início",             roles:null,                                                          module:"dashboard"    },
    { to:"/dashboard",           icon:"📊", label:"Dashboard",          roles:null,                                                          module:"dashboard"    },
    { to:"/clients",             icon:"👥", label:label("clients"),     roles:["admin","financial","seller","encarregado"],                  module:"clients"      },
    { to:"/transactions",        icon:"💰", label:"Transações",         roles:["admin","financial"],                                         module:"transactions", children:[
      { to:"/transactions", label:"Todas as transações" },
      { to:"/bills",        label:"Contas a pagar/receber" },
    ]},
    { to:"/analytics",           icon:"📊", label:"Analytics",          roles:["admin","financial"],                                         module:"analytics"    },
    { to:"/reports",             icon:"📈", label:"Relatórios",         roles:["admin","financial"],                                         module:"reports"      },
    { to:"/products",            icon:"📦", label:label("products"),    roles:["admin","financial","stock","seller"],                        module:"products"     },
    { to:"/quotes",              icon:"🧾", label:"Orçamentos",         roles:["admin","financial"],                                         module:"quotes"       },
    { to:"/orders",              icon:"📋", label:"Ordens de Serviço",  roles:["admin","financial","seller","stock","viewer","encarregado"], module:"orders"       },
    { to:"/autorizacao-checkin", icon:"🔑", label:"Autorização Check-in", roles:["admin","encarregado"],                                     module:"orders"       },
    { to:"/sales",               icon:"🛒", label:label("sales"),       roles:["admin","financial"],                                         module:"orders"       },
    ...(canNFe ? [{ to:"/sales", icon:"🧾", label:"Emitir NF-e",        roles:["admin"],                                                     module:"orders", nfe:true }] : []),
    { to:"/team",                icon:"👤", label:"Equipe",             roles:["admin"],                                                     module:"team"         },
    { to:"/commissions",         icon:"💸", label:"Comissões",          roles:["admin","financial","seller","encarregado"],                  module:"commissions"  },
    { to:"/import-export",       icon:"📂", label:"Importar/Exportar",  roles:["admin","financial"],                                         module:"import"       },
    { to:"/goals",               icon:"🎯", label:"Metas",              roles:["admin","financial"],                                         module:"goals"        },
    { to:"/settings",            icon:"⚙️", label:"Configurações",      roles:["admin"],                                                     module:"settings"     },
  ];

  return all.filter(i => {
    if (i.roles && !i.roles.includes(role)) return false;
    if (i.module && !hasModule(i.module)) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown Portal (para Horizontal)
// ─────────────────────────────────────────────────────────────────────────────
function DropdownPortal({ items, anchorEl, theme, isActive, onSelect }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [anchorEl]);
  if (!pos) return null;
  return (
    <div className="sv-dropdown" style={{
      position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
      background:"rgba(12,18,35,0.97)", backdropFilter:"blur(28px) saturate(180%)",
      WebkitBackdropFilter:"blur(28px) saturate(180%)",
      border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, minWidth:220,
      boxShadow:"0 16px 48px rgba(0,0,0,0.6)", overflow:"hidden",
      animation:"dropIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {items.map((child, ci) => {
        const active = isActive(child.to);
        return (
          <div key={child.to} onClick={() => onSelect(child.to)} style={{
            padding:"12px 20px", fontSize:13.5, cursor:"pointer",
            color:active?theme.primary:"rgba(255,255,255,0.85)",
            background:active?`${theme.primary}18`:"transparent",
            fontWeight:active?600:400,
            borderBottom:ci<items.length-1?"1px solid rgba(255,255,255,0.07)":"none",
            display:"flex", alignItems:"center", gap:8, transition:"all 0.15s",
          }}
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

// ─────────────────────────────────────────────────────────────────────────────
// SidebarVertical — com suporte a grupos
// ─────────────────────────────────────────────────────────────────────────────
function SidebarVertical({ menuItems, groups, theme, isGlass, sidebarOpen, setSidebarOpen, isRG }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();
  const bg       = isGlass ? "rgba(255,255,255,0.18)" : theme.sidebarBg;
  const backdrop = isGlass ? "blur(24px) saturate(160%)" : "blur(18px)";
  const border   = isGlass ? "rgba(255,255,255,0.4)"    : theme.borderCard;

  const [expandedGroups, setExpandedGroups] = useState(() => {
    if (!isRG) return {};
    return {
      operacional: !groups[0]?.collapsed,
      financeiro: !groups[1]?.collapsed,
      relatorios: !groups[2]?.collapsed,
    };
  });

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newState = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(`sv_group_${groupId}`, String(!newState[groupId]));
      return newState;
    });
  };

  const items = isRG ? groups : [{ id: "flat", items: menuItems }];

  return (
    <div style={{
      height:"100vh", position:"sticky", top:0,
      background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop,
      borderRight:`1px solid ${border}`,
      boxShadow:isGlass?"4px 0 24px rgba(0,0,0,0.1)":"4px 0 24px rgba(0,0,0,0.4)",
      padding:"20px 10px 10px", transition:"all 0.3s ease",
      overflow:"hidden", width:sidebarOpen?"220px":"70px",
      display:"flex", flexDirection:"column", zIndex:100,
    }}
      onMouseEnter={() => setSidebarOpen(true)}
      onMouseLeave={() => setSidebarOpen(false)}>
      <div style={{ flexShrink:0, marginBottom:20, opacity:sidebarOpen?1:0, transition:"0.3s" }}>
        <h2 style={{ whiteSpace:"nowrap", margin:0, fontWeight:600, letterSpacing:1, color:theme.textPrimary }}>
          {isRG ? "Restaura Glass" : "SV Finance"}
        </h2>
      </div>
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", minHeight:0 }}>
        {items.map(group => (
          <div key={group.id} style={{ marginBottom:isRG?12:0 }}>
            {isRG && (
              <div onClick={() => toggleGroup(group.id)} style={{
                padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s", marginBottom:6,
                background:`${theme.primary}11`,
                border:`1px solid ${theme.sidebarBorder}`,
                display:"flex", alignItems:"center", gap:8,
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background=`${theme.primary}20`; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=`${theme.primary}11`; }}>
                <span style={{ fontSize:16, minWidth:20, textAlign:"center" }}>{group.icon}</span>
                <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", fontWeight:600, fontSize:13 }}>{group.label}</span>
                <span style={{ marginLeft:"auto", opacity:sidebarOpen?1:0, transition:"0.3s", fontSize:12, transform:expandedGroups[group.id]?"rotate(180deg)":"rotate(0deg)", transformOrigin:"center" }}>▼</span>
              </div>
            )}
            {(!isRG || expandedGroups[group.id]) && (
              <div style={{ paddingLeft:isRG?8:0 }}>
                {group.items
                  .filter(item => !item.roles || item.roles.includes(localStorage.getItem("role") || "viewer"))
                  .map(item => {
                    const active   = isActive(item.to) && !item.nfe;
                    const activeBg = isGlass ? "rgba(255,255,255,0.35)" : theme.sidebarActive;
                    return (
                      <div key={item.nfe ? "__nfe__" : item.to} style={{
                        padding:12, cursor:"pointer", borderRadius:10, transition:"all 0.2s", marginBottom:6,
                        background: item.nfe
                          ? `linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))`
                          : active ? activeBg : "transparent",
                        border: item.nfe
                          ? "1px solid rgba(212,175,55,0.4)"
                          : active ? `1px solid ${isGlass?"rgba(255,255,255,0.55)":theme.sidebarBorder}` : "1px solid transparent",
                      }}
                        onMouseEnter={e=>{ if(!active&&!item.nfe) e.currentTarget.style.background=isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`; }}
                        onMouseLeave={e=>{ if(!active&&!item.nfe) e.currentTarget.style.background="transparent"; }}>
                        <Link to={item.to} style={{ textDecoration:"none", color: item.nfe?"#d4af37":theme.textPrimary, display:"flex", alignItems:"center", gap:12, width:"100%" }}>
                          <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>{item.icon}</span>
                          <span style={{ opacity:sidebarOpen?1:0, transition:"0.3s", whiteSpace:"nowrap", fontWeight:active||item.nfe?600:400 }}>{item.label}</span>
                          {item.nfe && sidebarOpen && <span style={{ marginLeft:"auto", fontSize:9, background:"#d4af37", color:"#000", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>NF-e</span>}
                        </Link>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
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

// ─────────────────────────────────────────────────────────────────────────────
// SidebarHorizontal — com suporte a grupos (dropdown no grupo)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarHorizontal({ menuItems, groups, theme, isGlass, isRG }) {
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

  const checkScroll = () => {
    const el = scrollRef.current; if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => { setTimeout(checkScroll, 100); }, [menuItems, groups]);
  useEffect(() => {
    if (openIdx === null) return;
    const fn = (e) => { if (!e.target.closest("[data-navitem]") && !e.target.closest(".sv-dropdown")) setOpenIdx(null); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [openIdx]);

  const showBar   = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const startHide = () => { if (!autoHide) return; hideTimer.current = setTimeout(() => { setVisible(false); setOpenIdx(null); }, 800); };
  const toggleAH  = () => { const n=!autoHide; setAutoHideState(n); setAutoHideLS(n); setVisible(!n); };
  const scrollNav = (d) => { scrollRef.current?.scrollBy({ left:d*160, behavior:"smooth" }); setTimeout(checkScroll, 350); };

  const handleGroupClick = (idx, el) => {
    setOpenIdx(openIdx===idx?null:idx);
    setAnchorEl(el);
  };

  const role   = localStorage.getItem("role") || "viewer";
  const items  = isRG
    ? groups.map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(role)) }))
    : [{ id: "flat", items: menuItems, label: "", icon: "" }];

  return (
    <>
      {autoHide && !visible && <div style={{ position:"fixed",top:0,left:0,right:0,height:8,zIndex:201,pointerEvents:"all" }} onMouseEnter={showBar}/>}
      <div onMouseEnter={showBar} onMouseLeave={startHide} style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,height:54,
        background: isRG ? "rgba(255,255,255,0.95)" : "rgba(12,16,32,0.90)",
        backdropFilter:"blur(28px) saturate(180%)", WebkitBackdropFilter:"blur(28px) saturate(180%)",
        borderBottom: isRG ? "2px solid rgba(26,138,60,0.3)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isRG ? "0 4px 24px rgba(26,138,60,0.12)" : "0 4px 32px rgba(0,0,0,0.4)",
        display:"flex",alignItems:"center",
        transform:visible?"translateY(0)":"translateY(-100%)",
        transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents:visible?"all":"none",
      }}>
        <span style={{ fontWeight:700,fontSize:14,color:isRG?"#1a8a3c":"rgba(255,255,255,0.92)",padding:"0 16px",whiteSpace:"nowrap",letterSpacing:0.5,flexShrink:0 }}>
          {isRG ? "Restaura Glass" : "SV Finance"}
        </span>
        {canL && <button onClick={()=>scrollNav(-1)} style={{ background:"none",border:"none",color:isRG?"rgba(26,138,60,0.5)":"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",padding:"0 4px",flexShrink:0 }}>‹</button>}
        <div ref={scrollRef} onScroll={checkScroll} style={{ display:"flex",alignItems:"center",flex:1,overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none" }}>
          <div style={{ display:"flex",alignItems:"center",gap:2,minWidth:"max-content",padding:"0 4px" }}>
            {items.map((group, idx) => {
              const isGroup = isRG;
              return isGroup ? (
                <div key={group.id} style={{ position:"relative",flexShrink:0 }}>
                  <div data-navitem={idx} onClick={e=>handleGroupClick(idx,e.currentTarget)} style={{
                    display:"flex",alignItems:"center",gap:6,padding:"6px 11px",borderRadius:8,cursor:"pointer",
                    whiteSpace:"nowrap",userSelect:"none",
                    color:openIdx===idx?(isRG?"#1a8a3c":theme.primary):(isRG?"#4a5568":theme.textMuted),
                    background:openIdx===idx?(isRG?"rgba(26,138,60,0.1)":`${theme.primary}22`):"transparent",
                    border:openIdx===idx?`1px solid ${isRG?"#1a8a3c":theme.primary}`:"1px solid transparent",
                    fontWeight:openIdx===idx?600:400,fontSize:13,transition:"all 0.18s",
                  }}
                    onMouseEnter={e=>{ if(openIdx!==idx){e.currentTarget.style.background=isRG?"rgba(26,138,60,0.08)":"rgba(255,255,255,0.1)";e.currentTarget.style.color=isRG?"#1a8a3c":"#fff";} }}
                    onMouseLeave={e=>{ if(openIdx!==idx){e.currentTarget.style.background="transparent";e.currentTarget.style.color=isRG?"#4a5568":theme.textMuted;} }}>
                    <span style={{ fontSize:15 }}>{group.icon}</span>
                    <span>{group.label}</span>
                    <span style={{ fontSize:8,opacity:0.6,marginLeft:1,transform:openIdx===idx?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",display:"inline-block" }}>▼</span>
                  </div>
                  {openIdx===idx && anchorEl && (
                    <DropdownPortal items={group.items} anchorEl={anchorEl} theme={theme} isActive={isActive} onSelect={to=>{navigate(to);setOpenIdx(null);}}/>
                  )}
                </div>
              ) : (
                group.items.map((item, itemIdx) => {
                  const active  = isActive(item.to) && !item.nfe;
                  const hasChild= item.children?.length > 0;
                  const isOpen  = openIdx===itemIdx;
                  return (
                    <div key={item.nfe?"__nfe__":item.to} style={{ position:"relative",flexShrink:0 }}>
                      <div data-navitem={itemIdx} onClick={e=>{ if(hasChild){ setOpenIdx(openIdx===itemIdx?null:itemIdx); setAnchorEl(e.currentTarget); }else{ navigate(item.to); setOpenIdx(null); } }} style={{
                        display:"flex",alignItems:"center",gap:6,padding:"6px 11px",borderRadius:8,cursor:"pointer",
                        whiteSpace:"nowrap",userSelect:"none",
                        color: item.nfe ? "#d4af37" : active?"#fff":"rgba(255,255,255,0.65)",
                        background: item.nfe ? "rgba(212,175,55,0.12)" : active?theme.primary:"transparent",
                        border: item.nfe ? "1px solid rgba(212,175,55,0.35)" : "1px solid transparent",
                        fontWeight:active||item.nfe?600:400,fontSize:13,transition:"all 0.18s",
                      }}
                        onMouseEnter={e=>{ if(!active&&!item.nfe){e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";} }}
                        onMouseLeave={e=>{ if(!active&&!item.nfe){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.65)";} }}>
                        <span style={{ fontSize:15 }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {hasChild && <span style={{ fontSize:8,opacity:0.6,marginLeft:1,transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",display:"inline-block" }}>▼</span>}
                      </div>
                      {hasChild && isOpen && anchorEl && (
                        <DropdownPortal items={item.children} anchorEl={anchorEl} theme={theme} isActive={isActive} onSelect={to=>{navigate(to);setOpenIdx(null);}}/>
                      )}
                    </div>
                  );
                })
              );
            })}
          </div>
        </div>
        {canR && <button onClick={()=>scrollNav(1)} style={{ background:"none",border:"none",color:isRG?"rgba(26,138,60,0.5)":"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",padding:"0 4px",flexShrink:0 }}>›</button>}
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"0 12px",flexShrink:0 }}>
          <button onClick={toggleAH} style={{ background:"transparent",border:"none",color:autoHide?(isRG?"#1a8a3c":theme.primary):isRG?"rgba(26,138,60,0.4)":"rgba(255,255,255,0.4)",fontSize:16,cursor:"pointer",padding:"4px 6px",borderRadius:6 }}>{autoHide?"📌":"👁"}</button>
          <button onClick={()=>{logoutUser();navigate("/");}} style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#ef4444",padding:"5px 12px",cursor:"pointer",fontWeight:600,fontSize:12 }}>Sair</button>
        </div>
      </div>
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-10px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarDock — com suporte a grupos (submenu lateral)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarDock({ menuItems, groups, theme, isGlass, convex = true, mobile = false, isRG }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [ww,      setWw]      = useState(window.innerWidth);
  const [vh,      setVh]      = useState(window.innerHeight);

  const dragging  = useRef(false);
  const dragStart = useRef({});
  const didDrag   = useRef(false);
  const HAM_KEY   = `sv_dock_pos_${convex?"conv":"conc"}${mobile?"_mob":""}`;

  useEffect(() => {
    const fn = () => { setWw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const getInitialPos = useCallback(() => {
    try { const s = JSON.parse(localStorage.getItem(HAM_KEY)); if (s) return s; } catch {}
    return { x: convex ? 14 : window.innerWidth - 58, y: Math.round(window.innerHeight / 2 - 22) };
  }, [HAM_KEY, convex]);

  const [hamPos, setHamPos] = useState(getInitialPos);
  const hamSize = mobile ? 50 : 44;

  const startDrag = (cx, cy) => {
    dragging.current = true; didDrag.current = false;
    dragStart.current = { mx:cx, my:cy, bx:hamPos.x, by:hamPos.y };
  };

  const moveDrag = useCallback((cx, cy) => {
    if (!dragging.current) return;
    const dx = cx - dragStart.current.mx; const dy = cy - dragStart.current.my;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
    setHamPos({ x: Math.max(0, Math.min(ww-hamSize, dragStart.current.bx+dx)), y: Math.max(0, Math.min(vh-hamSize, dragStart.current.by+dy)) });
  }, [ww, vh, hamSize]);

  const endDrag = useCallback(() => {
    dragging.current = false;
    setHamPos(p => { localStorage.setItem(HAM_KEY, JSON.stringify(p)); return p; });
  }, [HAM_KEY]);

  const onMouseDown = (e) => {
    e.preventDefault(); startDrag(e.clientX, e.clientY);
    const mv = (e) => moveDrag(e.clientX, e.clientY);
    const up = () => { endDrag(); window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
  };

  const onTouchStart = (e) => {
    const t = e.touches[0]; startDrag(t.clientX, t.clientY);
    const mv = (e) => { e.preventDefault(); const t=e.touches[0]; moveDrag(t.clientX,t.clientY); };
    const up = () => { endDrag(); window.removeEventListener("touchmove",mv); window.removeEventListener("touchend",up); };
    window.addEventListener("touchmove",mv,{passive:false}); window.addEventListener("touchend",up);
  };

  const role     = localStorage.getItem("role") || "viewer";
  const allItems = isRG
    ? groups.flatMap(g => [
        { id:`__group_${g.id}__`, icon:g.icon, label:g.label, isGroupHeader:true, groupId:g.id },
        ...g.items.filter(i => !i.roles || i.roles.includes(role))
      ])
    : menuItems;

  const R       = mobile ? 30 : 26;
  const SPACING = R * 2 + (mobile ? 12 : 10);
  const finalItems = [...allItems, { to:"__logout__", icon:"🚪", label:"Sair" }];
  const n        = finalItems.length;
  const totalH   = SPACING * (n - 1);
  const hamCX    = hamPos.x + hamSize / 2;
  const hamCY    = hamPos.y + hamSize / 2;
  const isRight  = hamCX > ww * 0.5;
  const isTopZ   = hamCY < vh * 0.35;
  const isBottomZ= hamCY > vh * 0.65;
  const isMidZ   = !isTopZ && !isBottomZ;

  return (
    <>
      <div onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        onClick={() => { if (!didDrag.current) setOpen(o => !o); }}
        style={{
          position:"fixed", left:hamPos.x, top:hamPos.y, zIndex:500,
          width:hamSize, height:hamSize, borderRadius:"50%",
          background: open ? theme.primary : isGlass ? "rgba(255,255,255,0.22)" : "rgba(15,20,42,0.95)",
          border:`2px solid ${open?theme.primary:isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.18)"}`,
          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          boxShadow: open?`0 0 0 6px ${theme.primary}30, 0 10px 36px ${theme.primary}55`:"0 4px 24px rgba(0,0,0,0.55)",
          cursor:"grab", userSelect:"none", pointerEvents:"all",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          transition: dragging.current?"none":"background 0.3s, border 0.3s, box-shadow 0.3s",
        }}>
        {[
          { mb:open?0:mobile?6:5, rotate:open?"rotate(45deg) translate(0,3px)":"none" },
          { mb:open?0:mobile?6:5, opacity:open?0:1 },
          { mb:0, rotate:open?"rotate(-45deg) translate(0,-3px)":"none" },
        ].map((s, i) => (
          <span key={i} style={{ display:"block", width:mobile?22:18, height:2, borderRadius:2, background:"rgba(255,255,255,0.9)", marginBottom:s.mb, opacity:s.opacity??1, transform:s.rotate??"none", transition:"all 0.28s ease" }}/>
        ))}
      </div>

      {finalItems.map((item, i) => {
        if (item.isGroupHeader) return null;

        let cy;
        const orderedI = isBottomZ ? n-1-i : i;
        if      (isTopZ)    cy = hamPos.y + hamSize + 8 + i * SPACING;
        else if (isBottomZ) cy = hamPos.y - 8 - (i+1) * SPACING;
        else                cy = hamCY - totalH/2 + i * SPACING;

        const t     = n===1?0:(i/(n-1))*2-1;
        const curve = isMidZ?(1-t*t):(isTopZ?(i/(n-1))*0.6:((n-1-i)/(n-1))*0.6);
        const xOff  = 8 + curve * (mobile?56:48);
        const bubbleX = isRight ? hamPos.x-xOff-R*2 : hamPos.x+hamSize+xOff-R;
        const slideX  = isRight ? (open?0:xOff+R*2+24) : (open?0:-(xOff+R*2+24));
        const delay   = open?`${orderedI*38}ms`:`${(n-1-orderedI)*24}ms`;

        const active = item.to!=="__logout__" && !item.nfe && isActive(item.to);
        const isLog  = item.to==="__logout__";
        const isNFe  = item.nfe;
        const hov    = hovered===i;
        const pushX  = hov?(isRight?-10:10):0;

        return (
          <div key={`${item.nfe?"nfe":item.to}-${i}`} style={{
            position:"fixed", left:bubbleX, top:cy-R, width:R*2, height:R*2, zIndex:400,
            pointerEvents:open?"all":"none",
            transform:`translateX(${slideX}px)`,
            opacity:open?1:0,
            transition:`transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${delay}, opacity 0.25s ease ${delay}`,
          }}
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
            onTouchStart={()=>setHovered(i)} onTouchEnd={()=>setHovered(null)}
            onClick={()=>{ if(isLog){logoutUser();navigate("/");}else{setOpen(false);} }}>
            <div style={{
              width:R*2, height:R*2, borderRadius:"50%",
              background: isNFe && hov ? "rgba(212,175,55,0.9)" :
                          isNFe       ? "rgba(212,175,55,0.2)"  :
                          active      ? theme.primary            :
                          isLog&&hov  ? "rgba(239,68,68,0.92)"  :
                          isGlass     ? "rgba(255,255,255,0.22)" : "rgba(15,20,42,0.95)",
              border:`2.5px solid ${
                isNFe       ? "rgba(212,175,55,0.7)" :
                active      ? theme.primary           :
                isLog&&hov  ? "rgba(239,68,68,0.7)"  :
                isGlass     ? "rgba(255,255,255,0.45)": "rgba(255,255,255,0.2)"
              }`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:mobile?22:17, cursor:"pointer",
              transform:`scale(${hov?1.3:active||isNFe?1.12:1}) translateX(${pushX}px)`,
              transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.2s",
              boxShadow: isNFe  ? `0 0 0 4px rgba(212,175,55,0.2), 0 6px 24px rgba(212,175,55,0.3)` :
                         active ? `0 0 0 5px ${theme.primary}35, 0 6px 24px ${theme.primary}55`      :
                         hov    ? "0 8px 28px rgba(0,0,0,0.55)" : "0 2px 12px rgba(0,0,0,0.35)",
              backdropFilter:isGlass?"blur(14px)":undefined, WebkitBackdropFilter:isGlass?"blur(14px)":undefined,
            }}>
              {isLog ? <span>🚪</span> :
                <Link to={item.to} style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%", borderRadius:"50%" }}>
                  <span style={{ fontSize:mobile?22:17 }}>{item.icon}</span>
                </Link>
              }
            </div>
            {hov && (
              <div style={{
                position:"absolute",
                left:isRight?"auto":R*2+8, right:isRight?R*2+8:"auto",
                top:"50%", transform:"translateY(-50%)",
                background: isNFe?"rgba(30,20,0,0.97)":"rgba(8,12,28,0.97)",
                color: isLog?"#f87171":isNFe?"#d4af37":"rgba(255,255,255,0.95)",
                padding:mobile?"6px 14px":"5px 13px",
                borderRadius:9, fontSize:mobile?15:13,
                fontWeight:600, whiteSpace:"nowrap", pointerEvents:"none",
                border:`1px solid ${isNFe?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.12)"}`,
                boxShadow:"0 4px 20px rgba(0,0,0,0.4)", zIndex:600,
                animation:"tipIn 0.14s ease",
              }}>
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

const MOBILE_STYLES = [
  { id:"dock",       icon:"⬤", label:"Dock",        desc:"Bolinhas flutuantes (padrão)" },
  { id:"vertical",   icon:"▐", label:"Lateral",      desc:"Desliza da esquerda" },
  { id:"right",      icon:"▌", label:"Dir. Lateral", desc:"Desliza da direita"  },
  { id:"bottom",     icon:"▂", label:"Bottom Sheet", desc:"Sobe da base"        },
  { id:"horizontal", icon:"▬", label:"Top Bar",      desc:"Barra no topo"       },
];

function StylePicker({ styles, current, onSelect, theme, isGlass, border, inline }) {
  const grid = (
    <div style={{ display:"grid", gridTemplateColumns:inline?"repeat(3,1fr)":"1fr 1fr", gap:inline?6:8 }}>
      {styles.map(s => (
        <div key={s.id} onClick={()=>onSelect(s.id)} style={{
          padding:inline?"8px 6px":"10px 8px", borderRadius:inline?8:10,
          cursor:"pointer", transition:"all 0.15s", textAlign:"center",
          background:current===s.id?`${theme.primary}22`:"transparent",
          border:`1px solid ${current===s.id?theme.primary:border}`,
          color:current===s.id?theme.primary:theme.textMuted,
          fontWeight:current===s.id?700:400, fontSize:inline?11:12,
        }}>
          <div style={{ fontSize:inline?16:20, marginBottom:4 }}>{s.icon}</div>
          <div>{s.label}</div>
          {!inline && <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{s.desc}</div>}
        </div>
      ))}
    </div>
  );
  if (inline) return (
    <div style={{ padding:"12px 14px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
      <div style={{ fontSize:11, color:theme.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Estilo do menu</div>
      {grid}
    </div>
  );
  return (
    <div style={{ position:"fixed", top:74, left:14, zIndex:600, background:isGlass?"rgba(255,255,255,0.92)":"rgba(15,20,40,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${border}`, borderRadius:16, padding:16, boxShadow:"0 12px 40px rgba(0,0,0,0.5)", minWidth:230 }}>
      <div style={{ fontSize:11, color:theme.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Estilo do menu</div>
      {grid}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarMobile — com suporte a grupos
// ─────────────────────────────────────────────────────────────────────────────
function SidebarMobile({ menuItems, groups, theme, isGlass, isRG }) {
  const location = useLocation();
  const isActive = p => location.pathname === p;
  const navigate = useNavigate();

  const [mStyle,     setMStyleState] = useState(getMobileStyle());
  const [open,       setOpen]        = useState(false);
  const [showStyles, setShowStyles]  = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    if (!isRG) return {};
    return {
      operacional: !groups[0]?.collapsed,
      financeiro: !groups[1]?.collapsed,
      relatorios: !groups[2]?.collapsed,
    };
  });

  useEffect(() => {
    const fn = () => { setMStyleState(getMobileStyle()); setOpen(false); setShowStyles(false); };
    window.addEventListener("sv_mobile_style_changed", fn);
    return () => window.removeEventListener("sv_mobile_style_changed", fn);
  }, []);

  const setMStyle = (s) => setMobileStyleLS(s);
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newState = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(`sv_group_${groupId}`, String(!newState[groupId]));
      return newState;
    });
  };

  const role     = localStorage.getItem("role") || "viewer";
  const backdrop = isGlass?"blur(24px)":"blur(18px)";
  const border   = isGlass?"rgba(255,255,255,0.4)":theme.borderCard;
  const bg       = isGlass?"rgba(255,255,255,0.22)":theme.bgSecondary;

  const items = isRG
    ? groups.map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(role)) }))
    : [{ id: "flat", items: menuItems }];

  if (mStyle==="dock") return (
    <>
      <SidebarDock menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} convex={true} mobile={true} isRG={isRG}/>
      {showStyles && (<><div style={{ position:"fixed",inset:0,zIndex:595 }} onClick={()=>setShowStyles(false)}/><StylePicker styles={MOBILE_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border}/></>)}
    </>
  );

  if (mStyle==="horizontal") return (
    <>
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:50, background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop, borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", gap:4, padding:"0 8px", overflowX:"auto", scrollbarWidth:"none" }}>
        <button onClick={()=>setShowStyles(s=>!s)} style={{ background:"transparent", border:"none", color:theme.textMuted, fontSize:16, cursor:"pointer", flexShrink:0, padding:"4px 6px", borderRadius:6 }}>⚙</button>
        {isRG ? (
          items.map(group => (
            <div key={group.id} style={{ display:"flex", alignItems:"center", gap:2, flexShrink:0 }}>
              <div onClick={() => toggleGroup(group.id)} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 9px", borderRadius:8, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0, color:theme.textMuted, background:"transparent", fontSize:12, fontWeight:400, cursor:"pointer" }}>
                <span style={{ fontSize:14 }}>{group.icon}</span>
                <span>{group.label}</span>
              </div>
              {expandedGroups[group.id] && group.items.map(item => (
                <Link key={item.to} to={item.to} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 9px", borderRadius:8, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0, color:item.nfe?"#d4af37":isActive(item.to)?"#fff":theme.textMuted, background:item.nfe?"rgba(212,175,55,0.12)":isActive(item.to)?theme.primary:"transparent", fontSize:12, fontWeight:item.nfe||isActive(item.to)?600:400, border:item.nfe?"1px solid rgba(212,175,55,0.3)":"none" }}>
                  <span style={{ fontSize:14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))
        ) : (
          menuItems.map(item => (
            <Link key={item.nfe?"__nfe__":item.to} to={item.to} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 9px", borderRadius:8, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0, color:item.nfe?"#d4af37":isActive(item.to)?"#fff":theme.textMuted, background:item.nfe?"rgba(212,175,55,0.12)":isActive(item.to)?theme.primary:"transparent", fontSize:12, fontWeight:item.nfe||isActive(item.to)?600:400, border:item.nfe?"1px solid rgba(212,175,55,0.3)":"none" }}>
              <span style={{ fontSize:14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))
        )}
      </div>
      {showStyles && (<><div style={{ position:"fixed",inset:0,zIndex:595 }} onClick={()=>setShowStyles(false)}/><StylePicker styles={MOBILE_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border}/></>)}
    </>
  );

  const panelStyle = () => {
    const base = { position:"fixed", zIndex:160, background:bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop, display:"flex", flexDirection:"column", transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" };
    if (mStyle==="right")  return { ...base, top:0, right:0, bottom:0, width:"80vw", maxWidth:300, borderLeft:`1px solid ${border}`,  transform:open?"translateX(0)":"translateX(100%)" };
    if (mStyle==="bottom") return { ...base, left:0, right:0, bottom:0, height:"78vh", borderTop:`1px solid ${border}`, borderRadius:"20px 20px 0 0", transform:open?"translateY(0)":"translateY(100%)" };
    return { ...base, top:0, left:0, bottom:0, width:"80vw", maxWidth:300, borderRight:`1px solid ${border}`, transform:open?"translateX(0)":"translateX(-100%)" };
  };
  const hamStyle = () => {
    const base = { position:"fixed", zIndex:300, background:isGlass?"rgba(255,255,255,0.35)":bg, backdropFilter:backdrop, WebkitBackdropFilter:backdrop, border:`1px solid ${border}`, color:theme.textPrimary, fontSize:20, width:46, height:46, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.4)", outline:"none" };
    if (mStyle==="right")  return { ...base, top:14, right:14, borderRadius:12 };
    if (mStyle==="bottom") return { ...base, bottom:20, left:"50%", transform:"translateX(-50%)", borderRadius:"50%" };
    return { ...base, top:14, left:14, borderRadius:12 };
  };

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={hamStyle()}>{open?"✕":"☰"}</button>
      {open && <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:150,backdropFilter:"blur(2px)" }} onClick={()=>setOpen(false)}/>}
      <div style={panelStyle()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 18px 14px",borderBottom:`1px solid ${border}`,flexShrink:0 }}>
          <span style={{ fontSize:16,fontWeight:700,color:theme.textPrimary,letterSpacing:1 }}>
            {isRG ? "Restaura Glass" : "SV Finance"}
          </span>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setShowStyles(s=>!s)} style={{ background:showStyles?`${theme.primary}22`:"transparent",border:`1px solid ${showStyles?theme.primary:border}`,color:showStyles?theme.primary:theme.textMuted,borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:14 }}>⚙</button>
            <button onClick={()=>setOpen(false)} style={{ background:`${theme.primary}22`,border:"none",color:theme.textPrimary,borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:16 }}>✕</button>
          </div>
        </div>
        {showStyles && <StylePicker styles={MOBILE_STYLES} current={mStyle} onSelect={setMStyle} theme={theme} isGlass={isGlass} border={border} inline/>}
        <div style={{ flex:1,padding:"12px",display:"flex",flexDirection:"column",gap:4,overflowY:"auto" }}>
          {isRG ? (
            items.map(group => (
              <div key={group.id}>
                <div onClick={() => toggleGroup(group.id)} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
                  borderRadius:12,textDecoration:"none",cursor:"pointer",
                  color:theme.textMuted,
                  fontSize:13,fontWeight:600,transition:"all 0.2s",
                  background:"transparent",
                  border:"1px solid transparent",
                }}>
                  <span style={{ fontSize:18 }}>{group.icon}</span>
                  <span>{group.label}</span>
                  <span style={{ marginLeft:"auto", fontSize:12, transform:expandedGroups[group.id]?"rotate(180deg)":"rotate(0deg)", transformOrigin:"center", transition:"0.2s" }}>▼</span>
                </div>
                {expandedGroups[group.id] && group.items.map(item => (
                  <Link key={item.nfe?"__nfe__":item.to} to={item.to} onClick={()=>setOpen(false)} style={{
                    display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                    borderRadius:12,textDecoration:"none",marginLeft:12,marginRight:4,
                    color:item.nfe?"#d4af37":theme.textPrimary,
                    fontSize:15,fontWeight:item.nfe||isActive(item.to)?600:400,transition:"all 0.2s",
                    background:item.nfe?"rgba(212,175,55,0.1)":isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                    border:item.nfe?"1px solid rgba(212,175,55,0.3)":isActive(item.to)?`1px solid ${border}`:"1px solid transparent",
                  }}>
                    <span style={{ fontSize:20 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.nfe && <span style={{ marginLeft:"auto", fontSize:8, background:"#d4af37", color:"#000", borderRadius:3, padding:"1px 4px", fontWeight:700 }}>NF-e</span>}
                  </Link>
                ))}
              </div>
            ))
          ) : (
            menuItems.map(item => (
              <Link key={item.nfe?"__nfe__":item.to} to={item.to} onClick={()=>setOpen(false)} style={{
                display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                borderRadius:12,textDecoration:"none",
                color:item.nfe?"#d4af37":theme.textPrimary,
                fontSize:15,fontWeight:item.nfe||isActive(item.to)?600:400,transition:"all 0.2s",
                background:item.nfe?"rgba(212,175,55,0.1)":isActive(item.to)?(isGlass?"rgba(255,255,255,0.35)":theme.sidebarActive):"transparent",
                border:item.nfe?"1px solid rgba(212,175,55,0.3)":isActive(item.to)?`1px solid ${border}`:"1px solid transparent",
              }}>
                <span style={{ fontSize:22 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.nfe && <span style={{ marginLeft:"auto", fontSize:9, background:"#d4af37", color:"#000", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>NF-e</span>}
              </Link>
            ))
          )}
        </div>
        <div style={{ padding:14,flexShrink:0 }}>
          <button onClick={()=>{logoutUser();navigate("/");}} style={{ width:"100%",padding:"14px 16px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,color:"#ef4444",fontSize:15,fontWeight:600,cursor:"pointer",textAlign:"left" }}>
            🚪 Sair
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Sidebar Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { theme, themeId } = useTheme();
  const isGlass   = themeId === "glass" || themeId === "gray";
  const isMobile  = useIsMobile();
  const menuItems = useMenuItems();
  const groups    = useMenuItemsGrouped();
  const isRGval   = isRestauraGlass();
  const [style, setStyle] = useState(getSidebarStyle());

  useEffect(() => {
    const fn = () => setStyle(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", fn);
    return () => window.removeEventListener("sv_sidebar_style_changed", fn);
  }, []);

  if (isMobile) return <SidebarMobile menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} isRG={isRGval}/>;
  if (style==="horizontal")   return <SidebarHorizontal menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} isRG={isRGval}/>;
  if (style==="dock")         return <SidebarDock menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} convex={true} isRG={isRGval}/>;
  if (style==="dock_concave") return <SidebarDock menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} convex={false} isRG={isRGval}/>;
  return <SidebarVertical menuItems={menuItems} groups={groups} theme={theme} isGlass={isGlass} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isRG={isRGval}/>;
}