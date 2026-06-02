import { useTheme } from "../../contexts/ThemeContext";
import worldMap from "../../assets/world-map.svg";
import fundoGlassEGelo from "../../assets/fundoglassegelo.jpg";
import fundoCinzaPrata from "../../assets/fundocinzaprata.jpg";
import fundoRestaura   from "../../assets/fundorestaura.jpg";
import { useState, useEffect, useRef } from "react";
import { getSidebarStyle } from "./Sidebar";

// Mapeia themeId → imagem de fundo
const BG_IMAGES = {
  glass:   fundoGlassEGelo,
  gray:    fundoCinzaPrata,
  clean:   fundoRestaura,
  rg_dark: fundoRestaura,
};

const API = "https://api.svfinance.com.br/api";

function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    const token       = localStorage.getItem("token");
    const accountType = localStorage.getItem("account_type") || "business";
    if (!token) return;
    async function load() {
      try {
        const requests = [
          fetch(`${API}/transactions`, { headers:{ Authorization:`Bearer ${token}` } }),
          fetch(`${API}/bills`,        { headers:{ Authorization:`Bearer ${token}` } }),
        ];
        if (accountType === "personal") {
          requests.push(fetch(`${API}/goals`, { headers:{ Authorization:`Bearer ${token}` } }));
        }
        const responses  = await Promise.all(requests);
        const [resT, resB] = responses;
        const transactions = resT.ok  ? await resT.json()  : [];
        const bills        = resB.ok  ? await resB.json()  : [];
        const goals        = responses[2]?.ok ? await responses[2].json() : [];
        const found = [];
        const today   = new Date(); today.setHours(0,0,0,0);
        const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
        const vencidas = bills.filter(b => { if (b.status === "paid") return false; return new Date(b.due_date + "T00:00:00") < today; });
        if (vencidas.length > 0) {
          found.push({ id:"overdue", type:"error", icon:"🔴",
            title:`${vencidas.length} conta${vencidas.length>1?"s":""} vencida${vencidas.length>1?"s":""}`,
            desc:`Total: ${vencidas.reduce((s,b)=>s+b.amount,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`,
            link:"/bills" });
        }
        const upcoming = bills.filter(b => { if (b.status === "paid") return false; const due = new Date(b.due_date + "T00:00:00"); return due >= today && due <= in7days; });
        if (upcoming.length > 0) {
          found.push({ id:"upcoming", type:"warning", icon:"⏰",
            title:`${upcoming.length} conta${upcoming.length>1?"s":""} vencendo em 7 dias`,
            desc:`Total: ${upcoming.reduce((s,b)=>s+b.amount,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`,
            link:"/bills" });
        }
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
        const monthT = Array.isArray(transactions) ? transactions.filter(t => t.date?.startsWith(currentMonth)) : [];
        const income  = monthT.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
        const expense = monthT.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
        const balance = income - expense;
        if (balance < 200 && monthT.length > 0) {
          found.push({ id:"low_balance", type:"warning", icon:"💸",
            title:"Saldo do mês está baixo",
            desc:`Saldo atual: ${balance.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`,
            link:"/transactions" });
        }
        const prevMonth = today.getMonth() === 0 ? `${today.getFullYear()-1}-12` : `${today.getFullYear()}-${String(today.getMonth()).padStart(2,"0")}`;
        const prevT   = Array.isArray(transactions) ? transactions.filter(t => t.date?.startsWith(prevMonth)) : [];
        const catCurr = {}, catPrev = {};
        monthT.filter(t=>t.type==="expense").forEach(t => { const c=t.category||"Outros"; catCurr[c]=(catCurr[c]||0)+t.amount; });
        prevT.filter(t=>t.type==="expense").forEach(t => { const c=t.category||"Outros"; catPrev[c]=(catPrev[c]||0)+t.amount; });
        Object.entries(catCurr).forEach(([cat,val]) => {
          const prev = catPrev[cat] || 0;
          if (prev > 0 && val > prev * 1.3) {
            found.push({ id:`cat_${cat}`, type:"info", icon:"📊",
              title:`Gastos com ${cat} aumentaram`,
              desc:`${Math.round((val/prev-1)*100)}% a mais que o mês anterior`,
              link:"/analytics" });
          }
        });
        if (Array.isArray(goals)) {
          goals.filter(g => g.status==="active" && g.progress >= 80 && g.progress < 100).forEach(g => {
            found.push({ id:`goal_${g.id}`, type:"success", icon:"🎯",
              title:`Meta "${g.name}" quase lá!`,
              desc:`${g.progress}% concluída — faltam ${g.remaining.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`,
              link:"/goals" });
          });
          goals.filter(g => g.status==="active" && g.deadline).forEach(g => {
            const due  = new Date(g.deadline + "T00:00:00");
            const days = Math.round((due - today) / (1000*60*60*24));
            if (days >= 0 && days <= 30 && g.progress < 100) {
              found.push({ id:`goal_deadline_${g.id}`, type:"warning", icon:"⏳",
                title:`Prazo da meta "${g.name}" se aproxima`,
                desc:`${days} dia${days!==1?"s":""} restante${days!==1?"s":""}`,
                link:"/goals" });
            }
          });
        }
        setAlerts(found);
      } catch {}
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return alerts;
}

