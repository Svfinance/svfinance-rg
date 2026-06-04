import { useTheme } from "../../contexts/ThemeContext";
import fundoGlassEGelo from "../../assets/fundoglassegelo.jpg";
import fundoCinzaPrata from "../../assets/fundocinzaprata.jpg";
import fundoRestaura   from "../../assets/fundorestaura.jpg";
import { useState, useEffect, useRef } from "react";
import { getSidebarStyle } from "./Sidebar";

// fundorestaura.jpg só para o tema escuro (rg_dark)
// clean usa fundo branco (bgPrimary CSS, sem imagem)
const BG_IMAGES = {
  glass:   fundoGlassEGelo,
  gray:    fundoCinzaPrata,
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
        if (accountType === "personal")
          requests.push(fetch(`${API}/goals`, { headers:{ Authorization:`Bearer ${token}` } }));
        const responses = await Promise.all(requests);
        const [resT, resB] = responses;
        const transactions = resT.ok ? await resT.json() : [];
        const bills        = resB.ok ? await resB.json() : [];
        const goals        = responses[2]?.ok ? await responses[2].json() : [];
        const found = [];
        const today   = new Date(); today.setHours(0,0,0,0);
        const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
        const vencidas = bills.filter(b => !b.status==="paid" && new Date(b.due_date+"T00:00:00") < today);
        if (vencidas.length > 0)
          found.push({ id:"overdue", type:"error", icon:"🔴", title:`${vencidas.length} conta${vencidas.length>1?"s":""} vencida${vencidas.length>1?"s":""}`, desc:`Total: ${vencidas.reduce((s,b)=>s+b.amount,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`, link:"/bills" });
        const upcoming = bills.filter(b => { if (b.status==="paid") return false; const d=new Date(b.due_date+"T00:00:00"); return d>=today&&d<=in7days; });
        if (upcoming.length > 0)
          found.push({ id:"upcoming", type:"warning", icon:"⏰", title:`${upcoming.length} conta${upcoming.length>1?"s":""} vencendo em 7 dias`, desc:`Total: ${upcoming.reduce((s,b)=>s+b.amount,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`, link:"/bills" });
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
        const monthT = Array.isArray(transactions) ? transactions.filter(t=>t.date?.startsWith(currentMonth)) : [];
        const balance = monthT.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)
                      - monthT.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
        if (balance < 200 && monthT.length > 0)
          found.push({ id:"low_balance", type:"warning", icon:"💸", title:"Saldo do mês está baixo", desc:`Saldo atual: ${balance.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`, link:"/transactions" });
        if (Array.isArray(goals)) {
          goals.filter(g=>g.status==="active"&&g.progress>=80&&g.progress<100).forEach(g=>
            found.push({ id:`goal_${g.id}`, type:"success", icon:"🎯", title:`Meta "${g.name}" quase lá!`, desc:`${g.progress}% concluída`, link:"/goals" }));
          goals.filter(g=>g.status==="active"&&g.deadline).forEach(g=>{
            const due=new Date(g.deadline+"T00:00:00");
            const days=Math.round((due-today)/(1000*60*60*24));
            if (days>=0&&days<=30&&g.progress<100)
              found.push({ id:`goal_dl_${g.id}`, type:"warning", icon:"⏳", title:`Prazo da meta "${g.name}" se aproxima`, desc:`${days} dia${days!==1?"s":""} restante${days!==1?"s":""}`, link:"/goals" });
          });
        }
        setAlerts(found);
      } catch {}
    }
    load();
    const iv = setInterval(load, 5*60*1000);
    return () => clearInterval(iv);
  }, []);
  return alerts;
}

