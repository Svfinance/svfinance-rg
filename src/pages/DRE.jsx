import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { PRINT_THEMES, buildPrintCSS } from "../utils/printThemes";

const API = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(v) {
  if (v === null || v === undefined) return "R$ 0,00";
  return Math.abs(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function fmtSigned(v) {
  if (v === null || v === undefined) return "R$ 0,00";
  const s = Math.abs(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  return v < 0 ? `- ${s}` : s;
}
function fmtPct(v) { return `${(v||0) >= 0 ? "+" : ""}${(v||0).toFixed(1)}%`; }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

export default function DRE() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dre, setDre]                 = useState(null);
  const [anos, setAnos]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [expandido, setExpandido]     = useState({});
  const [printTheme, setPrintTheme]   = useState(themeId || "blue");

  // Filtros
  const [periodo,    setPeriodo]    = useState("ano");
  const [ano,        setAno]        = useState(new Date().getFullYear().toString());
  const [mes,        setMes]        = useState((new Date().getMonth() + 1).toString());
  const [trimestre,  setTrimestre]  = useState("1");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim,    setDataFim]    = useState("");

  useEffect(() => {
    fetch(`${API}/dre/anos`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setAnos(d.anos || [])).catch(() => {});
  }, []);

  const fetchDRE = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ periodo, ano });
      if (periodo === "mes")           params.append("mes", mes);
      if (periodo === "trimestre")     params.append("trimestre", trimestre);
      if (periodo === "personalizado") {
        params.append("data_inicio", dataInicio);
        params.append("data_fim",    dataFim);
      }
      const res  = await fetch(`${API}/dre?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { navigate("/"); return; }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDre(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── IMPRESSÃO REAL ────────────────────────────────────
  const handlePrint = () => {
    if (!dre) return;
    const T    = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    const ind  = dre.indicadores || {};
    const logo = dre.company_logo;

    const logoHtml = logo
      ? `<img src="${logo}" alt="Logo"/>`
      : `<span class="logo-placeholder">📊<br/>LOGO</span>`;

    const dreRows = dre.dre.map(row => {
      const isLL     = row.tipo === "lucro_liq" || row.tipo === "lucro_liquido";
      const cls      = isLL ? "lucro_liq" : row.tipo;
      const margem   = row.margem !== undefined
        ? `<span class="dre-margem">${fmtPct(row.margem)}</span>`
        : "";
      const detalhe  = (row.detalhe || []).map(d =>
        `<div class="dre-detail"><span>${d.categoria}</span><span>${fmt(d.valor)}</span></div>`
      ).join("");
      const sep = (row.tipo === "resultado" || isLL)
        ? `<div class="dre-separator"></div>`
        : "";
      return `
        ${sep}
        <div class="dre-row ${cls}">
          <span class="dre-label">${row.titulo}</span>
          ${margem}
          <span class="dre-valor">${fmtSigned(row.valor)}</span>
        </div>
        ${detalhe}
      `;
    }).join("");

    const indicadores = [
      { label:"Receita Bruta",        valor:fmt(ind.receita_bruta),          cls: ind.receita_bruta >= 0 ? "pos" : "neg" },
      { label:"CMV / CSV",            valor:fmt(ind.cmv),                    cls: "neg" },
      { label:"Desp. Operacionais",   valor:fmt(ind.desp_operacionais),      cls: "neg" },
      { label:"Desp. Financeiras",    valor:fmt(ind.desp_financeiras),       cls: "neg" },
      { label:"Total Despesas",       valor:fmt(ind.total_despesas),         cls: "neg" },
      { label:"Lucro Bruto",          valor:fmt(ind.lucro_bruto),            cls: ind.lucro_bruto >= 0 ? "pos" : "neg" },
      { label:"Res. Operacional",     valor:fmt(ind.resultado_operacional),  cls: ind.resultado_operacional >= 0 ? "pos" : "neg" },
      { label:"Lucro Líquido",        valor:fmt(ind.lucro_liquido),          cls: ind.lucro_liquido >= 0 ? "pos" : "neg" },
      { label:"Margem Bruta",         valor:fmtPct(ind.margem_bruta),        cls: ind.margem_bruta >= 0 ? "pos" : "neg" },
      { label:"Margem Operacional",   valor:fmtPct(ind.margem_operacional),  cls: ind.margem_operacional >= 0 ? "pos" : "neg" },
      { label:"Margem Líquida",       valor:fmtPct(ind.margem_liquida),      cls: ind.margem_liquida >= 0 ? "pos" : "neg" },
      { label:"Saldo do Período",     valor:fmt(ind.saldo_periodo),          cls: ind.saldo_periodo >= 0 ? "pos" : "neg" },
    ].map(c => `
      <div class="ind-card">
        <div class="ind-label">${c.label}</div>
        <div class="ind-value ${c.cls}">${c.valor}</div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>DRE — ${dre.company_name} — ${dre.periodo}</title>
  <style>${buildPrintCSS(T)}</style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="accent-bar-top"></div>
    <div class="glow-a"></div>
    <div class="glow-b"></div>

    <!-- CABEÇALHO -->
    <div class="doc-header">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div class="logo-box">${logoHtml}</div>
        <div>
          <div class="company-name">${dre.company_name}</div>
          <div class="company-meta">
            Demonstração do Resultado do Exercício<br/>
            Período: <strong>${dre.periodo}</strong>
          </div>
        </div>
      </div>
      <div>
        <div class="doc-title">DRE</div>
        <div class="doc-subtitle">
          Emitido em: ${dre.emitido_em}<br/>
          Lançamentos: ${dre.total_transacoes}
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- ESTRUTURA DRE -->
    <div class="section-title">Estrutura do Resultado</div>
    ${dreRows}

    <div class="divider"></div>

    <!-- INDICADORES -->
    <div class="section-title" style="margin-top:16px">Indicadores de Performance</div>
    <div class="ind-grid">${indicadores}</div>

    <div class="doc-footer">
      SV Finance Control &nbsp;·&nbsp; ${dre.company_name} &nbsp;·&nbsp; Gerado em ${dre.emitido_em}
    </div>
    <div class="accent-bar-bottom"></div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // ── estilos ──
  const card = {
    background:     isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard,
    border:         `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius:   16,
    backdropFilter: isGlass ? "blur(16px)" : undefined,
  };
  const inputStyle = {
    background:   isGlass ? "rgba(255,255,255,0.4)" : theme.bgInput,
    border:       `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderInput}`,
    borderRadius: 8, padding: "9px 12px",
    color: theme.textPrimary, fontSize: 14, outline: "none",
    colorScheme: isGlass ? "light" : "dark",
  };

  const rowBg = (tipo) => {
    if (tipo === "receita")       return isGlass ? "rgba(34,197,94,0.1)"  : "rgba(34,197,94,0.07)";
    if (tipo === "deducao")       return isGlass ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)";
    if (tipo === "resultado")     return isGlass ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.07)";
    if (tipo === "lucro_liquido") return theme.primaryGrad;
    return "transparent";
  };
  const rowColor = (tipo, valor) => {
    if (tipo === "lucro_liquido") return "#fff";
    if (tipo === "resultado" || tipo === "receita") return (valor||0) >= 0 ? theme.income : theme.expense;
    return theme.textPrimary;
  };

  const ind = dre?.indicadores || {};

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .dre-anim { animation:fadeUp 0.4s ease forwards; }
        .dre-hover:hover { filter:brightness(1.06); }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "72px 16px 40px" : "32px 36px", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>DRE</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Demonstração do Resultado do Exercício</p>
            </div>
          </div>
          {dre && (
            <button onClick={handlePrint} style={{ background:"linear-gradient(135deg,#1e40af,#2563eb)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(37,99,235,0.4)", whiteSpace:"nowrap" }}>
              🖨️ Imprimir / PDF
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-end" }}>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...inputStyle, minWidth:160 }}>
                <option value="mes">Mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano Completo</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {periodo !== "personalizado" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)} style={inputStyle}>
                  {(anos.length ? anos : [new Date().getFullYear().toString()]).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}

            {periodo === "mes" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} style={inputStyle}>
                  {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}

            {periodo === "trimestre" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Trimestre</label>
                <select value={trimestre} onChange={e => setTrimestre(e.target.value)} style={inputStyle}>
                  <option value="1">1º Tri (Jan-Mar)</option>
                  <option value="2">2º Tri (Abr-Jun)</option>
                  <option value="3">3º Tri (Jul-Set)</option>
                  <option value="4">4º Tri (Out-Dez)</option>
                </select>
              </div>
            )}

            {periodo === "personalizado" && (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>De</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Até</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}

            {/* Tema de impressão */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Tema PDF</label>
              <div style={{ display:"flex", gap:6 }}>
                {Object.values(PRINT_THEMES).map(t => (
                  <button key={t.id} onClick={() => setPrintTheme(t.id)}
                    style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${printTheme===t.id?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:printTheme===t.id?`${theme.primary}22`:"transparent", color:printTheme===t.id?theme.textActive:theme.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={fetchDRE} disabled={loading}
              style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, cursor:loading?"not-allowed":"pointer", fontSize:"0.9rem", opacity:loading?0.7:1, alignSelf:"flex-end", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}>
              {loading ? "⏳ Gerando..." : "📊 Gerar DRE"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#ef4444", fontSize:14 }}>
            ❌ {error}
          </div>
        )}

        {!dre && !loading && (
          <div style={{ ...card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>📊</div>
            <div style={{ color:theme.textPrimary, fontWeight:600, fontSize:16, marginBottom:8 }}>Configure o período e clique em "Gerar DRE"</div>
            <div style={{ color:theme.textMuted, fontSize:13 }}>O relatório será gerado com base nas transações do período selecionado</div>
          </div>
        )}

        {dre && (
          <div className="dre-anim">

            {/* CARDS INDICADORES */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:24 }}>
              {[
                { icon:"📈", label:"Receita Bruta",  valor:fmt(ind.receita_bruta),       color:theme.income },
                { icon:"📉", label:"Total Despesas", valor:fmt(ind.total_despesas),       color:theme.expense },
                { icon:"💰", label:"Lucro Líquido",  valor:fmt(ind.lucro_liquido),        color:(ind.lucro_liquido||0)>=0?theme.income:theme.expense },
                { icon:"📊", label:"Margem Líquida", valor:fmtPct(ind.margem_liquida),   color:(ind.margem_liquida||0)>=0?theme.income:theme.expense },
              ].map((c,i) => (
                <div key={i} style={{ ...card, padding:"16px 18px" }}>
                  <div style={{ fontSize:"1.3rem", marginBottom:6 }}>{c.icon}</div>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize:isMobile?"1rem":"1.15rem", fontWeight:800, color:c.color }}>{c.valor}</div>
                </div>
              ))}
            </div>

            {/* TABELA DRE */}
            <div style={{ ...card, marginBottom:24, overflow:"hidden" }}>
              <div style={{ padding:"20px 24px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16, color:theme.textPrimary }}>{dre.company_name}</div>
                  <div style={{ color:theme.textMuted, fontSize:13, marginTop:2 }}>
                    Período: <strong style={{ color:theme.textPrimary }}>{dre.periodo}</strong>
                    &nbsp;·&nbsp; {dre.total_transacoes} lançamentos
                    &nbsp;·&nbsp; {dre.emitido_em}
                  </div>
                </div>
              </div>
              <div style={{ padding:"16px 0" }}>
                {dre.dre.map((row, i) => {
                  const isLL      = row.tipo === "lucro_liquido";
                  const isResult  = row.tipo === "resultado" || isLL;
                  const hasDetail = row.detalhe?.length > 0;
                  const isExp     = expandido[i];
                  return (
                    <div key={i} style={{ marginBottom: isResult ? 6 : 1 }}>
                      {isResult && i > 0 && (
                        <div style={{ height:1, background:isGlass?"rgba(255,255,255,0.15)":theme.border, margin:"8px 24px" }} />
                      )}
                      <div className="dre-hover"
                        onClick={() => hasDetail && setExpandido(p => ({ ...p, [i]: !p[i] }))}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: isLL ? "14px 24px" : "10px 24px", margin: isLL ? "6px 0" : "0", background:rowBg(row.tipo), borderLeft:isResult&&!isLL?`4px solid ${theme.primary}`:"none", cursor:hasDetail?"pointer":"default" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                          {hasDetail && <span style={{ fontSize:9, color:isLL?"rgba(255,255,255,0.6)":theme.textMuted, transition:"transform 0.2s", transform:isExp?"rotate(90deg)":"none" }}>▶</span>}
                          <span style={{ fontSize:isLL?14:13, fontWeight:isResult?700:500, color:rowColor(row.tipo, row.valor) }}>{row.titulo}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          {row.margem !== undefined && (
                            <span style={{ fontSize:11, color:isLL?"rgba(255,255,255,0.7)":theme.textMuted, fontWeight:600 }}>{fmtPct(row.margem)}</span>
                          )}
                          <span style={{ fontSize:isLL?15:13, fontWeight:isResult?800:600, color:rowColor(row.tipo, row.valor), minWidth:110, textAlign:"right" }}>
                            {fmtSigned(row.valor)}
                          </span>
                        </div>
                      </div>
                      {hasDetail && isExp && (
                        <div style={{ background:isGlass?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.12)", borderLeft:`4px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, marginLeft:24 }}>
                          {row.detalhe.map((d,j) => (
                            <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 20px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.03)"}` }}>
                              <span style={{ fontSize:12, color:theme.textSecondary }}>{d.categoria}</span>
                              <span style={{ fontSize:12, fontWeight:600, color:theme.textMuted }}>{fmt(d.valor)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INDICADORES */}
            <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
              <h3 style={{ color:theme.textPrimary, margin:"0 0 18px", fontSize:15, fontWeight:700 }}>📊 Indicadores de Performance</h3>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:12 }}>
                {[
                  { label:"Receita Bruta",        valor:fmt(ind.receita_bruta),            cor:theme.income },
                  { label:"CMV / CSV",             valor:fmt(ind.cmv),                      cor:theme.expense },
                  { label:"Desp. Operacionais",   valor:fmt(ind.desp_operacionais),         cor:theme.expense },
                  { label:"Desp. Financeiras",    valor:fmt(ind.desp_financeiras),          cor:theme.expense },
                  { label:"Lucro Bruto",          valor:fmt(ind.lucro_bruto),              cor:(ind.lucro_bruto||0)>=0?theme.income:theme.expense },
                  { label:"Res. Operacional",     valor:fmt(ind.resultado_operacional),     cor:(ind.resultado_operacional||0)>=0?theme.income:theme.expense },
                  { label:"Lucro Líquido",        valor:fmt(ind.lucro_liquido),            cor:(ind.lucro_liquido||0)>=0?theme.income:theme.expense },
                  { label:"Margem Bruta",         valor:fmtPct(ind.margem_bruta),          cor:(ind.margem_bruta||0)>=0?theme.income:theme.expense },
                  { label:"Margem Operacional",   valor:fmtPct(ind.margem_operacional),    cor:(ind.margem_operacional||0)>=0?theme.income:theme.expense },
                  { label:"Margem Líquida",       valor:fmtPct(ind.margem_liquida),        cor:(ind.margem_liquida||0)>=0?theme.income:theme.expense },
                  { label:"Total Receitas",       valor:fmt(ind.total_receitas),           cor:theme.income },
                  { label:"Total Despesas",       valor:fmt(ind.total_despesas),           cor:theme.expense },
                ].map((c,i) => (
                  <div key={i} style={{ background:isGlass?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${isGlass?"rgba(255,255,255,0.25)":theme.border}`, borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, color:theme.textMuted, marginBottom:4, fontWeight:500 }}>{c.label}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:c.cor }}>{c.valor}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BARRAS */}
            <div style={{ ...card, padding:"20px 24px" }}>
              <h3 style={{ color:theme.textPrimary, margin:"0 0 18px", fontSize:15, fontWeight:700 }}>📉 Composição do Resultado</h3>
              {[
                { label:"Receita Bruta",       valor:ind.receita_bruta,       max:ind.total_receitas||1, color:theme.income },
                { label:"CMV",                 valor:ind.cmv,                  max:ind.total_despesas||1, color:"#f59e0b"    },
                { label:"Desp. Operacionais",  valor:ind.desp_operacionais,    max:ind.total_despesas||1, color:theme.expense },
                { label:"Desp. Financeiras",   valor:ind.desp_financeiras,     max:ind.total_despesas||1, color:"#ef4444"    },
                { label:"Lucro Líquido",       valor:Math.max(0,ind.lucro_liquido||0), max:ind.total_receitas||1, color:"#22c55e" },
              ].map((b,i) => {
                const pct = Math.min(100, Math.max(0, ((b.valor||0) / b.max) * 100));
                return (
                  <div key={i} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:theme.textSecondary }}>{b.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:b.color }}>{fmt(b.valor||0)}</span>
                    </div>
                    <div style={{ height:7, background:isGlass?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:b.color, borderRadius:4, transition:"width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
