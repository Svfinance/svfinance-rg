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
  const abs = Math.abs(v || 0);
  const s   = abs.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  return (v || 0) < 0 ? `- ${s}` : s;
}
function fmtSigned(v) {
  const abs = Math.abs(v || 0);
  const s   = abs.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  if ((v || 0) > 0) return `+${s}`;
  if ((v || 0) < 0) return `- ${s}`;
  return s;
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

export default function CashFlow() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData]               = useState(null);
  const [anos, setAnos]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [printTheme, setPrintTheme]   = useState(themeId || "blue");

  // Filtros
  const [periodo,     setPeriodo]     = useState("mes");
  const [ano,         setAno]         = useState(new Date().getFullYear().toString());
  const [mes,         setMes]         = useState((new Date().getMonth() + 1).toString());
  const [trimestre,   setTrimestre]   = useState("1");
  const [dataInicio,  setDataInicio]  = useState("");
  const [dataFim,     setDataFim]     = useState("");
  const [agrupamento, setAgrupamento] = useState("daily");

  // Controle de exibição
  const [showZero, setShowZero] = useState(false);

  useEffect(() => {
    fetch(`${API}/cashflow/anos`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setAnos(d.anos || [])).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ periodo, ano, agrupamento });
      if (periodo === "mes")           params.append("mes", mes);
      if (periodo === "trimestre")     params.append("trimestre", trimestre);
      if (periodo === "personalizado") {
        params.append("data_inicio", dataInicio);
        params.append("data_fim",    dataFim);
      }
      const res  = await fetch(`${API}/cashflow?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { navigate("/"); return; }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── IMPRESSÃO ─────────────────────────────────────────
  const handlePrint = () => {
    if (!data) return;
    const T   = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    const ind = data.indicadores || {};
    const logo = data.company_logo;

    const logoHtml = logo
      ? `<img src="${logo}" alt="Logo"/>`
      : `<span class="logo-placeholder">💵<br/>LOGO</span>`;

    const rows = (showZero ? data.rows : data.rows.filter(r => r.has_data));

    const tableRows = rows.map((r, i) => {
      const netColor = r.net > 0 ? T.incomeColor : r.net < 0 ? T.expenseColor : T.mutedColor;
      const saldoColor = r.saldo_acumulado >= 0 ? T.incomeColor : T.expenseColor;
      return `
        <tr style="${i%2===0?`background:${T.rowEven}`:""}">
          <td>${r.label}${r.weekday ? ` <span style="color:${T.mutedColor};font-size:9px">(${r.weekday})</span>` : ""}</td>
          <td class="right" style="color:${T.incomeColor}">${r.income > 0 ? fmt(r.income) : "—"}</td>
          <td class="right" style="color:${T.expenseColor}">${r.expense > 0 ? fmt(r.expense) : "—"}</td>
          <td class="right" style="color:${netColor};font-weight:600">${fmtSigned(r.net)}</td>
          <td class="right" style="color:${saldoColor};font-weight:700">${fmt(r.saldo_acumulado)}</td>
        </tr>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Fluxo de Caixa — ${data.company_name} — ${data.periodo}</title>
  <style>
    ${buildPrintCSS(T)}
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
    .summary-card { background:${T.cardBg}; border:1px solid ${T.cardBorder}; border-radius:8px; padding:10px 14px; }
    .summary-label { font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:${T.mutedColor}; margin-bottom:3px; }
    .summary-value { font-size:15px; font-weight:800; }
    .summary-value.pos { color:${T.incomeColor}; }
    .summary-value.neg { color:${T.expenseColor}; }
    .summary-value.neu { color:${T.accent}; }
    .saldo-bar { height:3px; border-radius:2px; margin-top:4px; }
  </style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="accent-bar-top"></div>
    <div class="glow-a"></div>
    <div class="glow-b"></div>

    <div class="doc-header">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div class="logo-box">${logoHtml}</div>
        <div>
          <div class="company-name">${data.company_name}</div>
          <div class="company-meta">
            Fluxo de Caixa — ${data.agrupamento === "daily" ? "Diário" : data.agrupamento === "weekly" ? "Semanal" : "Mensal"}<br/>
            Período: <strong>${data.periodo}</strong>
          </div>
        </div>
      </div>
      <div>
        <div class="doc-title">CAIXA</div>
        <div class="doc-subtitle">
          Emitido em: ${data.emitido_em}<br/>
          ${data.indicadores.total_transacoes} lançamentos
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- RESUMO -->
    <div class="section-title">Resumo do Período</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Saldo Inicial</div>
        <div class="summary-value ${data.saldo_inicial >= 0 ? "pos" : "neg"}">${fmt(data.saldo_inicial)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Entradas</div>
        <div class="summary-value pos">${fmt(data.total_income)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Saídas</div>
        <div class="summary-value neg">${fmt(data.total_expense)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Saldo Final</div>
        <div class="summary-value ${data.saldo_final >= 0 ? "pos" : "neg"}">${fmt(data.saldo_final)}</div>
        <div class="saldo-bar" style="background:${data.saldo_final >= 0 ? T.incomeColor : T.expenseColor};width:${Math.min(100, Math.abs(data.saldo_final / (Math.abs(data.saldo_inicial) + data.total_income || 1)) * 100)}%"></div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- TABELA -->
    <div class="section-title">Movimentações ${data.agrupamento === "daily" ? "Diárias" : data.agrupamento === "weekly" ? "Semanais" : "Mensais"}</div>
    <table>
      <thead>
        <tr>
          <th>Período</th>
          <th class="right">Entradas</th>
          <th class="right">Saídas</th>
          <th class="right">Resultado</th>
          <th class="right">Saldo Acumulado</th>
        </tr>
      </thead>
      <tbody>
        <!-- Linha saldo inicial -->
        <tr style="background:${T.accentLight}">
          <td style="font-weight:700;color:${T.titleColor}">Saldo Inicial</td>
          <td class="right">—</td>
          <td class="right">—</td>
          <td class="right">—</td>
          <td class="right" style="font-weight:800;color:${data.saldo_inicial >= 0 ? T.incomeColor : T.expenseColor}">${fmt(data.saldo_inicial)}</td>
        </tr>
        ${tableRows}
        <!-- Linha totais -->
        <tr style="background:${T.lucroLiqBg};color:#fff">
          <td style="font-weight:800">TOTAL DO PERÍODO</td>
          <td class="right" style="color:#fff;font-weight:700">${fmt(data.total_income)}</td>
          <td class="right" style="color:#fff;font-weight:700">${fmt(data.total_expense)}</td>
          <td class="right" style="font-weight:800">${fmtSigned(data.saldo_periodo)}</td>
          <td class="right" style="font-weight:800">${fmt(data.saldo_final)}</td>
        </tr>
      </tbody>
    </table>

    <!-- INDICADORES -->
    <div class="section-title" style="margin-top:20px">Indicadores do Período</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="summary-label">Períodos Positivos</div><div class="summary-value pos">${ind.dias_positivos}</div></div>
      <div class="summary-card"><div class="summary-label">Períodos Negativos</div><div class="summary-value ${ind.dias_negativos > 0 ? "neg" : "pos"}">${ind.dias_negativos}</div></div>
      <div class="summary-card"><div class="summary-label">Maior Entrada</div><div class="summary-value pos">${fmt(ind.maior_entrada)}</div></div>
      <div class="summary-card"><div class="summary-label">Maior Saída</div><div class="summary-value neg">${fmt(ind.maior_saida)}</div></div>
    </div>

    <div class="doc-footer">
      SV Finance Control &nbsp;·&nbsp; ${data.company_name} &nbsp;·&nbsp; Gerado em ${data.emitido_em}
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

  const visibleRows = data ? (showZero ? data.rows : data.rows.filter(r => r.has_data)) : [];
  const ind = data?.indicadores || {};

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cf-anim { animation:fadeUp 0.4s ease forwards; }
        .cf-row:hover { filter:brightness(1.06); }
        .cf-row-pos { background: ${isGlass?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.04)"}; }
        .cf-row-neg { background: ${isGlass?"rgba(239,68,68,0.07)":"rgba(239,68,68,0.04)"}; }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "72px 16px 40px" : "32px 36px", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Fluxo de Caixa</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Entradas, saídas e saldo acumulado por período</p>
            </div>
          </div>
          {data && (
            <button onClick={handlePrint}
              style={{ background:"linear-gradient(135deg,#1e40af,#2563eb)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(37,99,235,0.4)", whiteSpace:"nowrap" }}>
              🖨️ Imprimir / PDF
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>

            {/* Período */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Período</label>
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
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Ano</label>
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
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} style={inputStyle}>
                  {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Trimestre */}
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

            {/* Personalizado */}
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

            {/* Agrupamento */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Agrupar por</label>
              <div style={{ display:"flex", gap:6 }}>
                {[
                  { v:"daily",   label:"📅 Dia"    },
                  { v:"weekly",  label:"📆 Semana" },
                  { v:"monthly", label:"🗓️ Mês"   },
                ].map(a => (
                  <button key={a.v} onClick={() => setAgrupamento(a.v)}
                    style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${agrupamento===a.v?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:agrupamento===a.v?`${theme.primary}22`:"transparent", color:agrupamento===a.v?theme.textActive:theme.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema PDF */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Tema PDF</label>
              <div style={{ display:"flex", gap:6 }}>
                {Object.values(PRINT_THEMES).map(t => (
                  <button key={t.id} onClick={() => setPrintTheme(t.id)}
                    style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${printTheme===t.id?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:printTheme===t.id?`${theme.primary}22`:"transparent", color:printTheme===t.id?theme.textActive:theme.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={fetchData} disabled={loading}
              style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, cursor:loading?"not-allowed":"pointer", fontSize:"0.9rem", opacity:loading?0.7:1, alignSelf:"flex-end", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}>
              {loading ? "⏳ Gerando..." : "📊 Gerar"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#ef4444", fontSize:14 }}>
            ❌ {error}
          </div>
        )}

        {!data && !loading && (
          <div style={{ ...card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>💵</div>
            <div style={{ color:theme.textPrimary, fontWeight:600, fontSize:16, marginBottom:8 }}>Configure o período e clique em "Gerar"</div>
            <div style={{ color:theme.textMuted, fontSize:13 }}>O fluxo de caixa será gerado com base nas transações do período selecionado</div>
          </div>
        )}

        {data && (
          <div className="cf-anim">

            {/* CARDS RESUMO */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:24 }}>
              {[
                { icon:"🏦", label:"Saldo Inicial",   valor:fmt(data.saldo_inicial),  color: data.saldo_inicial >= 0 ? theme.income : theme.expense },
                { icon:"📈", label:"Total Entradas",  valor:fmt(data.total_income),   color: theme.income  },
                { icon:"📉", label:"Total Saídas",    valor:fmt(data.total_expense),  color: theme.expense },
                { icon:"💰", label:"Saldo Final",     valor:fmt(data.saldo_final),    color: data.saldo_final >= 0 ? theme.income : theme.expense },
              ].map((c,i) => (
                <div key={i} style={{ ...card, padding:"16px 18px" }}>
                  <div style={{ fontSize:"1.3rem", marginBottom:6 }}>{c.icon}</div>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize:isMobile?"1rem":"1.15rem", fontWeight:800, color:c.color }}>{c.valor}</div>
                </div>
              ))}
            </div>

            {/* BARRA DE PROGRESSO SALDO */}
            {data.total_income > 0 && (
              <div style={{ ...card, padding:"16px 20px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:theme.income, fontWeight:600 }}>📥 Entradas: {fmt(data.total_income)}</span>
                  <span style={{ color:theme.expense, fontWeight:600 }}>📤 Saídas: {fmt(data.total_expense)}</span>
                </div>
                <div style={{ height:10, background:isGlass?"rgba(239,68,68,0.3)":"rgba(239,68,68,0.2)", borderRadius:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(data.total_income/(data.total_income+data.total_expense||1))*100)}%`, background:`linear-gradient(90deg,${theme.income},${theme.income}cc)`, borderRadius:6, transition:"width 0.8s ease" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:theme.textMuted }}>
                  <span>{((data.total_income/(data.total_income+data.total_expense||1))*100).toFixed(1)}% entradas</span>
                  <span>Resultado: <strong style={{ color: data.saldo_periodo >= 0 ? theme.income : theme.expense }}>{fmtSigned(data.saldo_periodo)}</strong></span>
                </div>
              </div>
            )}

            {/* TABELA */}
            <div style={{ ...card, marginBottom:24, overflow:"hidden" }}>
              {/* Header */}
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:theme.textPrimary }}>
                    {data.company_name} — {data.periodo}
                  </div>
                  <div style={{ color:theme.textMuted, fontSize:12, marginTop:2 }}>
                    {data.indicadores.total_transacoes} lançamentos · {data.rows.length} {agrupamento==="daily"?"dias":agrupamento==="weekly"?"semanas":"meses"} no período
                  </div>
                </div>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:theme.textMuted }}>
                  <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)}
                    style={{ accentColor: theme.primary, cursor:"pointer" }} />
                  Mostrar dias sem movimento
                </label>
              </div>

              {/* Linha saldo inicial */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", gap:0, padding:"12px 20px", background:isGlass?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.04)", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}` }}>
                <div style={{ fontWeight:700, color:theme.textPrimary, fontSize:13 }}>🏦 Saldo Inicial</div>
                {!isMobile && <div></div>}
                {!isMobile && <div></div>}
                {!isMobile && <div></div>}
                <div style={{ textAlign:"right", fontWeight:800, fontSize:14, color: data.saldo_inicial >= 0 ? theme.income : theme.expense }}>
                  {fmt(data.saldo_inicial)}
                </div>
              </div>

              {/* Header da tabela */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", gap:0, padding:"10px 20px", background:isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}` }}>
                {["Período","Entradas","Saídas",...(!isMobile?["Resultado","Saldo Acum."]:["Saldo"])].map((h,i) => (
                  <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:theme.textMuted, textAlign:i===0?"left":"right" }}>{h}</div>
                ))}
              </div>

              {/* Linhas */}
              <div style={{ maxHeight: isMobile ? "50vh" : "55vh", overflowY:"auto" }}>
                {visibleRows.length === 0 ? (
                  <div style={{ padding:"40px 20px", textAlign:"center", color:theme.textMuted }}>
                    Nenhuma movimentação no período
                  </div>
                ) : visibleRows.map((r, i) => {
                  const isPos = r.net > 0;
                  const isNeg = r.net < 0;
                  return (
                    <div key={i} className={`cf-row ${isPos?"cf-row-pos":isNeg?"cf-row-neg":""}`}
                      style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", gap:0, padding:"10px 20px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`, transition:"filter 0.15s" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:theme.textPrimary }}>{r.label}</div>
                        {r.weekday && <div style={{ fontSize:10, color:theme.textMuted }}>{r.weekday}</div>}
                      </div>
                      <div style={{ textAlign:"right", fontSize:13, color: r.income > 0 ? theme.income : theme.textMuted, fontWeight: r.income > 0 ? 600 : 400 }}>
                        {r.income > 0 ? fmt(r.income) : "—"}
                      </div>
                      <div style={{ textAlign:"right", fontSize:13, color: r.expense > 0 ? theme.expense : theme.textMuted, fontWeight: r.expense > 0 ? 600 : 400 }}>
                        {r.expense > 0 ? fmt(r.expense) : "—"}
                      </div>
                      {!isMobile && (
                        <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color: isPos ? theme.income : isNeg ? theme.expense : theme.textMuted }}>
                          {r.net !== 0 ? fmtSigned(r.net) : "—"}
                        </div>
                      )}
                      <div style={{ textAlign:"right", fontSize:13, fontWeight:800, color: r.saldo_acumulado >= 0 ? theme.income : theme.expense }}>
                        {fmt(r.saldo_acumulado)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Linha total */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", gap:0, padding:"14px 20px", background: theme.primaryGrad, borderTop:`2px solid ${theme.primary}` }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>TOTAL DO PERÍODO</div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#fff" }}>{fmt(data.total_income)}</div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#fff" }}>{fmt(data.total_expense)}</div>
                {!isMobile && <div style={{ textAlign:"right", fontSize:14, fontWeight:800, color:"#fff" }}>{fmtSigned(data.saldo_periodo)}</div>}
                <div style={{ textAlign:"right", fontSize:14, fontWeight:800, color:"#fff" }}>{fmt(data.saldo_final)}</div>
              </div>
            </div>

            {/* INDICADORES */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:12 }}>
              {[
                { label:`${agrupamento==="daily"?"Dias":"Períodos"} Positivos`,  valor:ind.dias_positivos, color:theme.income  },
                { label:`${agrupamento==="daily"?"Dias":"Períodos"} Negativos`,  valor:ind.dias_negativos, color: ind.dias_negativos > 0 ? theme.expense : theme.income },
                { label:"Maior Entrada",        valor:fmt(ind.maior_entrada),  color:theme.income  },
                { label:"Maior Saída",          valor:fmt(ind.maior_saida),    color:theme.expense },
                { label:"Média de Entradas",    valor:fmt(ind.media_entrada),  color:theme.income  },
                { label:"Média de Saídas",      valor:fmt(ind.media_saida),    color:theme.expense },
              ].map((c,i) => (
                <div key={i} style={{ ...card, padding:"14px 16px" }}>
                  <div style={{ fontSize:11, color:theme.textMuted, marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:c.color }}>{c.valor}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}