function NotificationBell({ alerts, theme, isGlass }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx:0,my:0,bx:0,by:0 });
  const didDrag = useRef(false);
  const BELL_KEY = "sv_bell_pos";
  const getPos = () => { try { const s=JSON.parse(localStorage.getItem(BELL_KEY)); if(s)return s; }catch{} return { x:window.innerWidth-60,y:14 }; };
  const [pos, setPos] = useState(getPos);
  useEffect(() => {
    const fn = e => { if(ref.current&&!ref.current.contains(e.target))setOpen(false); };
    document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn);
  }, []);
  const startDrag = (mx,my) => {
    dragging.current=true; didDrag.current=false;
    dragStart.current={mx,my,bx:pos.x,by:pos.y};
  };
  const moveDrag = (mx,my) => {
    if(!dragging.current)return;
    const dx=mx-dragStart.current.mx,dy=my-dragStart.current.my;
    if(Math.abs(dx)>3||Math.abs(dy)>3)didDrag.current=true;
    setPos({x:Math.max(0,Math.min(window.innerWidth-44,dragStart.current.bx+dx)),y:Math.max(0,Math.min(window.innerHeight-44,dragStart.current.by+dy))});
  };
  const endDrag = () => { dragging.current=false; setPos(p=>{localStorage.setItem(BELL_KEY,JSON.stringify(p));return p;}); };
  const colorMap = { error:{bg:"rgba(239,68,68,0.12)",border:"rgba(239,68,68,0.3)",text:"#ef4444"}, warning:{bg:"rgba(245,158,11,0.12)",border:"rgba(245,158,11,0.3)",text:"#f59e0b"}, info:{bg:"rgba(99,102,241,0.12)",border:"rgba(99,102,241,0.3)",text:"#818cf8"}, success:{bg:"rgba(34,197,94,0.12)",border:"rgba(34,197,94,0.3)",text:"#22c55e"} };
  return (
    <div ref={ref} style={{position:"fixed",left:pos.x,top:pos.y,zIndex:400}}>
      <button
        onMouseDown={e=>{e.preventDefault();startDrag(e.clientX,e.clientY);const om=e2=>moveDrag(e2.clientX,e2.clientY);const ou=()=>{endDrag();document.removeEventListener("mousemove",om);document.removeEventListener("mouseup",ou);};document.addEventListener("mousemove",om);document.addEventListener("mouseup",ou);}}
        onTouchStart={e=>{const t=e.touches[0];startDrag(t.clientX,t.clientY);const om=e2=>{const t2=e2.touches[0];moveDrag(t2.clientX,t2.clientY);};const ou=()=>{endDrag();document.removeEventListener("touchmove",om);document.removeEventListener("touchend",ou);};document.addEventListener("touchmove",om,{passive:false});document.addEventListener("touchend",ou);}}
        onClick={()=>{if(!didDrag.current)setOpen(o=>!o);}}
        style={{position:"relative",background:isGlass?"rgba(255,255,255,0.35)":"rgba(15,23,42,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)"}`,borderRadius:12,width:44,height:44,cursor:"grab",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:isGlass?"0 4px 16px rgba(0,0,0,0.1)":"0 4px 16px rgba(0,0,0,0.4)",userSelect:"none"}}>
        🔔
        {alerts.length>0&&<div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 2s infinite"}}>{alerts.length>9?"9+":alerts.length}</div>}
      </button>
      {open&&(
        <div style={{position:"absolute",top:52,right:0,width:340,background:isGlass?"rgba(255,255,255,0.75)":"rgba(15,23,42,0.95)",backdropFilter:"blur(20px) saturate(180%)",WebkitBackdropFilter:"blur(20px) saturate(180%)",border:`1px solid ${isGlass?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)"}`,borderRadius:16,boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 20px 60px rgba(0,0,0,0.6)",overflow:"hidden",maxHeight:480,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:isGlass?"#0f172a":theme.textPrimary}}>Notificações</div>
              <div style={{fontSize:12,color:isGlass?"#64748b":theme.textMuted,marginTop:2}}>{alerts.length===0?"Tudo em dia! ✅":`${alerts.length} alerta${alerts.length>1?"s":""}`}</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",color:isGlass?"#64748b":theme.textMuted,cursor:"pointer",fontSize:16,padding:4}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {alerts.length===0?(
              <div style={{padding:"32px 18px",textAlign:"center"}}>
                <div style={{fontSize:"2.5rem",marginBottom:8}}>✅</div>
                <div style={{color:isGlass?"#64748b":theme.textMuted,fontSize:14}}>Nenhum alerta no momento</div>
              </div>
            ):alerts.map(a=>{
              const c=colorMap[a.type]||colorMap.info;
              return(
                <a key={a.id} href={a.link} onClick={()=>setOpen(false)} style={{display:"flex",gap:12,padding:"12px 18px",textDecoration:"none",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.05)"}`,transition:"background 0.15s",background:"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:36,height:36,borderRadius:10,background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>{a.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:isGlass?"#0f172a":theme.textPrimary,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</div>
                    <div style={{fontSize:12,color:isGlass?"#64748b":theme.textMuted}}>{a.desc}</div>
                  </div>
                  <div style={{fontSize:12,color:c.text,fontWeight:700,alignSelf:"center",flexShrink:0}}>→</div>
                </a>
              );
            })}
          </div>
          {alerts.length>0&&<div style={{padding:"10px 18px",borderTop:`1px solid ${isGlass?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)"}`,textAlign:"center"}}><div style={{fontSize:11,color:isGlass?"#94a3b8":theme.textMuted}}>Atualizado a cada 5 min</div></div>}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.15);opacity:0.85;}}`}</style>
    </div>
  );
}

// Renderizado APENAS quando company_id === "17" (isRestauraGlass)
function RGBackground() {
  return (
    <>
      <style>{`
        .rg-bg-wrapper {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .rg-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 30%,
              rgba(43,81,2,0.08) 0%,
              rgba(43,81,2,0.03) 50%,
              transparent 100%),
            radial-gradient(ellipse 60% 80% at 80% 80%,
              rgba(43,81,2,0.06) 0%,
              transparent 70%);
        }
        .rg-bg-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -52%);
          width: min(520px, 75vw);
          opacity: 0.045;
          filter: grayscale(0%) saturate(0.8) brightness(0.6);
          user-select: none;
          -webkit-user-select: none;
        }
        .rg-bg-logo-corner {
          position: absolute;
          bottom: 32px;
          right: 40px;
          width: 140px;
          opacity: 0.06;
          filter: grayscale(20%) saturate(0.7);
          user-select: none;
          -webkit-user-select: none;
        }
        .rg-bg-topline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(43,81,2,0.4) 30%,
            rgba(43,81,2,0.6) 50%,
            rgba(43,81,2,0.4) 70%,
            transparent 100%
          );
        }
        @media (max-width: 768px) {
          .rg-bg-logo {
            width: min(320px, 90vw);
            opacity: 0.035;
          }
          .rg-bg-logo-corner {
            display: none;
          }
        }
      `}</style>
      <div className="rg-bg-wrapper">
        <div className="rg-bg-gradient" />
        <div className="rg-bg-topline" />
        <img
          className="rg-bg-logo"
          src="/logos/restauraglass.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <img
          className="rg-bg-logo-corner"
          src="/logos/restauraglass.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </div>
    </>
  );
}

export default function PageLayout({ children, style }) {
  const { theme, themeId } = useTheme();
  const alerts = useAlerts();
  const bgImage    = BG_IMAGES[themeId] || null;
  const isImgTheme = !!bgImage;
  const isGlass    = themeId==="glass" || themeId==="gray" || themeId==="rg_dark";
  const isClean    = themeId==="clean";
  const [sidebarStyle, setSidebarStyle] = useState(getSidebarStyle());
  const isHorizontal = sidebarStyle === "horizontal";
  const TOPBAR_H = 54;

  // Detecta se é conta Restaura Glass (company_id === "17")
  const isRestauraGlass = localStorage.getItem("company_id") === "17";

  useEffect(() => {
    const fn = () => setSidebarStyle(getSidebarStyle());
    window.addEventListener("sv_sidebar_style_changed", fn);
    return () => window.removeEventListener("sv_sidebar_style_changed", fn);
  }, []);

  return (
    <div style={{
      display:"flex", minHeight:"100vh",
      background: isImgTheme
        ? theme.bgImageFallback || "#020d05"
        : (themeId==="rg_dark" ? "linear-gradient(140deg,#010c05 0%,#021408 35%,#031a0c 65%,#010c05 100%)" : theme.bgPrimary),
      ...(isImgTheme && { backgroundImage:`url(${bgImage})`, backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed" }),
      color: theme.textPrimary,
      fontFamily:"'Inter','Segoe UI',sans-serif",
      position:"relative",
      paddingTop: isHorizontal ? TOPBAR_H : 0,
      flexDirection: isHorizontal ? "column" : "row",
      ...style,
    }}>
      <style>{`
        select{color:${theme.textPrimary}!important;background-color:${theme.bgInput}!important;}
        select option{color:${isGlass||isClean?"#0a0f1a":"#ffffff"}!important;background-color:${isGlass||isClean?"#e8f0f8":"#1e293b"}!important;}
        input,textarea{color:${theme.textPrimary}!important;}
        input::placeholder,textarea::placeholder{color:${theme.textMuted}!important;opacity:1;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${isGlass?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.1)"};border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:${isGlass?"rgba(0,0,0,0.35)":"rgba(255,255,255,0.2)"};}
      `}</style>

      {/* Overlay para temas com imagem */}
      {isImgTheme && theme.bgOverlay && (
        <div style={{position:"fixed",inset:0,background:theme.bgOverlay,pointerEvents:"none",zIndex:0}}/>
      )}

      {/* Overlay para rg_dark sem imagem — vinheta suave */}
      {themeId==="rg_dark" && !isImgTheme && (
        <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.4) 100%)",pointerEvents:"none",zIndex:0}}/>
      )}

      {/* Marca d'água Restaura Glass — apenas company_id === "17" */}
      {isRestauraGlass && <RGBackground />}

      <NotificationBell alerts={alerts} theme={theme} isGlass={isGlass}/>
      {children}
    </div>
  );
}