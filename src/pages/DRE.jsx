import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function fmt(v) {
  if (v === null || v === undefined) return "R$ 0,00";
  const abs = Math.abs(v);
  const str = abs.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return v < 0 ? `- ${str}` : str;
}

function fmtPct(v) {
  return `${v >= 0 ? "+" : ""}${v?.toFixed(1)}%`;
}

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
  const printRef = useRef();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dre, setDre]                 = useState(null);
  const [anos, setAnos]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [expandido, setExpandido]     = useState({});

  // Filtros
  const [periodo,    setPeriodo]    = useState("ano");
  const [ano,        setAno]        = useState(new Date().getFullYear().toString());
  const [mes,        setMes]        = useState((new Date().getMonth() + 1).toString());
  const [trimestre,  setTrimestre]  = useState("1");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim,    setDataFim]    = useState("");

  useEffect(() => {
    fetch(`${API}/dre/anos`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setAnos(d.anos || []))
      .catch(() => {});
  }, []);

  const fetchDRE = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ periodo, ano });
      if (periodo === "mes")          params.append("mes", mes);
      if (periodo === "trimestre")    params.append("trimestre", trimestre);
      if (periodo === "personalizado") {
        params.append("data_inicio", dataInicio);
        params.append("data_fim",    dataFim);
      }
      const res  = await fetch(`${API}/dre?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { navigate("/"); return; }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDre(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title>DRE — ${dre?.company_name} — ${dre?.periodo}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#0f172a; background:#fff; padding:24px 32px; }
          .print-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:16px; border-bottom:2px solid #1e40af; }
          .print-logo { width:60px; height:60px; object-fit:contain; }
          .print-title { flex:1; padding:0 20px; }
          .print-title h1 { font-size:20px; font-weight:800; color:#1e40af; letter-spacing:-0.5px; }
          .print-title p { font-size:11px; color:#64748b; margin-top:4px; }
          .print-meta { text-align:right; font-size:10px; color:#64748b; line-height:1.6; }
          .section-title { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#64748b; margin:16px 0 8px; padding-bottom:4px; border-bottom:1px solid #e2e8f0; }
          .dre-row { display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-radius:4px; margin-bottom:2px; }
          .dre-row.receita   { background:#f0fdf4; }
          .dre-row.deducao   { background:#fff7ed; }
          .dre-row.resultado { background:#eff6ff; border-left:3px solid #3b82f6; font-weight:600; }
          .dre-row.lucro_liquido { background:#1e40af; color:#fff; font-weight:800; font-size:13px; border-radius:6px; }
          .dre-row-label { flex:1; }
          .dre-row-valor { font-weight:600; text-align:right; min-width:120px; }
          .dre-row-margem { font-size:10px; color:#6b7280; min-width:60px; text-align:right; margin-left:8px; }
          .detalhe-row { display:flex; justify-content:space-between; padding:3px 20px; font-size:10px; color:#64748b; }
          .indicadores { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:24px; }
          .ind-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
          .ind-label { font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:#94a3b8; margin-bottom:4px; }
          .ind-valor { font-size:14px; font-weight:700; color:#0f172a; }
          .ind-valor.positivo { color:#16a34a; }
          .ind-valor.negativo { color:#dc2626; }
          .ind-valor.neutro   { color:#2563eb; }
          .footer { margin-top:32px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; text-align:center; }
          @media print { body { padding:12px 20px; } }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // ── estilos ──
  const card = {
    background:     isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard,
    border:         `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius:   16,
    backdropFilter: isGlass ? "blur(16px)" : undefined,
  };
  const inputStyle = {
    background: isGlass ? "rgba(255,255,255,0.4)" : theme.bgInput,
    border:     `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderInput}`,
    borderRadius: 8, padding: "9px 12px",
    color: theme.textPrimary, fontSize: 14, outline: "none",
    colorScheme: isGlass ? "light" : "dark",
  };

  const rowColor = (tipo) => {
    if (tipo === "receita")      return isGlass ? "rgba(34,197,94,0.12)"  : "rgba(34,197,94,0.08)";
    if (tipo === "deducao")      return isGlass ? "rgba(239,68,68,0.1)"   : "rgba(239,68,68,0.06)";
    if (tipo === "resultado")    return isGlass ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)";
    if (tipo === "lucro_liquido") return theme.primaryGrad;
    return "transparent";
  };

  const rowTextColor = (tipo, valor) => {
    if (tipo === "lucro_liquido") return "#fff";
    if (tipo === "resultado" || tipo === "receita") return valor >= 0 ? theme.income : theme.expense;
    return theme.textPrimary;
  };

  const ind = dre?.indicadores || {};

  // Monta HTML de impressão
  const buildPrintHTML = () => {
    if (!dre) return "";
    const logoTag = dre.company_logo
      ? `<img class="print-logo" src="${dre.company_logo}" alt="Logo"/>`
      : `<div style="width:60px;height:60px;background:#1e40af;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff">📊</div>`;

    const rows = dre.dre.map(r => {
      const isLL     = r.tipo === "lucro_liquido";
      const valorFmt = fmt(r.valor);
      const margemStr = r.margem !== undefined ? `<span class="dre-row-margem">${fmtPct(r.margem)}</span>` : "";

      const detalheRows = (r.detalhe || []).map(d =>
        `<div class="detalhe-row"><span>${d.categoria}</span><span>${fmt(d.valor)}</span></div>`
      ).join("");

      return `
        <div class="dre-row ${r.tipo}">
          <span class="dre-row-label">${r.titulo}</span>
          <span class="dre-row-valor">${valorFmt}</span>
          ${margemStr}
        </div>
        ${detalheRows}
      `;
    }).join("");

    return `
      <div class="print-header">
        ${logoTag}
        <div class="print-title">
          <h1>Demonstração do Resultado do Exercício</h1>
          <p>${dre.company_name} &nbsp;·&nbsp; Período: ${dre.periodo}</p>
        </div>
        <div class="print-meta">
          Emitido em: ${dre.emitido_em}<br/>
          Total de lançamentos: ${dre.total_transacoes}
        </div>
      </div>

      <div class="section-title">Estrutura do DRE</div>
      ${rows}

      <div class="section-title" style="margin-top:24px">Indicadores de Performance</div>
      <div class="indicadores">
        ${[
          { label:"Receita Bruta",     valor:ind.receita_bruta,         cls: ind.receita_bruta >= 0 ? "positivo" : "negativo" },
          { label:"Total Despesas",    valor:ind.total_despesas,         cls: "negativo" },
          { label:"Lucro Bruto",       valor:ind.lucro_bruto,            cls: ind.lucro_bruto >= 0 ? "positivo" : "negativo" },
          { label:"Res. Operacional",  valor:ind.resultado_operacional,  cls: ind.resultado_operacional >= 0 ? "positivo" : "negativo" },
          { label:"Lucro Líquido",     valor:ind.lucro_liquido,          cls: ind.lucro_liquido >= 0 ? "positivo" : "negativo" },
          { label:"Margem Líquida",    valor:null, extra: fmtPct(ind.margem_liquida), cls: ind.margem_liquida >= 0 ? "positivo" : "negativo" },
          { label:"Margem Bruta",      valor:null, extra: fmtPct(ind.margem_bruta),   cls: ind.margem_bruta >= 0 ? "positivo" : "negativo" },
          { label:"Margem Operacional",valor:null, extra: fmtPct(ind.margem_operacional), cls: ind.margem_operacional >= 0 ? "positivo" : "negativo" },
          { label:"Saldo do Período",  valor:ind.saldo_periodo,          cls: ind.saldo_periodo >= 0 ? "positivo" : "negativo" },
        ].map(c => `
          <div class="ind-card">
            <div class="ind-label">${c.label}</div>
            <div class="ind-valor ${c.cls}">${c.extra || fmt(c.valor)}</div>
          </div>
        `).join("")}
      </div>

      <div class="footer">
        SV Finance Control &nbsp;·&nbsp; Gerado em ${dre.emitido_em} &nbsp;·&nbsp; ${dre.company_name}
      </div>
    `;
  };

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .dre-animate { animation: fadeUp 0.4s ease forwards; }
        .dre-row-hover:hover { filter: brightness(1.05); cursor: pointer; }
        @media print { .no-print { display:none!important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "72px 16px 40px" : "32px 36px", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>DRE</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Demonstração do Resultado do Exercício</p>
            </div>
          </div>
          {dre && (
            <button onClick={handlePrint} style={{ background:"linear-gradient(135deg,#1e40af,#2563eb)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(37,99,235,0.4)", whiteSpace:"nowrap" }} className="no-print">
              🖨️ Imprimir / Salvar PDF
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div style={{ ...card, padding:"20px 24px", marginBottom:24 }} className="no-print">
          <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-end" }}>

            {/* Período */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...inputStyle, minWidth:160 }}>
                <option value="mes">Mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano Completo</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {/* Ano */}
            {periodo !== "personalizado" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)} style={inputStyle}>
                  {(anos.length ? anos : [new Date().getFullYear().toString()]).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Mês */}
            {periodo === "mes" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} style={inputStyle}>
                  {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Trimestre */}
            {periodo === "trimestre" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Trimestre</label>
                <select value={trimestre} onChange={e => setTrimestre(e.target.value)} style={inputStyle}>
                  <option value="1">1º Trimestre (Jan-Mar)</option>
                  <option value="2">2º Trimestre (Abr-Jun)</option>
                  <option value="3">3º Trimestre (Jul-Set)</option>
                  <option value="4">4º Trimestre (Out-Dez)</option>
                </select>
              </div>
            )}

            {/* Personalizado */}
            {periodo === "personalizado" && (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>De</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Até</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}

            <button
              onClick={fetchDRE}
              disabled={loading}
              style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, cursor:loading?"not-allowed":"pointer", fontSize:"0.9rem", opacity:loading?0.7:1, alignSelf:"flex-end", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}
            >
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
            <div style={{ color:theme.textPrimary, fontWeight:600, fontSize:16, marginBottom:8 }}>
              Configure o período e clique em "Gerar DRE"
            </div>
            <div style={{ color:theme.textMuted, fontSize:13 }}>
              O relatório será gerado com base nas transações do período selecionado
            </div>
          </div>
        )}

        {dre && (
          <div className="dre-animate">

            {/* CARDS INDICADORES */}
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:14, marginBottom:24 }} className="no-print">
              {[
                { icon:"📈", label:"Receita Bruta",   valor:ind.receita_bruta,        color:theme.income },
                { icon:"📉", label:"Total Despesas",  valor:-ind.total_despesas,       color:theme.expense },
                { icon:"💰", label:"Lucro Líquido",   valor:ind.lucro_liquido,         color: ind.lucro_liquido >= 0 ? theme.income : theme.expense },
                { icon:"📊", label:"Margem Líquida",  valor:null, extra: fmtPct(ind.margem_liquida), color: ind.margem_liquida >= 0 ? theme.income : theme.expense },
              ].map((c, i) => (
                <div key={i} style={{ ...card, padding:"16px 18px" }}>
                  <div style={{ fontSize:"1.3rem", marginBottom:6 }}>{c.icon}</div>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize: isMobile?"1rem":"1.15rem", fontWeight:800, color:c.color }}>{c.extra || fmt(c.valor)}</div>
                </div>
              ))}
            </div>

            {/* ÁREA DE IMPRESSÃO */}
            <div ref={printRef}>
              <div style={{ display:"none" }} dangerouslySetInnerHTML={{ __html: buildPrintHTML() }} />
            </div>

            {/* TABELA DRE */}
            <div style={{ ...card, marginBottom:24, overflow:"hidden" }}>
              {/* Cabeçalho */}
              <div style={{ padding:"20px 24px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16, color:theme.textPrimary }}>
                    {dre.company_name}
                  </div>
                  <div style={{ color:theme.textMuted, fontSize:13, marginTop:2 }}>
                    Período: <strong style={{ color:theme.textPrimary }}>{dre.periodo}</strong>
                    &nbsp;·&nbsp; {dre.total_transacoes} lançamentos
                    &nbsp;·&nbsp; Emitido em {dre.emitido_em}
                  </div>
                </div>
              </div>

              {/* Linhas do DRE */}
              <div style={{ padding:"16px 0" }}>
                {dre.dre.map((row, i) => {
                  const isLL       = row.tipo === "lucro_liquido";
                  const isResult   = row.tipo === "resultado" || isLL;
                  const hasDetail  = row.detalhe?.length > 0;
                  const isExpanded = expandido[i];

                  return (
                    <div key={i} style={{ marginBottom: isResult ? 8 : 2 }}>
                      {/* Separador antes de resultados */}
                      {isResult && i > 0 && (
                        <div style={{ height:1, background: isGlass?"rgba(255,255,255,0.15)":theme.border, margin:"10px 24px 10px" }} />
                      )}

                      <div
                        className="dre-row-hover"
                        onClick={() => hasDetail && setExpandido(p => ({ ...p, [i]: !p[i] }))}
                        style={{
                          display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding: isLL ? "14px 24px" : "10px 24px",
                          margin: isLL ? "8px 0" : "0",
                          background: isLL ? theme.primaryGrad : rowColor(row.tipo),
                          borderLeft: isResult && !isLL ? `4px solid ${theme.primary}` : "none",
                          cursor: hasDetail ? "pointer" : "default",
                        }}
                      >
                        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                          {hasDetail && (
                            <span style={{ fontSize:10, color: isLL ? "rgba(255,255,255,0.7)" : theme.textMuted, transition:"transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
                          )}
                          <span style={{ fontSize: isLL ? 14 : 13, fontWeight: isResult ? 700 : 500, color: rowTextColor(row.tipo, row.valor) }}>
                            {row.titulo}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                          {row.margem !== undefined && (
                            <span style={{ fontSize:11, color: isLL ? "rgba(255,255,255,0.8)" : theme.textMuted, fontWeight:600 }}>
                              {fmtPct(row.margem)}
                            </span>
                          )}
                          <span style={{ fontSize: isLL ? 15 : 13, fontWeight: isResult ? 800 : 600, color: rowTextColor(row.tipo, row.valor), minWidth:120, textAlign:"right" }}>
                            {fmt(row.valor)}
                          </span>
                        </div>
                      </div>

                      {/* Detalhe expandível */}
                      {hasDetail && isExpanded && (
                        <div style={{ background: isGlass?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.15)", borderLeft: `4px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, marginLeft:24 }}>
                          {row.detalhe.map((d, j) => (
                            <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 20px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.04)"}` }}>
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

            {/* INDICADORES DETALHADOS */}
            <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
              <h3 style={{ color:theme.textPrimary, margin:"0 0 18px", fontSize:15, fontWeight:700 }}>
                📊 Indicadores de Performance
              </h3>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:12 }}>
                {[
                  { label:"Receita Bruta",         valor:fmt(ind.receita_bruta),            cor: theme.income },
                  { label:"CMV / CSV",              valor:fmt(ind.cmv),                      cor: theme.expense },
                  { label:"Despesas Operacionais",  valor:fmt(ind.desp_operacionais),         cor: theme.expense },
                  { label:"Despesas Financeiras",   valor:fmt(ind.desp_financeiras),          cor: theme.expense },
                  { label:"Lucro Bruto",            valor:fmt(ind.lucro_bruto),              cor: ind.lucro_bruto >= 0 ? theme.income : theme.expense },
                  { label:"Resultado Operacional",  valor:fmt(ind.resultado_operacional),     cor: ind.resultado_operacional >= 0 ? theme.income : theme.expense },
                  { label:"Lucro Líquido",          valor:fmt(ind.lucro_liquido),            cor: ind.lucro_liquido >= 0 ? theme.income : theme.expense },
                  { label:"Margem Bruta",           valor:fmtPct(ind.margem_bruta),          cor: ind.margem_bruta >= 0 ? theme.income : theme.expense },
                  { label:"Margem Operacional",     valor:fmtPct(ind.margem_operacional),    cor: ind.margem_operacional >= 0 ? theme.income : theme.expense },
                  { label:"Margem Líquida",         valor:fmtPct(ind.margem_liquida),        cor: ind.margem_liquida >= 0 ? theme.income : theme.expense },
                  { label:"Total de Receitas",      valor:fmt(ind.total_receitas),           cor: theme.income },
                  { label:"Total de Despesas",      valor:fmt(ind.total_despesas),           cor: theme.expense },
                ].map((c, i) => (
                  <div key={i} style={{ background: isGlass?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}`, borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, color:theme.textMuted, marginBottom:4, fontWeight:500 }}>{c.label}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:c.cor }}>{c.valor}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BARRAS DE COMPOSIÇÃO */}
            <div style={{ ...card, padding:"20px 24px" }}>
              <h3 style={{ color:theme.textPrimary, margin:"0 0 18px", fontSize:15, fontWeight:700 }}>
                📉 Composição do Resultado
              </h3>
              {[
                { label:"Receita Bruta",   valor:ind.receita_bruta,        max:ind.total_receitas || 1, color:theme.income },
                { label:"CMV",             valor:ind.cmv,                   max:ind.total_despesas || 1, color:"#f59e0b" },
                { label:"Desp. Operacionais", valor:ind.desp_operacionais,  max:ind.total_despesas || 1, color:theme.expense },
                { label:"Desp. Financeiras",  valor:ind.desp_financeiras,   max:ind.total_despesas || 1, color:"#ef4444" },
                { label:"Lucro Líquido",   valor:Math.max(0, ind.lucro_liquido), max:ind.total_receitas || 1, color:"#22c55e" },
              ].map((b, i) => {
                const pct = Math.min(100, Math.max(0, (b.valor / b.max) * 100));
                return (
                  <div key={i} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:12, color:theme.textSecondary }}>{b.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:b.color }}>{fmt(b.valor)}</span>
                    </div>
                    <div style={{ height:8, background: isGlass?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
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
