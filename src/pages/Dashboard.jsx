import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import Filters from "../components/filters/Filters";
import CategoryChart from "../components/charts/CategoryChart";
import MonthlyChart from "../components/charts/MonthlyChart";
import BalanceChart from "../components/charts/BalanceChart";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";

import logoGif from "../assets/video.gif";
import topoDashboard from "../assets/topodashboard.jpg";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend
} from "recharts";

const API_URL = "http://localhost:5000/api";

function fmt(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function Dashboard() {
  const { theme, themeId } = useTheme();
  const isMobile = useIsMobile();
  const isGlass = themeId === "glass";
  const isGray  = themeId === "gray";   // ← ÚNICA ADIÇÃO

  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem("token");

  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) { setTransactions(data); setFiltered(data); }
      else { setTransactions([]); setFiltered([]); }
    } catch (err) { setTransactions([]); setFiltered([]); }
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, [token]);

  useEffect(() => {
    let result = Array.isArray(transactions) ? [...transactions] : [];
    if (filterYear)  result = result.filter(t => t.date?.startsWith(filterYear));
    if (filterMonth) result = result.filter(t => t.date?.substring(5, 7) === filterMonth);
    if (filterType)  result = result.filter(t => t.type === filterType);
    setFiltered(result);
  }, [filterYear, filterMonth, filterType, transactions]);

  const clearFilters = () => {
    setFilterYear(""); setFilterMonth("");
    setFilterType(""); setFiltered(transactions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category || !date) { alert("Preencha todos os campos!"); return; }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount)) { alert("Valor inválido!"); return; }
    const body = { description, amount: parsedAmount, type, category, date };
    try {
      const url    = editingId ? `${API_URL}/transactions/${editingId}` : `${API_URL}/transactions`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.msg || "Erro ao salvar"); return; }
    } catch (err) { alert("Erro de conexão com servidor"); }
    setDescription(""); setAmount(""); setCategory("");
    setDate(""); setEditingId(null);
    fetchTransactions();
  };

  const editTransaction = (t) => {
    setEditingId(t.id); setDescription(t.description);
    setAmount(t.amount); setType(t.type);
    setCategory(t.category); setDate(t.date);
  };

  const deleteTransaction = async (id) => {
    try {
      await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) { console.log("Erro ao deletar", err); }
    fetchTransactions();
  };

  const income  = filtered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = filtered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  const categoryMap = {};
  filtered.forEach(t => {
    const cat = t.category || "Outros";
    if (!categoryMap[cat]) categoryMap[cat] = 0;
    categoryMap[cat] += t.amount;
  });
  const chartData = Object.keys(categoryMap).map(cat => ({ name: cat, value: categoryMap[cat] }));

  const monthMap = {};
  filtered.forEach(t => {
    if (!t.date) return;
    const m = t.date.substring(0, 7);
    if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 };
    if (t.type === "income") monthMap[m].income += t.amount;
    else monthMap[m].expense += t.amount;
  });
  const monthlyData = Object.values(monthMap);

  let runningBalance = 0;
  const balanceData = [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      runningBalance += t.type === "income" ? t.amount : -t.amount;
      return { date: t.date, balance: runningBalance };
    });

  const categoryMapFull = {};
  filtered.forEach(t => {
    const cat = t.category || "Outros";
    if (!categoryMapFull[cat]) categoryMapFull[cat] = { category: cat, Entradas: 0, Saídas: 0 };
    if (t.type === "income") categoryMapFull[cat].Entradas += t.amount;
    else categoryMapFull[cat].Saídas += t.amount;
  });
  const radarData = Object.values(categoryMapFull).slice(0, 7);

  if (loading) {
    return <h2 style={{ color: theme.textPrimary, padding: "20px" }}>Carregando...</h2>;
  }

  const contentPadding = isMobile ? "16px 16px 0" : "32px 40px 0";
  const heroHeight     = isMobile ? "220px" : "340px";
  const logoSize       = isMobile ? "100px" : "180px";
  const titleSize      = isMobile ? "22px" : "28px";
  const cardsColumns   = isMobile ? "1fr" : "1fr 1fr 1fr";
  const chartsColumns  = isMobile ? "1fr" : "1fr 1fr";
  const formColumns    = isMobile ? "1fr" : "2fr 1fr 1fr 1fr 1fr auto";
  const rowColumns     = isMobile ? "1fr 1fr auto auto" : "2fr 1fr 1fr 1fr auto auto";
  const colorScheme    = isGlass ? "light" : "dark";

  const inputStyle = {
    background: theme.bgInput,
    color: theme.textPrimary,
    border: `1px solid ${theme.borderInput}`,
    padding: "8px", borderRadius: "6px",
    colorScheme,
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  };

  const editBtn = {
    background: `${theme.primary}44`, border: "none",
    padding: "6px 10px", borderRadius: "6px",
    color: isGlass ? theme.textPrimary : "white", cursor: "pointer",
  };

  const deleteBtn = {
    background: "#dc2626", border: "none",
    padding: "6px 10px", borderRadius: "6px",
    color: "white", cursor: "pointer",
  };

  return (
    <PageLayout>

      <style>{`
        .card3d {
          background: ${theme.bgCard};
          border: 1px solid ${theme.borderCard};
          border-radius: 16px; padding: 22px 18px 16px; cursor: default;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          transform: perspective(700px) rotateX(5deg) rotateY(-3deg);
          box-shadow: ${isGlass
            ? "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
            : "0 24px 48px rgba(0,0,0,0.55), 0 6px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)"};
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);" : ""}
        }
        .card3d:hover {
          transform: perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-8px);
          box-shadow: ${isGlass
            ? "0 20px 48px rgba(0,0,0,0.12)"
            : "0 36px 72px rgba(0,0,0,0.65), 0 12px 24px rgba(0,0,0,0.4)"};
        }
        .card3d-income  { border-top: 2px solid ${theme.income}; }
        .card3d-expense { border-top: 2px solid ${theme.expense}; }
        .card3d-balance { border-top: 2px solid ${theme.accent}; }
        .chart3d {
          background: ${theme.bgCard};
          border: 1px solid ${theme.borderCard};
          border-radius: 16px; padding: 20px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          transform: perspective(900px) rotateX(3deg) rotateY(-1.5deg);
          box-shadow: ${isGlass
            ? "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
            : "0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"};
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);" : ""}
        }
        .chart3d:hover {
          transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-5px);
          box-shadow: ${isGlass ? "0 20px 48px rgba(0,0,0,0.12)" : "0 28px 56px rgba(0,0,0,0.55)"};
        }
        .section-card {
          background: ${theme.bgCard};
          border: 1px solid ${theme.borderCard};
          border-radius: 16px; padding: 20px;
          box-shadow: ${isGlass ? "0 4px 24px rgba(0,0,0,0.06)" : "0 8px 32px rgba(0,0,0,0.3)"};
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);" : ""}
        }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${theme.textMuted};
          margin: 0 0 14px 2px; display: flex; align-items: center; gap: 8px;
        }
        .section-label::after {
          content: ""; flex: 1; height: 1px; background: ${theme.border};
        }
        @media (max-width: 768px) {
          .card3d { transform: none !important; }
          .card3d:hover { transform: translateY(-4px) !important; }
          .chart3d { transform: none !important; }
          .chart3d:hover { transform: translateY(-3px) !important; }
          .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .form-mobile { display: flex !important; flex-direction: column !important; gap: 12px !important; }
          .form-mobile input, .form-mobile select, .form-mobile button { width: 100% !important; }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.primary}44; border-radius: 4px; }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* ══════════════════════
            HERO
            ══════════════════════ */}
        {(isGlass || isGray) ? (
          // glass e gray: hero limpo sem foto, só logo + título sobre o fundo
          <div style={{
            position: "relative", height: heroHeight,
            display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden",
          }}>
            <div style={{ position:"absolute", inset:0, backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }} />
            <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10, paddingTop: isMobile?48:0 }}>
              <img src={logoGif} alt="Finance Control" style={{ width: logoSize, height: logoSize, objectFit:"contain", filter:"drop-shadow(0 0 20px rgba(255,255,255,0.6))" }} />
              <h1 style={{ fontSize: titleSize, fontWeight:700, margin:0, letterSpacing:"1.5px", color: theme.textPrimary, textAlign:"center" }}>Painel Financeiro</h1>
              <p style={{ color: theme.textMuted, margin:0, fontSize:13, letterSpacing:"0.5px" }}>Visão completa das suas finanças</p>
            </div>
          </div>
        ) : (
          // demais temas (blue, aurora): hero com topodashboard.jpg
          <div style={{
            position: "relative", height: heroHeight,
            backgroundImage: `url(${topoDashboard})`,
            backgroundSize: "cover", backgroundPosition: "center 39%",
            display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden",
          }}>
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, ${theme.bgPrimary}33 0%, ${theme.bgPrimary}88 60%, ${theme.bgPrimary} 100%)` }} />
            <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10, paddingTop: isMobile?48:0 }}>
              <img src={logoGif} alt="Finance Control" style={{ width: logoSize, height: logoSize, objectFit:"contain", filter:"drop-shadow(0 0 20px rgba(255,255,255,0.5))" }} />
              <h1 style={{ fontSize: titleSize, fontWeight:700, margin:0, letterSpacing:"1.5px", color:"white", textShadow:"0 2px 20px rgba(0,0,0,0.9)", textAlign:"center" }}>Painel Financeiro</h1>
              <p style={{ color:"rgba(255,255,255,0.5)", margin:0, fontSize:13, letterSpacing:"0.5px" }}>Visão completa das suas finanças</p>
            </div>
          </div>
        )}

        {/* CONTEÚDO */}
        <div style={{ padding: contentPadding }}>

          {/* FILTROS */}
          <div style={{ marginBottom: 28 }}>
            <Filters
              filterYear={filterYear} setFilterYear={setFilterYear}
              filterMonth={filterMonth} setFilterMonth={setFilterMonth}
              filterType={filterType} setFilterType={setFilterType}
              clearFilters={clearFilters} inputStyle={inputStyle}
            />
          </div>

          {/* CARDS */}
          <div style={{ marginBottom: 28 }}>
            <p className="section-label">📊 Resumo Financeiro</p>
            <div style={{ display: "grid", gridTemplateColumns: cardsColumns, gap: 16 }}>

              <div className="card3d card3d-income">
                <div style={cardIcon}>📈</div>
                <div style={{ ...cardLabel, color: theme.textMuted }}>Entradas</div>
                <h2 style={{ color: theme.income, margin: "8px 0 4px", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>{fmt(income)}</h2>
                <div style={{ ...cardSub, color: theme.textMuted }}>{filtered.filter(t => t.type === "income").length} transações</div>
                <div style={{ height: 4, borderRadius: 4, overflow: "hidden", background: `${theme.income}22`, marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 4, width: income > 0 ? "100%" : "0%", background: theme.income, transition: "width 0.6s" }} />
                </div>
              </div>

              <div className="card3d card3d-expense">
                <div style={cardIcon}>📉</div>
                <div style={{ ...cardLabel, color: theme.textMuted }}>Saídas</div>
                <h2 style={{ color: theme.expense, margin: "8px 0 4px", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>- {fmt(expense)}</h2>
                <div style={{ ...cardSub, color: theme.textMuted }}>{filtered.filter(t => t.type === "expense").length} transações</div>
                <div style={{ height: 4, borderRadius: 4, overflow: "hidden", background: `${theme.expense}22`, marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 4, width: income > 0 ? `${Math.min((expense / income) * 100, 100)}%` : "0%", background: theme.expense, transition: "width 0.6s" }} />
                </div>
              </div>

              <div className="card3d card3d-balance">
                <div style={cardIcon}>💰</div>
                <div style={{ ...cardLabel, color: theme.textMuted }}>Saldo Atual</div>
                <h2 style={{ color: balance >= 0 ? theme.income : theme.expense, margin: "8px 0 4px", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>{fmt(balance)}</h2>
                <div style={{ ...cardSub, color: theme.textMuted }}>{filtered.length} transações no total</div>
                <div style={{ height: 4, borderRadius: 4, overflow: "hidden", background: `${theme.accent}22`, marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 4, width: income > 0 ? `${Math.min((Math.max(balance, 0) / income) * 100, 100)}%` : "0%", background: theme.accent, transition: "width 0.6s" }} />
                </div>
              </div>

            </div>
          </div>

          {/* FORMULÁRIO */}
          <div style={{ marginBottom: 28 }}>
            <p className="section-label">✏️ {editingId ? "Editar Transação" : "Nova Transação"}</p>
            <div className="section-card">
              <TransactionForm
                editingId={editingId} handleSubmit={handleSubmit}
                description={description} setDescription={setDescription}
                amount={amount} setAmount={setAmount}
                type={type} setType={setType}
                category={category} setCategory={setCategory}
                date={date} setDate={setDate}
                form={{ display: "grid", gridTemplateColumns: formColumns, gap: "10px" }}
                inputStyle={inputStyle} card={cardTransparent}
              />
            </div>
          </div>

          {/* GRÁFICOS */}
          <div style={{ marginBottom: 28 }}>
            <p className="section-label">📈 Análise Gráfica</p>
            <div style={{ display: "grid", gridTemplateColumns: chartsColumns, gap: 16 }}>

              <div className="chart3d"><CategoryChart chartData={chartData} card={cardTransparent} /></div>
              <div className="chart3d"><MonthlyChart monthlyData={monthlyData} card={cardTransparent} /></div>
              <div className="chart3d" style={isMobile ? { gridColumn: "1" } : {}}><BalanceChart data={balanceData} card={cardTransparent} /></div>

              <div className="chart3d" style={isMobile ? { gridColumn: "1" } : {}}>
                <h3 style={{ ...chartTitle, color: theme.textSecondary }}>🕸️ Radar por Categoria</h3>
                {radarData.length === 0 ? (
                  <p style={{ color: theme.textMuted, textAlign: "center", paddingTop: 40 }}>Sem dados suficientes</p>
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={theme.border} />
                      <PolarAngleAxis dataKey="category" stroke={theme.textMuted} tick={{ fontSize: 10, fill: theme.textSecondary }} />
                      <Radar name="Entradas" dataKey="Entradas" stroke={theme.income} fill={theme.income} fillOpacity={0.2} />
                      <Radar name="Saídas" dataKey="Saídas" stroke={theme.expense} fill={theme.expense} fillOpacity={0.2} />
                      <Legend />
                      <Tooltip contentStyle={{ background: theme.bgSecondary, border: `1px solid ${theme.borderCard}`, borderRadius: 8 }} formatter={(v) => [fmt(v)]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </div>

          {/* TRANSAÇÕES */}
          <div style={{ marginBottom: 28 }}>
            <p className="section-label">🧾 Histórico de Transações</p>
            <div className="section-card table-scroll">
              <TransactionList
                filtered={filtered}
                editTransaction={editTransaction}
                deleteTransaction={deleteTransaction}
                row={{ display: "grid", gridTemplateColumns: rowColumns, gap: "8px", padding: "10px", borderBottom: `1px solid ${theme.border}` }}
                editBtn={editBtn} deleteBtn={deleteBtn} card={cardTransparent}
              />
            </div>
          </div>

          <div style={{ height: 48 }} />
        </div>
      </div>
    </PageLayout>
  );
}

// =========================
// ESTILOS ESTÁTICOS
// =========================

const cardIcon        = { fontSize: 20, marginBottom: 6 };
const cardLabel       = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700 };
const cardSub         = { fontSize: 12, marginBottom: 4 };
const chartTitle      = { fontSize: 14, fontWeight: 600, margin: "0 0 16px 0" };
const cardTransparent = { background: "transparent", border: "none", padding: 0, borderRadius: 0, marginTop: 0 };

export default Dashboard;