function NotificationBell({ alerts, theme, isGlass }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const dragging        = useRef(false);
  const dragStart       = useRef({ mx:0, my:0, bx:0, by:0 });
  const didDrag         = useRef(false);
  const BELL_KEY = "sv_bell_pos";
  const getInitialPos = () => {
    try { const s = JSON.parse(localStorage.getItem(BELL_KEY)); if (s) return s; } catch {}
    return { x: window.innerWidth - 60, y: 14 };
  };
  const [pos, setPos] = useState(getInitialPos);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const onMouseDown = (e) => {
    e.preventDefault(); dragging.current = true; didDrag.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, bx: pos.x, by: pos.y };
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx; const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      setPos({ x: Math.max(0, Math.min(window.innerWidth-44, dragStart.current.bx+dx)), y: Math.max(0, Math.min(window.innerHeight-44, dragStart.current.by+dy)) });
    };
    const onUp = () => { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setPos(p => { localStorage.setItem(BELL_KEY, JSON.stringify(p)); return p; }); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  };
  const onTouchStart = (e) => {
    const t = e.touches[0]; dragging.current = true; didDrag.current = false;
    dragStart.current = { mx: t.clientX, my: t.clientY, bx: pos.x, by: pos.y };
    const onMove = (e) => {
      const t = e.touches[0]; const dx = t.clientX - dragStart.current.mx; const dy = t.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      setPos({ x: Math.max(0, Math.min(window.innerWidth-44, dragStart.current.bx+dx)), y: Math.max(0, Math.min(window.innerHeight-44, dragStart.current.by+dy)) });
    };
    const onUp = () => { dragging.current = false; document.removeEventListener("touchmove", onMove); document.removeEventListener("touchend", onUp); setPos(p => { localStorage.setItem(BELL_KEY, JSON.stringify(p)); return p; }); };
    document.addEventListener("touchmove", onMove, { passive:false }); document.addEventListener("touchend", onUp);
  };
  const colorMap = {
    error:  { bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.3)",  text:"#ef4444" },
    warning:{ bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)", text:"#f59e0b" },
    info:   { bg:"rgba(99,102,241,0.12)", border:"rgba(99,102,241,0.3)", text:"#818cf8" },
    success:{ bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.3)",  text:"#22c55e" },
  };
  return (
    <div ref={ref} style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:400 }}>
      <button onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        onClick={() => { if (!didDrag.current) setOpen(o => !o); }}
        style={{ position:"relative", background:isGlass?"rgba(255,255,255,0.35)":"rgba(15,23,42,0.7)",
          backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)"}`,
          borderRadius:12, width:44, height:44, cursor:dragging.current?"grabbing":"grab", fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:isGlass?"0 4px 16px rgba(0,0,0,0.1)":"0 4px 16px rgba(0,0,0,0.4)",
          transition:dragging.current?"none":"transform 0.2s", userSelect:"none" }}
        onMouseEnter={e => { if (!dragging.current) e.currentTarget.style.transform="scale(1.08)"; }}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
        🔔
        {alerts.length > 0 && (
          <div style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid transparent", animation:"pulse 2s infinite" }}>
            {alerts.length > 9 ? "9+" : alerts.length}
          </div>
        )}
      </button>
      {open && (
        <div style={{ position:"absolute", top:52, right:0, width:340,
          background:isGlass?"rgba(255,255,255,0.75)":"rgba(15,23,42,0.95)",
          backdropFilter:"blur(20px) saturate(180%)", WebkitBackdropFilter:"blur(20px) saturate(180%)",
          border:`1px solid ${isGlass?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)"}`,
          borderRadius:16, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 20px 60px rgba(0,0,0,0.6)",
          overflow:"hidden", maxHeight:480, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 18px 12px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:isGlass?"#0f172a":theme.textPrimary }}>Notificações</div>
              <div style={{ fontSize:12, color:isGlass?"#64748b":theme.textMuted, marginTop:2 }}>{alerts.length===0?"Tudo em dia! ✅":`${alerts.length} alerta${alerts.length>1?"s":""}`}</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:"transparent", border:"none", color:isGlass?"#64748b":theme.textMuted, cursor:"pointer", fontSize:16, padding:4 }}>✕</button>
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            {alerts.length === 0 ? (
              <div style={{ padding:"32px 18px", textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:8 }}>✅</div>
                <div style={{ color:isGlass?"#64748b":theme.textMuted, fontSize:14 }}>Nenhum alerta no momento</div>
              </div>
            ) : alerts.map(a => {
              const c = colorMap[a.type] || colorMap.info;
              return (
                <a key={a.id} href={a.link} onClick={() => setOpen(false)}
                  style={{ display:"flex", gap:12, padding:"12px 18px", textDecoration:"none", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.05)"}`, transition:"background 0.15s", background:"transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background=isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <div style={{ width:36, height:36, borderRadius:10, background:c.bg, border:`1px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:isGlass?"#0f172a":theme.textPrimary, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize:12, color:isGlass?"#64748b":theme.textMuted }}>{a.desc}</div>
                  </div>
                  <div style={{ fontSize:12, color:c.text, fontWeight:700, alignSelf:"center", flexShrink:0 }}>→</div>
                </a>
              );
            })}
          </div>
          {alerts.length > 0 && (
            <div style={{ padding:"10px 18px", borderTop:`1px solid ${isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)"}`, textAlign:"center" }}>
              <div style={{ fontSize:11, color:isGlass?"#94a3b8":theme.textMuted }}>Atualizado automaticamente a cada 5 min</div>
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.15);opacity:0.85;} }
      `}</style>
    </div>
  );
}

export default function PageLayout({ children, style }) {
  const { theme, themeId } = useTheme();
  const alerts = useAlerts();
  const bgImage    = BG_IMAGES[themeId] || null;
  const isImgTheme = !!bgImage;
  const isGlass    = themeId === "glass" || themeId === "gray" || themeId === "clean" || themeId === "rg_dark";
  const [sidebarStyle, setSidebarStyle] = useState(getSidebarStyle());
  const isHorizontal = sidebarStyle === "horizontal";
  const TOPBAR_H = 54;
  useEffect(() => {
    const fn = () => setSidebarStyle(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", fn);
    return () => window.removeEventListener("sv_sidebar_style_changed", fn);
  }, []);
  return (
    <div style={{
      display:"flex", minHeight:"100vh",
      background: isImgTheme ? theme.bgImageFallback : theme.bgPrimary,
      ...(isImgTheme && { backgroundImage:`url(${bgImage})`, backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed" }),
      color:theme.textPrimary,
      fontFamily:"'Inter','Segoe UI',sans-serif",
      position:"relative",
      paddingTop: isHorizontal ? TOPBAR_H : 0,
      flexDirection: isHorizontal ? "column" : "row",
      ...style,
    }}>
      <style>{`
        select { color:${theme.textPrimary}!important; background-color:${theme.bgInput}!important; }
        select option { color:${isGlass?"#0a0f1a":"#ffffff"}!important; background-color:${isGlass?"#e8f0f8":"#1e293b"}!important; }
        input, textarea { color:${theme.textPrimary}!important; }
        input::placeholder, textarea::placeholder { color:${theme.textMuted}!important; opacity:1; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${isGlass?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.1)"}; border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:${isGlass?"rgba(0,0,0,0.35)":"rgba(255,255,255,0.2)"}; }
        select[style*="border-radius: 20px"], select[style*="border-radius:20px"] { color:${isGlass?"#0f172a":theme.textPrimary}!important; font-weight:600!important; }
        select option:hover, select option:focus, select option:checked { background:${isGlass?"#dbeafe":"#1e40af"}!important; color:${isGlass?"#1e3a8a":"#ffffff"}!important; }
      `}</style>
      {isImgTheme && <div style={{ position:"fixed", inset:0, background:theme.bgOverlay, pointerEvents:"none", zIndex:0 }}/>}
      {!isImgTheme && <div style={{ position:"fixed", inset:0, backgroundImage:`url(${worldMap})`, backgroundRepeat:"no-repeat", backgroundPosition:"center", backgroundSize:"1100px", opacity:theme.mapOpacity, pointerEvents:"none", zIndex:0 }}/>}
      <NotificationBell alerts={alerts} theme={theme} isGlass={isGlass}/>
      {children}
    </div>
  );
}