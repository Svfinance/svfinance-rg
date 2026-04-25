import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { PRINT_THEMES, buildPrintCSS } from "../utils/printThemes";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(v) {
  return Math.abs(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}
function fmtSigned(v) {
  const s=Math.abs(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  return (v||0)>0?`+${s}`:(v||0)<0?`- ${s}`:s;
}
function fmtDate(d) {
  if(!d||d==="—") return "—";
  try{const [y,m,dd]=d.split("-");return `${dd}/${m}/${y}`;}catch{return d;}
}
function useIsMobile(){
  const [m,setM]=useState(window.innerWidth<=768);
  useEffect(()=>{const h=()=>setM(window.innerWidth<=768);window.addEventListener("resize",h);return ()=>window.removeEventListener("resize",h);},[]);
  return m;
}

const REPORTS=[
  {id:"dre",      icon:"📊",title:"DRE",                  sub:"Demonstrativo de Resultado",         color:"#6366f1"},
  {id:"cashflow", icon:"💵",title:"Fluxo de Caixa",        sub:"Entradas, saídas e saldo acumulado", color:"#22c55e"},
  {id:"bills",    icon:"📋",title:"Contas a Pagar/Receber",sub:"Vencidas, a vencer e pagas",         color:"#f59e0b"},
  {id:"products", icon:"📦",title:"Produtos",              sub:"Estoque e valor por produto",        color:"#3b82f6"},
  {id:"sales",    icon:"🛒",title:"Vendas",                sub:"PED, OS, faturamento e clientes",    color:"#ec4899"},
  {id:"stock",    icon:"🏭",title:"Estoque",               sub:"Entradas, saídas e ajustes",         color:"#14b8a6"},
];

const URGENCY={
  vencidas:       {label:"🔴 Vencidas",              color:"#ef4444",bg:"rgba(239,68,68,0.08)",  border:"rgba(239,68,68,0.25)"},
  a_vencer_7:     {label:"⚠️ Vence em até 7 dias",  color:"#f59e0b",bg:"rgba(245,158,11,0.08)",border:"rgba(245,158,11,0.25)"},
  a_vencer_15:    {label:"🟡 Vence em 8 a 15 dias", color:"#eab308",bg:"rgba(234,179,8,0.07)",  border:"rgba(234,179,8,0.25)"},
  a_vencer_30:    {label:"🔵 Vence em 16 a 30 dias",color:"#3b82f6",bg:"rgba(59,130,246,0.07)", border:"rgba(59,130,246,0.25)"},
  a_vencer_30_plus:{label:"⏳ Vence em +30 dias",   color:"#6366f1",bg:"rgba(99,102,241,0.07)", border:"rgba(99,102,241,0.25)"},
  pagas:          {label:"✅ Pagas no Período",       color:"#22c55e",bg:"rgba(34,197,94,0.07)",  border:"rgba(34,197,94,0.25)"},
};

// ─── FilterBar shared ────────────────────────────────────────────────────────
function FilterBar({periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,
  dataInicio,setDataInicio,dataFim,setDataFim,anos,loading,onGerar,
  theme,isGlass,extraFilters,printTheme,setPrintTheme}){
  const inp={background:isGlass?"rgba(255,255,255,0.4)":theme.bgInput,border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderInput}`,
    borderRadius:8,padding:"9px 12px",color:theme.textPrimary,fontSize:14,outline:"none",colorScheme:isGlass?"light":"dark"};
  const lbl={color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"};
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"flex-end"}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <label style={lbl}>Período</label>
        <select value={periodo} onChange={e=>setPeriodo(e.target.value)} style={{...inp,minWidth:160}}>
          <option value="mes">Mês</option><option value="trimestre">Trimestre</option>
          <option value="ano">Ano Completo</option><option value="personalizado">Personalizado</option>
        </select>
      </div>
      {periodo!=="personalizado"&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>Ano</label>
          <select value={ano} onChange={e=>setAno(e.target.value)} style={inp}>
            {(anos.length?anos:[new Date().getFullYear().toString()]).map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {periodo==="mes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>Mês</label>
          <select value={mes} onChange={e=>setMes(e.target.value)} style={inp}>
            {MESES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      )}
      {periodo==="trimestre"&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>Trimestre</label>
          <select value={trimestre} onChange={e=>setTrimestre(e.target.value)} style={inp}>
            <option value="1">1º Tri (Jan-Mar)</option><option value="2">2º Tri (Abr-Jun)</option>
            <option value="3">3º Tri (Jul-Set)</option><option value="4">4º Tri (Out-Dez)</option>
          </select>
        </div>
      )}
      {periodo==="personalizado"&&(<>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>De</label>
          <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} style={inp}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>Até</label>
          <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={inp}/>
        </div>
      </>)}
      {extraFilters}
      {setPrintTheme&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={lbl}>Tema PDF</label>
          <div style={{display:"flex",gap:6}}>
            {Object.values(PRINT_THEMES).map(t=>(
              <button key={t.id} onClick={()=>setPrintTheme(t.id)}
                style={{padding:"7px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                  border:`1px solid ${printTheme===t.id?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
                  background:printTheme===t.id?`${theme.primary}22`:"transparent",
                  color:printTheme===t.id?theme.textActive:theme.textMuted}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={onGerar} disabled={loading}
        style={{background:theme.primaryGrad,color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",
          fontWeight:700,cursor:loading?"not-allowed":"pointer",fontSize:"0.9rem",opacity:loading?0.7:1,
          alignSelf:"flex-end",boxShadow:`0 4px 15px ${theme.primary}44`,whiteSpace:"nowrap"}}>
        {loading?"⏳ Gerando...":"📊 Gerar"}
      </button>
    </div>
  );
}

// ─── DRE ────────────────────────────────────────────────────────────────────
function RelatorioDRE({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [anos,setAnos]=useState([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const [expandido,setExpandido]=useState({});const [printTheme,setPrintTheme]=useState("blue");
  const [periodo,setPeriodo]=useState("ano");const [ano,setAno]=useState(new Date().getFullYear().toString());
  const [mes,setMes]=useState((new Date().getMonth()+1).toString());const [trimestre,setTrimestre]=useState("1");
  const [dataInicio,setDataInicio]=useState("");const [dataFim,setDataFim]=useState("");
  useEffect(()=>{fetch(`${API}/dre/anos`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>setAnos(d.anos||[])).catch(()=>{});},[]);
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams({periodo,ano});
      if(periodo==="mes")p.append("mes",mes);if(periodo==="trimestre")p.append("trimestre",trimestre);
      if(periodo==="personalizado"){p.append("data_inicio",dataInicio);p.append("data_fim",dataFim);}
      const res=await fetch(`${API}/dre?${p}`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const handlePrint=()=>{
    if(!data)return;
    const T=PRINT_THEMES[printTheme]||PRINT_THEMES.blue;
    const logoHtml=data.company_logo?`<img src="${data.company_logo}"/>`:`<span class="logo-placeholder">📊<br/>LOGO</span>`;
    const buildRows=(items,indent=0)=>items.map((item,i)=>{
      const hasKids=item.children?.length>0;
      return `<tr style="${i%2===0&&!hasKids?`background:${T.rowEven}`:""}${hasKids?`background:${T.accentLight};font-weight:700`:""}">
        <td style="padding-left:${14+indent*16}px${hasKids?`;color:${T.titleColor}`:""}"> ${item.nome}</td>
        <td class="right" style="color:${(item.valor||0)<0?T.expenseColor:T.incomeColor};font-weight:${hasKids?800:500}">${fmtSigned(item.valor)}</td>
        <td class="right muted">${item.pct_receita!=null?`${item.pct_receita.toFixed(1)}%`:"—"}</td>
      </tr>${hasKids?buildRows(item.children,indent+1):""}`;
    }).join("");
    const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>DRE</title>
<style>${buildPrintCSS(T)}.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.kc{background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:8px;padding:10px 14px}
.kl{font-size:9px;text-transform:uppercase;color:${T.mutedColor};margin-bottom:3px}.kv{font-size:15px;font-weight:800}</style>
</head><body><div class="doc-wrapper"><div class="accent-bar-top"></div><div class="glow-a"></div><div class="glow-b"></div>
<div class="doc-header"><div style="display:flex;align-items:flex-start;gap:14px"><div class="logo-box">${logoHtml}</div>
<div><div class="company-name">${data.company_name}</div><div class="company-meta">DRE — ${data.periodo}</div></div></div>
<div><div class="doc-title">DRE</div><div class="doc-subtitle">Emitido: ${data.emitido_em}</div></div></div>
<div class="divider"></div>
<div class="kg">
<div class="kc"><div class="kl">Receita Bruta</div><div class="kv" style="color:${T.incomeColor}">${fmt(data.receita_bruta)}</div></div>
<div class="kc"><div class="kl">Despesas</div><div class="kv" style="color:${T.expenseColor}">${fmt(data.total_despesas)}</div></div>
<div class="kc"><div class="kl">Lucro Líquido</div><div class="kv" style="color:${(data.lucro_liquido||0)>=0?T.incomeColor:T.expenseColor}">${fmtSigned(data.lucro_liquido)}</div></div>
<div class="kc"><div class="kl">Margem</div><div class="kv" style="color:${T.accent}">${(data.margem_liquida||0).toFixed(1)}%</div></div>
</div><div class="divider"></div>
${(data.secoes||[]).map(s=>`<div class="section-title">${s.nome}</div>
<table><thead><tr><th>Conta</th><th class="right">Valor</th><th class="right">%</th></tr></thead>
<tbody>${buildRows(s.items)}</tbody></table>`).join("")}
<div class="doc-footer">SV Finance · ${data.company_name} · ${data.emitido_em}</div>
<div class="accent-bar-bottom"></div></div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  return(<div>
    <div style={{...card,padding:"20px 24px",marginBottom:20}}>
      <FilterBar {...{periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,dataInicio,setDataInicio,dataFim,setDataFim,anos,loading,theme,isGlass,printTheme,setPrintTheme}} onGerar={fetchData}/>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[{label:"Receita Bruta",valor:fmt(data.receita_bruta),color:theme.income},
          {label:"Despesas",valor:fmt(data.total_despesas),color:theme.expense},
          {label:"Lucro Líquido",valor:fmtSigned(data.lucro_liquido),color:(data.lucro_liquido||0)>=0?theme.income:theme.expense},
          {label:"Margem",valor:`${(data.margem_liquida||0).toFixed(1)}%`,color:theme.primary}].map((c,i)=>(
          <div key={i} style={{...card,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:isMobile?"1rem":"1.15rem",fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
      {(data.secoes||[]).map((s,si)=>(
        <div key={si} style={{...card,marginBottom:16,overflow:"hidden"}}>
          <div style={{padding:"13px 18px",background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`,fontWeight:700,color:theme.textPrimary,fontSize:14}}>
            {s.nome} <span style={{color:theme.primary,fontWeight:800,marginLeft:8}}>{fmtSigned(s.total)}</span>
          </div>
          {(s.items||[]).map((item,ii)=>(
            <div key={ii}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:16,padding:"9px 18px",
                borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
                background:item.children?.length?(isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)"):"transparent",
                cursor:item.children?.length?"pointer":"default"}}
                onClick={()=>item.children?.length&&setExpandido(p=>({...p,[`${si}-${ii}`]:!p[`${si}-${ii}`]}))}>
                <div style={{fontSize:13,color:item.children?.length?theme.textPrimary:theme.textSecondary,fontWeight:item.children?.length?600:400}}>
                  {item.children?.length&&<span style={{fontSize:9,marginRight:6,display:"inline-block",transform:expandido[`${si}-${ii}`]?"rotate(90deg)":"none",transition:"transform 0.2s"}}>▶</span>}
                  {item.nome}
                </div>
                <div style={{textAlign:"right",fontSize:13,fontWeight:item.children?.length?700:400,color:(item.valor||0)<0?theme.expense:theme.income}}>{fmtSigned(item.valor)}</div>
                <div style={{textAlign:"right",fontSize:12,color:theme.textMuted,minWidth:50}}>{item.pct_receita!=null?`${item.pct_receita.toFixed(1)}%`:"—"}</div>
              </div>
              {expandido[`${si}-${ii}`]&&(item.children||[]).map((ch,ci)=>(
                <div key={ci} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:16,padding:"8px 18px 8px 36px",
                  borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)"}`,
                  background:isGlass?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.08)"}}>
                  <div style={{fontSize:12,color:theme.textMuted}}>{ch.nome}</div>
                  <div style={{textAlign:"right",fontSize:12,color:(ch.valor||0)<0?theme.expense:theme.income}}>{fmtSigned(ch.valor)}</div>
                  <div style={{textAlign:"right",fontSize:11,color:theme.textMuted}}>{ch.pct_receita!=null?`${ch.pct_receita.toFixed(1)}%`:"—"}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      <button onClick={handlePrint} style={{background:"linear-gradient(135deg,#1e40af,#2563eb)",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontWeight:700,cursor:"pointer",fontSize:"0.9rem",boxShadow:"0 4px 16px rgba(37,99,235,0.4)"}}>🖨️ Imprimir / PDF</button>
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>📊</div><div style={{color:theme.textMuted,fontSize:14}}>Configure o período e clique em "Gerar"</div></div>}
  </div>);
}

// ─── FLUXO DE CAIXA ──────────────────────────────────────────────────────────
function RelatorioFluxoCaixa({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [anos,setAnos]=useState([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const [showZero,setShowZero]=useState(false);const [printTheme,setPrintTheme]=useState("blue");
  const [periodo,setPeriodo]=useState("mes");const [ano,setAno]=useState(new Date().getFullYear().toString());
  const [mes,setMes]=useState((new Date().getMonth()+1).toString());const [trimestre,setTrimestre]=useState("1");
  const [dataInicio,setDataInicio]=useState("");const [dataFim,setDataFim]=useState("");
  const [agrupamento,setAgrupamento]=useState("daily");
  useEffect(()=>{fetch(`${API}/cashflow/anos`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>setAnos(d.anos||[])).catch(()=>{});},[]);
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams({periodo,ano,agrupamento});
      if(periodo==="mes")p.append("mes",mes);if(periodo==="trimestre")p.append("trimestre",trimestre);
      if(periodo==="personalizado"){p.append("data_inicio",dataInicio);p.append("data_fim",dataFim);}
      const res=await fetch(`${API}/cashflow?${p}`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  const visible=data?(showZero?data.rows:data.rows.filter(r=>r.has_data)):[];
  const ind=data?.indicadores||{};
  const extra=(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Agrupar por</label>
      <div style={{display:"flex",gap:6}}>
        {[{v:"daily",label:"📅 Dia"},{v:"weekly",label:"📆 Semana"},{v:"monthly",label:"🗓️ Mês"}].map(a=>(
          <button key={a.v} onClick={()=>setAgrupamento(a.v)}
            style={{padding:"8px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${agrupamento===a.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
              background:agrupamento===a.v?`${theme.primary}22`:"transparent",
              color:agrupamento===a.v?theme.textActive:theme.textMuted}}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
  return(<div>
    <div style={{...card,padding:"20px 24px",marginBottom:20}}>
      <FilterBar {...{periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,dataInicio,setDataInicio,dataFim,setDataFim,anos,loading,theme,isGlass,printTheme,setPrintTheme,extraFilters:extra}} onGerar={fetchData}/>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[{label:"Saldo Inicial",valor:fmt(data.saldo_inicial),color:data.saldo_inicial>=0?theme.income:theme.expense},
          {label:"Total Entradas",valor:fmt(data.total_income),color:theme.income},
          {label:"Total Saídas",valor:fmt(data.total_expense),color:theme.expense},
          {label:"Saldo Final",valor:fmt(data.saldo_final),color:data.saldo_final>=0?theme.income:theme.expense}].map((c,i)=>(
          <div key={i} style={{...card,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:isMobile?"1rem":"1.15rem",fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
      <div style={{...card,marginBottom:20,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:600,color:theme.textPrimary,fontSize:14}}>{data.company_name} — {data.periodo}</div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:theme.textMuted}}>
            <input type="checkbox" checked={showZero} onChange={e=>setShowZero(e.target.checked)} style={{accentColor:theme.primary}}/>
            Dias sem movimento
          </label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr",padding:"9px 18px",
          background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`}}>
          {["Período","Entradas","Saídas",...(!isMobile?["Resultado","Saldo Acum."]:["Saldo"])].map((h,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:theme.textMuted,textAlign:i===0?"left":"right"}}>{h}</div>
          ))}
        </div>
        <div style={{maxHeight:"45vh",overflowY:"auto"}}>
          {visible.map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr",padding:"9px 18px",
              borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
              background:r.net>0?(isGlass?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.04)"):r.net<0?(isGlass?"rgba(239,68,68,0.07)":"rgba(239,68,68,0.04)"):"transparent"}}>
              <div style={{fontSize:13,color:theme.textPrimary}}>{r.label}{r.weekday&&<span style={{fontSize:10,color:theme.textMuted,marginLeft:5}}>({r.weekday})</span>}</div>
              <div style={{textAlign:"right",fontSize:13,color:r.income>0?theme.income:theme.textMuted,fontWeight:r.income>0?600:400}}>{r.income>0?fmt(r.income):"—"}</div>
              <div style={{textAlign:"right",fontSize:13,color:r.expense>0?theme.expense:theme.textMuted,fontWeight:r.expense>0?600:400}}>{r.expense>0?fmt(r.expense):"—"}</div>
              {!isMobile&&<div style={{textAlign:"right",fontSize:13,fontWeight:700,color:r.net>0?theme.income:r.net<0?theme.expense:theme.textMuted}}>{r.net!==0?fmtSigned(r.net):"—"}</div>}
              <div style={{textAlign:"right",fontSize:13,fontWeight:800,color:r.saldo_acumulado>=0?theme.income:theme.expense}}>{fmt(r.saldo_acumulado)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr",padding:"12px 18px",background:theme.primaryGrad,borderTop:`2px solid ${theme.primary}`}}>
          <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>TOTAL DO PERÍODO</div>
          <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:"#fff"}}>{fmt(data.total_income)}</div>
          <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:"#fff"}}>{fmt(data.total_expense)}</div>
          {!isMobile&&<div style={{textAlign:"right",fontSize:14,fontWeight:800,color:"#fff"}}>{fmtSigned(data.saldo_periodo)}</div>}
          <div style={{textAlign:"right",fontSize:14,fontWeight:800,color:"#fff"}}>{fmt(data.saldo_final)}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        {[{label:"Períodos Positivos",valor:ind.dias_positivos,color:theme.income},
          {label:"Períodos Negativos",valor:ind.dias_negativos,color:ind.dias_negativos>0?theme.expense:theme.income},
          {label:"Maior Entrada",valor:fmt(ind.maior_entrada),color:theme.income},
          {label:"Maior Saída",valor:fmt(ind.maior_saida),color:theme.expense}].map((c,i)=>(
          <div key={i} style={{...card,padding:"12px 16px",flex:"1",minWidth:130}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:3}}>{c.label}</div>
            <div style={{fontSize:15,fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>💵</div><div style={{color:theme.textMuted,fontSize:14}}>Configure o período e clique em "Gerar"</div></div>}
  </div>);
}

// ─── CONTAS ──────────────────────────────────────────────────────────────────
function RelatorioContas({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [anos,setAnos]=useState([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const [expanded,setExpanded]=useState({vencidas:true,a_vencer_7:true,a_vencer_15:true,a_vencer_30:false,a_vencer_30_plus:false,pagas:false});
  const [printTheme,setPrintTheme]=useState("blue");
  const [periodo,setPeriodo]=useState("mes");const [ano,setAno]=useState(new Date().getFullYear().toString());
  const [mes,setMes]=useState((new Date().getMonth()+1).toString());const [trimestre,setTrimestre]=useState("1");
  const [dataInicio,setDataInicio]=useState("");const [dataFim,setDataFim]=useState("");
  const [tipo,setTipo]=useState("all");
  useEffect(()=>{fetch(`${API}/bills/report/anos`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>setAnos(d.anos||[])).catch(()=>{});},[]);
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams({periodo,ano,tipo});
      if(periodo==="mes")p.append("mes",mes);if(periodo==="trimestre")p.append("trimestre",trimestre);
      if(periodo==="personalizado"){p.append("data_inicio",dataInicio);p.append("data_fim",dataFim);}
      const res=await fetch(`${API}/bills/report?${p}`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  const tt=data?.totais||{};const s=data?.secoes||{};
  const extraFiltros=(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Tipo</label>
      <div style={{display:"flex",gap:6}}>
        {[{v:"all",label:"Todos"},{v:"payable",label:"📤 A Pagar"},{v:"receivable",label:"📥 A Receber"}].map(t=>(
          <button key={t.v} onClick={()=>setTipo(t.v)}
            style={{padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${tipo===t.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
              background:tipo===t.v?`${theme.primary}22`:"transparent",
              color:tipo===t.v?theme.textActive:theme.textMuted}}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
  const SECOES_LIST=[
    {key:"vencidas",showDays:true,showPaid:false,dayField:"days_late"},
    {key:"a_vencer_7",showDays:true,showPaid:false,dayField:"days_until"},
    {key:"a_vencer_15",showDays:true,showPaid:false,dayField:"days_until"},
    {key:"a_vencer_30",showDays:true,showPaid:false,dayField:"days_until"},
    {key:"a_vencer_30_plus",showDays:true,showPaid:false,dayField:"days_until"},
    {key:"pagas",showDays:false,showPaid:true,dayField:null},
  ];
  return(<div>
    <div style={{...card,padding:"20px 24px",marginBottom:20}}>
      <FilterBar {...{periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,dataInicio,setDataInicio,dataFim,setDataFim,anos,loading,theme,isGlass,printTheme,setPrintTheme,extraFilters:extraFiltros}} onGerar={fetchData}/>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[{icon:"🔴",label:"Total Vencido",valor:fmt(tt.vencidas_total),color:"#ef4444",count:s.vencidas?.length||0},
          {icon:"⚠️",label:"A Vencer",valor:fmt(tt.a_vencer_total),color:"#f59e0b",count:(s.a_vencer_7?.length||0)+(s.a_vencer_15?.length||0)+(s.a_vencer_30?.length||0)+(s.a_vencer_30_plus?.length||0)},
          {icon:"✅",label:"Pagas no Período",valor:fmt(tt.pagas_total),color:theme.income,count:s.pagas?.length||0}].map((c,i)=>(
          <div key={i} style={{...card,padding:"18px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:"1.3rem",marginBottom:6}}>{c.icon}</div>
                <div style={{fontSize:11,color:theme.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:isMobile?"1rem":"1.2rem",fontWeight:800,color:c.color}}>{c.valor}</div>
              </div>
              <div style={{background:`${c.color}22`,border:`1px solid ${c.color}44`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,color:c.color}}>
                {c.count} conta{c.count!==1?"s":""}
              </div>
            </div>
          </div>
        ))}
      </div>
      {SECOES_LIST.map(({key,showDays,showPaid,dayField})=>{
        const bills=s[key];if(!bills||bills.length===0)return null;
        const u=URGENCY[key];const isOpen=expanded[key];
        const total=bills.reduce((acc,b)=>acc+b.amount,0);
        return(
          <div key={key} style={{marginBottom:14}}>
            <div onClick={()=>setExpanded(p=>({...p,[key]:!p[key]}))}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px",
                background:u.bg,border:`1px solid ${u.border}`,borderRadius:isOpen?"12px 12px 0 0":12,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:9,color:u.color,transform:isOpen?"rotate(90deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▶</span>
                <span style={{fontWeight:700,color:u.color,fontSize:14}}>{u.label}</span>
                <span style={{background:`${u.color}22`,color:u.color,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{bills.length}</span>
              </div>
              <span style={{fontWeight:800,color:u.color,fontSize:15}}>{fmt(total)}</span>
            </div>
            {isOpen&&(
              <div style={{border:`1px solid ${u.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
                {bills.map((b,i)=>{
                  const isPay=b.type==="payable";
                  return(
                    <div key={b.id} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr",
                      padding:"10px 16px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
                      background:i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:theme.textPrimary}}>{b.description}</div>
                        {b.category!=="—"&&<div style={{fontSize:11,color:theme.textMuted}}>{b.category}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center"}}>
                        <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,
                          background:isPay?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.12)",
                          color:isPay?"#ef4444":theme.income}}>
                          {isPay?"Pagar":"Receber"}
                        </span>
                      </div>
                      <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:isPay?theme.expense:theme.income,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{fmt(b.amount)}</div>
                      <div style={{textAlign:"right",fontSize:12,color:theme.textSecondary,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{fmtDate(b.due_date)}</div>
                      <div style={{textAlign:"right",fontSize:12,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                        {showPaid&&<span style={{color:theme.income,fontWeight:600}}>{fmtDate(b.paid_date)}</span>}
                        {showDays&&dayField==="days_late"&&<span style={{color:"#ef4444",fontWeight:700}}>{b.days_late}d atrasado</span>}
                        {showDays&&dayField==="days_until"&&<span style={{color:u.color,fontWeight:700}}>em {b.days_until}d</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>📋</div><div style={{color:theme.textMuted,fontSize:14}}>Configure o período e clique em "Gerar"</div></div>}
  </div>);
}

// ─── PRODUTOS ────────────────────────────────────────────────────────────────
function RelatorioProdutos({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);const [search,setSearch]=useState("");
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const res=await fetch(`${API}/products/report`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  const inp={background:isGlass?"rgba(255,255,255,0.4)":theme.bgInput,border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderInput}`,borderRadius:8,padding:"9px 12px",color:theme.textPrimary,fontSize:14,outline:"none",colorScheme:isGlass?"light":"dark"};
  const filtered=(data?.products||[]).filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||"").toLowerCase().includes(search.toLowerCase()));
  return(<div>
    <div style={{...card,padding:"16px 20px",marginBottom:20,display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:200}}>
        <div style={{color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Buscar produto</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou SKU..." style={{...inp,width:"100%",boxSizing:"border-box"}}/>
      </div>
      <button onClick={fetchData} disabled={loading}
        style={{background:theme.primaryGrad,color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontWeight:700,cursor:loading?"not-allowed":"pointer",fontSize:"0.9rem",opacity:loading?0.7:1,boxShadow:`0 4px 15px ${theme.primary}44`,whiteSpace:"nowrap"}}>
        {loading?"⏳ Gerando...":"📊 Gerar"}
      </button>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[{label:"Total Produtos",valor:data.summary?.total_products||0,color:theme.primary},
          {label:"Valor em Estoque",valor:fmt(data.summary?.total_stock_value||0),color:theme.income},
          {label:"Estoque Baixo",valor:data.summary?.below_min||0,color:"#f59e0b"},
          {label:"Sem Estoque",valor:data.summary?.out_of_stock||0,color:theme.expense}].map((c,i)=>(
          <div key={i} style={{...card,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:isMobile?"1rem":"1.15rem",fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
      <div style={{...card,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr",padding:"9px 16px",
          background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`}}>
          {["Produto","SKU","Estoque","Mín.","Valor Estoque"].map((h,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:theme.textMuted,textAlign:i>=2?"right":"left"}}>{h}</div>
          ))}
        </div>
        <div style={{maxHeight:"50vh",overflowY:"auto"}}>
          {filtered.map((p,i)=>{
            const cor=p.stock_qty<=0?theme.expense:p.stock_qty<=(p.stock_min||0)?"#f59e0b":theme.income;
            return(<div key={p.id} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr",padding:"10px 16px",
              borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
              background:i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent"}}>
              <div style={{fontSize:13,fontWeight:500,color:theme.textPrimary}}>{p.name}</div>
              <div style={{fontSize:12,color:theme.textMuted}}>{p.sku||"—"}</div>
              <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:cor}}>{p.stock_qty}</div>
              <div style={{textAlign:"right",fontSize:12,color:theme.textMuted}}>{p.stock_min||"—"}</div>
              <div style={{textAlign:"right",fontSize:13,fontWeight:600,color:theme.income}}>{fmt((p.price||0)*(p.stock_qty||0))}</div>
            </div>);
          })}
        </div>
      </div>
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>📦</div><div style={{color:theme.textMuted,fontSize:14}}>Clique em "Gerar" para ver o relatório de produtos</div></div>}
  </div>);
}

// ─── VENDAS ──────────────────────────────────────────────────────────────────
function RelatorioVendas({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const [printTheme,setPrintTheme]=useState("blue");
  const [periodo,setPeriodo]=useState("mes");const [ano,setAno]=useState(new Date().getFullYear().toString());
  const [mes,setMes]=useState((new Date().getMonth()+1).toString());const [trimestre,setTrimestre]=useState("1");
  const [dataInicio,setDataInicio]=useState("");const [dataFim,setDataFim]=useState("");
  const [status,setStatus]=useState("all");
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams({periodo,ano,status});
      if(periodo==="mes")p.append("mes",mes);if(periodo==="trimestre")p.append("trimestre",trimestre);
      if(periodo==="personalizado"){p.append("data_inicio",dataInicio);p.append("data_fim",dataFim);}
      const res=await fetch(`${API}/orders/report?${p}`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  const t=data?.totais||{};
  const STATUS_LABELS={open:"Em Aberto",done:"Concluído",cancelled:"Cancelado"};
  const STATUS_COLORS={open:"#f59e0b",done:theme.income,cancelled:"#6b7280"};
  const extraFiltros=(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Status</label>
      <div style={{display:"flex",gap:6}}>
        {[{v:"all",label:"Todos"},{v:"done",label:"✅ Concluídas"},{v:"open",label:"⏳ Em Aberto"}].map(s=>(
          <button key={s.v} onClick={()=>setStatus(s.v)}
            style={{padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${status===s.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
              background:status===s.v?`${theme.primary}22`:"transparent",
              color:status===s.v?theme.textActive:theme.textMuted}}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
  return(<div>
    <div style={{...card,padding:"20px 24px",marginBottom:20}}>
      <FilterBar {...{periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,dataInicio,setDataInicio,dataFim,setDataFim,
        anos:[new Date().getFullYear().toString()],loading,theme,isGlass,printTheme,setPrintTheme,extraFilters:extraFiltros}} onGerar={fetchData}/>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[{label:"Total Faturado",valor:fmt(t.total_faturado),color:theme.income},
          {label:"Total PED",valor:fmt(t.total_pedidos),color:"#6366f1"},
          {label:"Total OS",valor:fmt(t.total_os),color:"#3b82f6"},
          {label:"Ticket Médio",valor:fmt(t.ticket_medio),color:theme.primary}].map((c,i)=>(
          <div key={i} style={{...card,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:isMobile?"1rem":"1.15rem",fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
      {data.top_clientes?.length>0&&(
        <div style={{...card,marginBottom:20,overflow:"hidden"}}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`,fontWeight:700,color:theme.textPrimary,fontSize:14}}>🏆 Top Clientes</div>
          {data.top_clientes.slice(0,5).map((c,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 18px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:theme.primary,color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{i+1}</span>
                <span style={{fontSize:13,color:theme.textPrimary}}>{c.name}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:theme.income}}>{fmt(c.total)}</div>
                <div style={{fontSize:11,color:theme.textMuted}}>{c.count} pedido{c.count!==1?"s":""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{...card,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr",padding:"9px 16px",
          background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`}}>
          {["Número","Cliente","Tipo","Status","Total"].map((h,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:theme.textMuted,textAlign:i>=3?"right":"left"}}>{h}</div>
          ))}
        </div>
        <div style={{maxHeight:"45vh",overflowY:"auto"}}>
          {(data.orders||[]).map((o,i)=>(
            <div key={o.id} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr",
              padding:"10px 16px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
              background:i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent"}}>
              <div style={{fontSize:13,fontWeight:600,color:theme.textPrimary}}>{o.number}</div>
              <div style={{fontSize:12,color:theme.textSecondary}}>{o.client_name}</div>
              <div style={{display:"flex",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:20,
                  background:o.doc_type==="PED"?"rgba(99,102,241,0.15)":"rgba(59,130,246,0.15)",
                  color:o.doc_type==="PED"?"#6366f1":"#3b82f6"}}>{o.doc_type}</span>
              </div>
              <div style={{textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                <span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:20,
                  background:`${STATUS_COLORS[o.status]||"#6b7280"}22`,color:STATUS_COLORS[o.status]||"#6b7280"}}>
                  {STATUS_LABELS[o.status]||o.status}
                </span>
              </div>
              <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:theme.income}}>{fmt(o.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>🛒</div><div style={{color:theme.textMuted,fontSize:14}}>Configure o período e clique em "Gerar"</div></div>}
  </div>);
}

// ─── ESTOQUE ─────────────────────────────────────────────────────────────────
function RelatorioEstoque({theme,isGlass,isMobile}){
  const navigate=useNavigate();
  const [data,setData]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const [printTheme,setPrintTheme]=useState("blue");
  const [periodo,setPeriodo]=useState("mes");const [ano,setAno]=useState(new Date().getFullYear().toString());
  const [mes,setMes]=useState((new Date().getMonth()+1).toString());const [trimestre,setTrimestre]=useState("1");
  const [dataInicio,setDataInicio]=useState("");const [dataFim,setDataFim]=useState("");
  const [tipoMov,setTipoMov]=useState("all");const [activeTab,setActiveTab]=useState("movimentos");
  const fetchData=async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams({periodo,ano,tipo:tipoMov});
      if(periodo==="mes")p.append("mes",mes);if(periodo==="trimestre")p.append("trimestre",trimestre);
      if(periodo==="personalizado"){p.append("data_inicio",dataInicio);p.append("data_fim",dataFim);}
      const res=await fetch(`${API}/stock/report?${p}`,{headers:{Authorization:`Bearer ${token()}`}});
      if(res.status===401){navigate("/");return;}
      const json=await res.json();if(json.error)throw new Error(json.error);setData(json);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};
  const t=data?.totais||{};
  const TYPE_LABELS={in:"Entrada",out:"Saída",adjustment:"Ajuste"};
  const TYPE_COLORS={in:theme.income,out:theme.expense,adjustment:"#f59e0b"};
  const extraFiltros=(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{color:theme.textMuted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Tipo</label>
      <div style={{display:"flex",gap:6}}>
        {[{v:"all",label:"Todos"},{v:"in",label:"📥 Entradas"},{v:"out",label:"📤 Saídas"},{v:"adjustment",label:"🔧 Ajustes"}].map(s=>(
          <button key={s.v} onClick={()=>setTipoMov(s.v)}
            style={{padding:"7px 10px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${tipoMov===s.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
              background:tipoMov===s.v?`${theme.primary}22`:"transparent",
              color:tipoMov===s.v?theme.textActive:theme.textMuted}}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
  return(<div>
    <div style={{...card,padding:"20px 24px",marginBottom:20}}>
      <FilterBar {...{periodo,setPeriodo,ano,setAno,mes,setMes,trimestre,setTrimestre,dataInicio,setDataInicio,dataFim,setDataFim,
        anos:[new Date().getFullYear().toString()],loading,theme,isGlass,printTheme,setPrintTheme,extraFilters:extraFiltros}} onGerar={fetchData}/>
    </div>
    {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,color:"#ef4444",fontSize:13}}>❌ {error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[{label:"Total Movimentos",valor:t.total_movimentos,color:theme.primary},
          {label:"Entradas",valor:`${t.total_entradas} un`,color:theme.income},
          {label:"Saídas",valor:`${t.total_saidas} un`,color:theme.expense},
          {label:"Ajustes",valor:`${t.total_ajustes} un`,color:"#f59e0b"}].map((c,i)=>(
          <div key={i} style={{...card,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:theme.textMuted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:isMobile?"1rem":"1.15rem",fontWeight:800,color:c.color}}>{c.valor}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[{v:"movimentos",label:"📋 Movimentações"},{v:"saldo",label:"📦 Saldo Atual"},{v:"top",label:"🏆 Mais Movimentados"}].map(tab=>(
          <button key={tab.v} onClick={()=>setActiveTab(tab.v)}
            style={{padding:"9px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
              border:`1px solid ${activeTab===tab.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
              background:activeTab===tab.v?`${theme.primary}22`:"transparent",
              color:activeTab===tab.v?theme.textActive:theme.textMuted}}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab==="movimentos"&&(
        <div style={{...card,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr",padding:"9px 16px",
            background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`}}>
            {["Produto","SKU","Tipo","Qtd","Data"].map((h,i)=>(
              <div key={i} style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:theme.textMuted,textAlign:i>=2?"right":"left"}}>{h}</div>
            ))}
          </div>
          <div style={{maxHeight:"45vh",overflowY:"auto"}}>
            {(data.movements||[]).map((m,i)=>(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr",
                padding:"10px 16px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
                background:i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent"}}>
                <div style={{fontSize:13,fontWeight:500,color:theme.textPrimary}}>{m.product_name}</div>
                <div style={{fontSize:12,color:theme.textMuted}}>{m.product_sku}</div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:20,
                    background:`${TYPE_COLORS[m.type]||"#6b7280"}22`,color:TYPE_COLORS[m.type]||"#6b7280"}}>
                    {TYPE_LABELS[m.type]||m.type}
                  </span>
                </div>
                <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:TYPE_COLORS[m.type]||theme.textPrimary}}>
                  {m.type==="out"?"-":"+"}{m.quantity}
                </div>
                <div style={{textAlign:"right",fontSize:12,color:theme.textMuted}}>{m.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab==="saldo"&&(
        <div style={{...card,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr",padding:"9px 16px",
            background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`}}>
            {["Produto","SKU","Estoque","Mín."].map((h,i)=>(
              <div key={i} style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:theme.textMuted,textAlign:i>=2?"right":"left"}}>{h}</div>
            ))}
          </div>
          <div style={{maxHeight:"50vh",overflowY:"auto"}}>
            {(data.current_stock||[]).map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr",
                padding:"10px 16px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,
                background:i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent"}}>
                <div style={{fontSize:13,fontWeight:500,color:theme.textPrimary}}>{p.name}</div>
                <div style={{fontSize:12,color:theme.textMuted}}>{p.sku}</div>
                <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:p.below_min||p.stock_qty<=0?theme.expense:theme.income}}>{p.stock_qty}</div>
                <div style={{textAlign:"right",fontSize:12,color:theme.textMuted}}>{p.stock_min||"—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab==="top"&&(
        <div style={{...card,overflow:"hidden"}}>
          {(data.mais_movimentados||[]).map((p,i)=>(
            <div key={p.product_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 18px",borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{background:theme.primary,color:"#fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{i+1}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:theme.textPrimary}}>{p.name}</div>
                  <div style={{fontSize:11,color:theme.textMuted}}>{p.sku}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:theme.income}}>+{p.entradas} entrada{p.entradas!==1?"s":""}</div>
                <div style={{fontSize:13,fontWeight:700,color:theme.expense}}>-{p.saidas} saída{p.saidas!==1?"s":""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>}
    {!data&&!loading&&<div style={{...card,padding:"50px 20px",textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:10}}>🏭</div><div style={{color:theme.textMuted,fontSize:14}}>Configure o período e clique em "Gerar"</div></div>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const REPORT_COMPONENTS={
  dre:RelatorioDRE, cashflow:RelatorioFluxoCaixa, bills:RelatorioContas,
  products:RelatorioProdutos, sales:RelatorioVendas, stock:RelatorioEstoque,
};

export default function Reports(){
  const {theme,themeId}=useTheme();
  const isGlass=themeId==="glass"||themeId==="gray";
  const isMobile=useIsMobile();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [activeReport,setActiveReport]=useState(null);

  const card={background:isGlass?"rgba(255,255,255,0.22)":theme.bgCard,
    border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,
    borderRadius:16,backdropFilter:isGlass?"blur(16px)":undefined};

  const ActiveComponent=activeReport?REPORT_COMPONENTS[activeReport]:null;
  const activeInfo=REPORTS.find(r=>r.id===activeReport);

  return(
    <PageLayout>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .rep-anim{animation:fadeUp 0.35s ease forwards}
        .rep-card{transition:transform 0.2s,box-shadow 0.2s;cursor:pointer}
        .rep-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(0,0,0,0.25)}
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"72px 16px 40px":"32px 36px",position:"relative",zIndex:1}}>
        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <img src={logoGif} alt="logo" style={{width:isMobile?44:60,height:isMobile?44:60,objectFit:"contain",filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))"}}/>
            <div>
              <h1 style={{fontSize:isMobile?"20px":"1.75rem",fontWeight:700,margin:0,color:theme.textPrimary}}>
                {activeReport?`📊 ${activeInfo?.title}`:"Relatórios"}
              </h1>
              <p style={{color:theme.textMuted,margin:"4px 0 0",fontSize:"0.85rem"}}>
                {activeReport?activeInfo?.sub:"Selecione um relatório para gerar"}
              </p>
            </div>
          </div>
          {activeReport&&(
            <button onClick={()=>setActiveReport(null)}
              style={{background:"transparent",border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,
                borderRadius:10,padding:"9px 18px",color:theme.textMuted,cursor:"pointer",
                fontSize:"0.875rem",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
              ← Voltar
            </button>
          )}
        </div>
        {/* GRID DE CARDS */}
        {!activeReport&&(
          <div className="rep-anim" style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:18}}>
            {REPORTS.map(r=>(
              <div key={r.id} className="rep-card" onClick={()=>setActiveReport(r.id)}
                style={{...card,padding:"24px 20px",borderLeft:`4px solid ${r.color}`,boxShadow:`inset 0 0 60px ${r.color}08`}}>
                <div style={{fontSize:"2.2rem",marginBottom:10}}>{r.icon}</div>
                <div style={{fontWeight:700,fontSize:isMobile?15:16,color:theme.textPrimary,marginBottom:5}}>{r.title}</div>
                <div style={{fontSize:12,color:theme.textMuted,lineHeight:1.4}}>{r.sub}</div>
                <div style={{marginTop:16,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:r.color}}>Abrir relatório</span>
                  <span style={{fontSize:11,color:r.color}}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* RELATÓRIO ATIVO */}
        {activeReport&&ActiveComponent&&(
          <div className="rep-anim">
            <ActiveComponent theme={theme} isGlass={isGlass} isMobile={isMobile}/>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
