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
import fundoRestaura from "../assets/fundorestaura.jpg";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend
} from "recharts";

const API_URL = "https://finance-control-api-production.up.railway.app/api";

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

// ══════════════════════════════
// DASHBOARD PESSOAL (PF)
// ══════════════════════════════
function PersonalDashboard({ theme, isMobile, isGlass, token }) {
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterYear, setFilterYear]     = useState("");
  const [filterMonth, setFilterMonth]   = useState(new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`);
  const userName = localStorage.getItem("name") || "usuário";

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [resT, resB] = await Promise.all([
          fetch(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/bills`,        { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [dataT, dataB] = await Promise.all([resT.json(), resB.json()]);
        setTransactions(Array.isArray(dataT) ? dataT : []);
        setBills(Array.isArray(dataB) ? dataB : []);
      } catch { }
      setLoading(false);
    }
    load();
  }, [token]);

  const currentYear  = String(new Date().getFullYear());
  const currentMonth = new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`;
  const prevMonth    = new Date().getMonth() === 0 ? "12" : (new Date().getMonth() < 10 ? `0${new Date().getMonth()}` : `${new Date().getMonth()}`);
  const prevYear     = new Date().getMonth() === 0 ? String(new Date().getFullYear() - 1) : currentYear;

  const filtered = transactions.filter(t => {
    const yearOk  = !filterYear  || t.date?.startsWith(filterYear);
    const monthOk = !filterMonth || t.date?.substring(5, 7) === filterMonth;
    return yearOk && monthOk;
  });

  const income  = filtered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = filtered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  const prevFiltered = transactions.filter(t =>
    t.date?.startsWith(prevYear) && t.date?.substring(5, 7) === prevMonth
  );
  const prevIncome  = prevFiltered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const prevExpense = prevFiltered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const diffIncome  = prevIncome  > 0 ? ((income  - prevIncome)  / prevIncome  * 100).toFixed(1) : null;
  const diffExpense = prevExpense > 0 ? ((expense - prevExpense) / prevExpense * 100).toFixed(1) : null;

  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
  const upcomingBills = bills.filter(b => {
    if (b.status === "paid") return false;
    const due = new Date(b.due_date + "T00:00:00");
    return due >= today && due <= in7days;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const overdueBills = bills.filter(b => {
    if (b.status === "paid") return false;
    return new Date(b.due_date + "T00:00:00") < today;
  });

  const catMap = {};
  filtered.filter(t => t.type === "expense").forEach(t => {
    const cat = t.category || "Outros";
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat] += t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const years = [...new Set(transactions.map(t => t.date?.substring(0, 4)).filter(Boolean))].sort();

  if (loading) return <p style={{ color: theme.textMuted, padding: 20 }}>Carregando...</p>;

  const card = (color) => ({
    background: isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderTop: `3px solid ${color}`,
    borderRadius: 16, padding: "20px 18px",
    backdropFilter: isGlass ? "blur(18px)" : "none",
  });

  const inputSt = { background: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderInput}`, padding: "8px 14px", borderRadius: 8, fontSize: 13, outline: "none", colorScheme: isGlass ? "light" : "dark", ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }) };

  return (
    <div style={{ padding: isMobile ? "16px" : "32px 40px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: theme.textPrimary, margin: "0 0 4px", fontSize: isMobile ? 20 : 26, fontWeight: 700 }}>
          👋 Olá, {userName}!
        </h2>
        <p style={{ color: theme.textMuted, margin: 0, fontSize: 14 }}>Aqui está sua situação financeira</p>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={inputSt}>
          <option value="">Todos os anos</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={inputSt}>
          <option value="">Todos os meses</option>
          {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
            <option key={m} value={m}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]}</option>
          ))}
        </select>
        {(filterYear || filterMonth) && (
          <button onClick={() => { setFilterYear(""); setFilterMonth(""); }} style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>✕ Limpar</button>
        )}
      </div>
      {overdueBills.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.3rem" }}>🔴</span>
          <div>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>{overdueBills.length} conta{overdueBills.length > 1 ? "s" : ""} vencida{overdueBills.length > 1 ? "s" : ""}!</div>
            <div style={{ color: theme.textMuted, fontSize: 12 }}>Total: {fmt(overdueBills.reduce((s, b) => s + b.amount, 0))}</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div style={card(theme.income)}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", color: theme.textMuted, fontWeight: 700 }}>💚 Receitas</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: theme.income, margin: "8px 0 4px" }}>{fmt(income)}</div>
          {diffIncome !== null && (
            <div style={{ fontSize: 12, color: parseFloat(diffIncome) >= 0 ? theme.income : theme.expense }}>
              {parseFloat(diffIncome) >= 0 ? "▲" : "▼"} {Math.abs(diffIncome)}% vs mês anterior
            </div>
          )}
          <div style={{ fontSize: 12, color: theme.textMuted }}>{filtered.filter(t => t.type === "income").length} entradas</div>
        </div>
        <div style={card(theme.expense)}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", color: theme.textMuted, fontWeight: 700 }}>🔴 Gastos</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: theme.expense, margin: "8px 0 4px" }}>- {fmt(expense)}</div>
          {diffExpense !== null && (
            <div style={{ fontSize: 12, color: parseFloat(diffExpense) <= 0 ? theme.income : theme.expense }}>
              {parseFloat(diffExpense) >= 0 ? "▲" : "▼"} {Math.abs(diffExpense)}% vs mês anterior
            </div>
          )}
          <div style={{ fontSize: 12, color: theme.textMuted }}>{filtered.filter(t => t.type === "expense").length} saídas</div>
        </div>
        <div style={card(balance >= 0 ? theme.accent : theme.expense)}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", color: theme.textMuted, fontWeight: 700 }}>💰 Saldo</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: balance >= 0 ? theme.income : theme.expense, margin: "8px 0 4px" }}>{fmt(balance)}</div>
          <div style={{ height: 4, borderRadius: 4, background: `${theme.accent}22`, marginTop: 8 }}>
            <div style={{ height: "100%", borderRadius: 4, width: income > 0 ? `${Math.min((Math.max(balance, 0) / income) * 100, 100)}%` : "0%", background: balance >= 0 ? theme.income : theme.expense, transition: "width 0.6s" }} />
          </div>
        </div>
      </div>
      {upcomingBills.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 14 }}>📅 Contas nos próximos 7 dias</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingBills.slice(0, 4).map(b => {
              const due     = new Date(b.due_date + "T00:00:00");
              const daysOff = Math.round((due - today) / (1000 * 60 * 60 * 24));
              return (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: isGlass ? "rgba(255,255,255,0.15)" : theme.bgCard, borderRadius: 10, border: `1px solid ${isGlass ? "rgba(255,255,255,0.3)" : theme.borderCard}` }}>
                  <div>
                    <div style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 14 }}>{b.description}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>{daysOff === 0 ? "Vence hoje!" : `Vence em ${daysOff} dia${daysOff > 1 ? "s" : ""}`}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: b.type === "payable" ? theme.expense : theme.income, fontSize: 15 }}>
                    {b.type === "payable" ? "- " : "+ "}{fmt(b.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {topCats.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 14 }}>🏷️ Maiores gastos por categoria</div>
          <div style={{ background: isGlass ? "rgba(255,255,255,0.18)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.35)" : theme.borderCard}`, borderRadius: 16, padding: "16px 20px", backdropFilter: isGlass ? "blur(18px)" : "none" }}>
            {topCats.map(([cat, val], i) => (
              <div key={cat} style={{ marginBottom: i < topCats.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontSize: 13, color: theme.expense, fontWeight: 700 }}>{fmt(val)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: `${theme.expense}22` }}>
                  <div style={{ height: "100%", borderRadius: 4, width: expense > 0 ? `${(val / expense * 100).toFixed(1)}%` : "0%", background: `linear-gradient(90deg, ${theme.expense}, ${theme.primary})`, transition: "width 0.6s" }} />
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{expense > 0 ? (val / expense * 100).toFixed(1) : 0}% dos gastos</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 14 }}>🧾 Últimas transações</div>
        <div style={{ background: isGlass ? "rgba(255,255,255,0.18)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.35)" : theme.borderCard}`, borderRadius: 16, overflow: "hidden", backdropFilter: isGlass ? "blur(18px)" : "none" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
              <p>Nenhuma transação no período</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: isGlass ? "rgba(255,255,255,0.1)" : theme.bgCard, borderBottom: `1px solid ${theme.borderCard}` }}>
                    {["Data", "Descrição", "Categoria", "Valor"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: theme.textMuted, fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${theme.borderCard}` }}>
                      <td style={{ padding: "10px 16px", color: theme.textMuted, fontSize: 13 }}>{t.date ? t.date.split("-").reverse().join("/") : "—"}</td>
                      <td style={{ padding: "10px 16px", color: theme.textPrimary, fontWeight: 500 }}>{t.description}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ background: `${theme.primary}22`, color: theme.primary, borderRadius: 20, padding: "2px 8px", fontSize: 12 }}>{t.category || "Outros"}</span>
                      </td>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: t.type === "income" ? theme.income : theme.expense }}>
                        {t.type === "income" ? "+" : "-"} {fmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════
// DASHBOARD VENDEDOR
// ══════════════════════════════
function SellerDashboard({ theme, isMobile, isGlass, token }) {
  const [quotes, setQuotes]   = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const myUserId = parseInt(localStorage.getItem("user_id") || "0");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [qRes, oRes] = await Promise.all([
          fetch(`${API_URL}/quotes`,  { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/orders`,  { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const qData = await qRes.json();
        const oData = await oRes.json();
        setQuotes((Array.isArray(qData) ? qData : []).filter(q => q.user_id === myUserId));
        setOrders((Array.isArray(oData) ? oData : []).filter(o => o.user_id === myUserId));
      } catch { setQuotes([]); setOrders([]); }
      setLoading(false);
    }
    load();
  }, [token, myUserId]);

  if (loading) return <p style={{ color: theme.textMuted, padding: 20 }}>Carregando...</p>;

  const totalQuotes    = quotes.length;
  const approvedQuotes = quotes.filter(q => q.status === "approved").length;
  const pendingQuotes  = quotes.filter(q => q.status === "draft" || q.status === "sent").length;
  const totalOrders    = orders.length;
  const doneOrders     = orders.filter(o => o.status === "done").length;
  const openOrders     = orders.filter(o => o.status === "open" || o.status === "in_progress").length;
  const totalSold      = orders.filter(o => o.status === "done").reduce((s, o) => s + o.total, 0);
  const totalPending   = orders.filter(o => o.status !== "done" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  const c   = (color) => ({ background: isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`, borderTop: `3px solid ${color}`, borderRadius: 16, padding: "20px 18px", backdropFilter: isGlass ? "blur(18px)" : "none" });
  const lbl = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700, color: theme.textMuted };
  const val = (color) => ({ color, fontSize: isMobile ? 20 : 26, fontWeight: 700, margin: "8px 0 4px" });
  const sub = { fontSize: 12, color: theme.textMuted };
  const sec = { fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.textMuted, margin: "0 0 14px 2px" };

  return (
    <div style={{ padding: isMobile ? "16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: theme.textPrimary, margin: "0 0 4px", fontSize: isMobile ? 20 : 26, fontWeight: 700 }}>👋 Olá, {localStorage.getItem("name") || "Vendedor"}!</h2>
        <p style={{ color: theme.textMuted, margin: 0, fontSize: 14 }}>Resumo das suas atividades de vendas</p>
      </div>
      <p style={sec}>🧾 Orçamentos</p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={c(theme.primary)}><div style={lbl}>Total</div><div style={val(theme.primary)}>{totalQuotes}</div><div style={sub}>criados</div></div>
        <div style={c("#22c55e")}><div style={lbl}>Aprovados</div><div style={val("#22c55e")}>{approvedQuotes}</div><div style={sub}>prontos para vender</div></div>
        <div style={{ ...c("#f59e0b"), gridColumn: isMobile ? "1 / -1" : "auto" }}><div style={lbl}>Pendentes</div><div style={val("#f59e0b")}>{pendingQuotes}</div><div style={sub}>aguardando resposta</div></div>
      </div>
      <p style={sec}>🛒 Vendas</p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={c(theme.primary)}><div style={lbl}>Total</div><div style={val(theme.primary)}>{totalOrders}</div><div style={sub}>criadas</div></div>
        <div style={c("#22c55e")}><div style={lbl}>Concluídas</div><div style={val("#22c55e")}>{doneOrders}</div><div style={sub}>pagas</div></div>
        <div style={c("#3b82f6")}><div style={lbl}>Em aberto</div><div style={val("#3b82f6")}>{openOrders}</div><div style={sub}>aguardando</div></div>
        <div style={{ ...c("#22c55e"), gridColumn: isMobile ? "1 / -1" : "auto" }}><div style={lbl}>💰 Total Vendido</div><div style={{ ...val("#22c55e"), fontSize: isMobile ? 16 : 20 }}>{fmt(totalSold)}</div><div style={sub}>concluídas</div></div>
      </div>
      {totalPending > 0 && (
        <div style={{ background: isGlass ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><div style={{ color: theme.textPrimary, fontWeight: 700, fontSize: 15 }}>⏳ Pendente de recebimento</div><div style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>{openOrders} venda(s) em aberto</div></div>
          <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: isMobile ? 18 : 22 }}>{fmt(totalPending)}</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════
// DASHBOARD ESTOQUE
// ══════════════════════════════
function StockDashboard({ theme, isMobile, isGlass, token }) {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pRes, aRes] = await Promise.all([
          fetch(`${API_URL}/products`,     { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/stock/alerts`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setProducts(Array.isArray(await pRes.json()) ? await pRes.json() : []);
        setAlerts(Array.isArray(await aRes.json()) ? await aRes.json() : []);
      } catch { }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) return <p style={{ color: theme.textMuted, padding: 20 }}>Carregando...</p>;

  const c   = (color) => ({ background: isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`, borderTop: `3px solid ${color}`, borderRadius: 16, padding: "20px 18px", backdropFilter: isGlass ? "blur(18px)" : "none" });
  const lbl = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700, color: theme.textMuted };
  const val = (color) => ({ color, fontSize: isMobile ? 20 : 26, fontWeight: 700, margin: "8px 0 4px" });
  const sub = { fontSize: 12, color: theme.textMuted };

  return (
    <div style={{ padding: isMobile ? "16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: theme.textPrimary, margin: "0 0 4px", fontSize: isMobile ? 20 : 26, fontWeight: 700 }}>📦 Painel de Estoque</h2>
        <p style={{ color: theme.textMuted, margin: 0, fontSize: 14 }}>Visão geral dos produtos e alertas</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={c(theme.primary)}><div style={lbl}>Produtos</div><div style={val(theme.primary)}>{products.filter(p=>p.type==="product").length}</div><div style={sub}>itens físicos</div></div>
        <div style={c("#6366f1")}><div style={lbl}>Serviços</div><div style={val("#6366f1")}>{products.filter(p=>p.type==="service").length}</div><div style={sub}>cadastrados</div></div>
        <div style={c("#22c55e")}><div style={lbl}>Ativos</div><div style={val("#22c55e")}>{products.filter(p=>p.active).length}</div><div style={sub}>disponíveis</div></div>
        <div style={{ ...c("#ef4444"), gridColumn: isMobile ? "1 / -1" : "auto" }}><div style={lbl}>⚠️ Alertas</div><div style={val("#ef4444")}>{alerts.length}</div><div style={sub}>estoque baixo</div></div>
      </div>
    </div>
  );
}

// ══════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════
function Dashboard() {
  const { theme, themeId } = useTheme();
  const isMobile = useIsMobile();
  const isGlass  = themeId === "glass";
  const isGray   = themeId === "gray";
  const isClean  = themeId === "clean"; // ← flag tema clean

  const role        = localStorage.getItem("role")         || "viewer";
  const accountType = localStorage.getItem("account_type") || "business";
  const token       = localStorage.getItem("token")        || "";
  const isPersonal  = accountType === "personal";

  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [description, setDescription]   = useState("");
  const [amount, setAmount]             = useState("");
  const [type, setType]                 = useState("income");
  const [category, setCategory]         = useState("");
  const [date, setDate]                 = useState("");
  const [editingId, setEditingId]       = useState(null);
  const [filterYear, setFilterYear]     = useState("");
  const [filterMonth, setFilterMonth]   = useState("");
  const [filterType, setFilterType]     = useState("");
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const fetchTransactions = async () => {
    if (!token || isPersonal) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return; }
      const data = await res.json();
      if (Array.isArray(data)) { setTransactions(data); setFiltered(data); }
      else { setTransactions([]); setFiltered([]); }
    } catch { setTransactions([]); setFiltered([]); }
    setLoading(false);
  };

  useEffect(() => {
    if (!isPersonal) fetchTransactions();
    else setLoading(false);
  }, [token]);

  useEffect(() => {
    let result = Array.isArray(transactions) ? [...transactions] : [];
    if (filterYear)  result = result.filter(t => t.date?.startsWith(filterYear));
    if (filterMonth) result = result.filter(t => t.date?.substring(5, 7) === filterMonth);
    if (filterType)  result = result.filter(t => t.type === filterType);
    setFiltered(result);
  }, [filterYear, filterMonth, filterType, transactions]);

  const clearFilters = () => { setFilterYear(""); setFilterMonth(""); setFilterType(""); setFiltered(transactions); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category || !date) { alert("Preencha todos os campos!"); return; }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount)) { alert("Valor inválido!"); return; }
    try {
      const url    = editingId ? `${API_URL}/transactions/${editingId}` : `${API_URL}/transactions`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ description, amount: parsedAmount, type, category, date }) });
      const data = await res.json();
      if (!res.ok) { alert(data.msg || "Erro ao salvar"); return; }
    } catch { alert("Erro de conexão"); }
    setDescription(""); setAmount(""); setCategory(""); setDate(""); setEditingId(null);
    fetchTransactions();
  };

  const editTransaction   = (t) => { setEditingId(t.id); setDescription(t.description); setAmount(t.amount); setType(t.type); setCategory(t.category); setDate(t.date); };
  const deleteTransaction = async (id) => { try { await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch {} fetchTransactions(); };

  const income  = filtered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = filtered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  const categoryMap = {};
  filtered.forEach(t => { const cat = t.category || "Outros"; if (!categoryMap[cat]) categoryMap[cat] = 0; categoryMap[cat] += t.amount; });
  const chartData = Object.keys(categoryMap).map(cat => ({ name: cat, value: categoryMap[cat] }));

  const monthMap = {};
  filtered.forEach(t => { if (!t.date) return; const m = t.date.substring(0, 7); if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 }; if (t.type === "income") monthMap[m].income += t.amount; else monthMap[m].expense += t.amount; });
  const monthlyData = Object.values(monthMap);

  let runningBalance = 0;
  const balanceData = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => { runningBalance += t.type === "income" ? t.amount : -t.amount; return { date: t.date, balance: runningBalance }; });

  const categoryMapFull = {};
  filtered.forEach(t => { const cat = t.category || "Outros"; if (!categoryMapFull[cat]) categoryMapFull[cat] = { category: cat, Entradas: 0, Saídas: 0 }; if (t.type === "income") categoryMapFull[cat].Entradas += t.amount; else categoryMapFull[cat].Saídas += t.amount; });
  const radarData = Object.values(categoryMapFull).slice(0, 7);

  const heroHeight   = isMobile ? "220px" : "340px";
  const logoSize     = isMobile ? "100px" : "180px";
  const titleSize    = isMobile ? "22px" : "28px";
  const cardsColumns = isMobile ? "1fr" : "1fr 1fr 1fr";
  const chartsColumns= isMobile ? "1fr" : "1fr 1fr";
  const formColumns  = isMobile ? "1fr" : "2fr 1fr 1fr 1fr 1fr auto";
  const rowColumns   = isMobile ? "1fr 1fr auto auto" : "2fr 1fr 1fr 1fr auto auto";
  const colorScheme  = (isGlass || isClean) ? "light" : "dark";

  const inputStyle = { background: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderInput}`, padding: "8px", borderRadius: "6px", colorScheme, ...((isGlass || isClean) && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }) };
  const editBtn    = { background: `${theme.primary}44`, border: "none", padding: "6px 10px", borderRadius: "6px", color: isClean ? theme.textPrimary : (isGlass ? theme.textPrimary : "white"), cursor: "pointer" };
  const deleteBtn  = { background: "#dc2626", border: "none", padding: "6px 10px", borderRadius: "6px", color: "white", cursor: "pointer" };

  // ── HERO — limpo para tema clean (sem imagem hero, só padding)
  // Para os outros temas mantém o comportamento original
  const Hero = () => {
    if (isClean) {
      // Tema clean: sem hero image — só um header compacto com logo e título
      return (
        <div style={{
          display: "flex", alignItems: "center", gap: 18,
          padding: isMobile ? "20px 16px 12px" : "32px 40px 20px",
          borderBottom: `1px solid ${theme.borderCard}`,
        }}>
          <div style={{
            width: isMobile ? 44 : 56, height: isMobile ? 44 : 56,
            borderRadius: 14,
            background: "rgba(22,163,74,0.12)",
            border: "1.5px solid rgba(22,163,74,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isMobile ? 22 : 28,
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}>🧼</div>
          <div>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0, color: theme.textPrimary, letterSpacing: "0.3px" }}>
              Painel Financeiro
            </h1>
            <p style={{ color: theme.textMuted, margin: "3px 0 0", fontSize: 13 }}>
              {isPersonal ? "Suas finanças pessoais" : "Visão completa das suas finanças"}
            </p>
          </div>
        </div>
      );
    }

    if (isGlass || isGray) {
      return (
        <div style={{ position:"relative", height:heroHeight, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }} />
          <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10, paddingTop: isMobile?48:0 }}>
            <img src={logoGif} alt="Finance Control" style={{ width:logoSize, height:logoSize, objectFit:"contain", filter:"drop-shadow(0 0 20px rgba(255,255,255,0.6))" }} />
            <h1 style={{ fontSize:titleSize, fontWeight:700, margin:0, letterSpacing:"1.5px", color:theme.textPrimary, textAlign:"center" }}>Painel Financeiro</h1>
            <p style={{ color:theme.textMuted, margin:0, fontSize:13 }}>{isPersonal ? "Suas finanças pessoais" : "Visão completa das suas finanças"}</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position:"relative", height:heroHeight, backgroundImage:`url(${topoDashboard})`, backgroundSize:"cover", backgroundPosition:"center 39%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, ${theme.bgPrimary}33 0%, ${theme.bgPrimary}88 60%, ${theme.bgPrimary} 100%)` }} />
        <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10, paddingTop: isMobile?48:0 }}>
          <img src={logoGif} alt="Finance Control" style={{ width:logoSize, height:logoSize, objectFit:"contain", filter:"drop-shadow(0 0 20px rgba(255,255,255,0.5))" }} />
          <h1 style={{ fontSize:titleSize, fontWeight:700, margin:0, letterSpacing:"1.5px", color:"white", textShadow:"0 2px 20px rgba(0,0,0,0.9)", textAlign:"center" }}>Painel Financeiro</h1>
          <p style={{ color:"rgba(255,255,255,0.5)", margin:0, fontSize:13 }}>{isPersonal ? "Suas finanças pessoais" : "Visão completa das suas finanças"}</p>
        </div>
      </div>
    );
  };

  // ── card3d styles — para clean usa shadow mais suave e bordas verdes
  const card3dStyle = isClean
    ? `
      .card3d { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:22px 18px 16px; cursor:default; transition:transform 0.3s ease, box-shadow 0.3s ease; box-shadow:0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9); backdrop-filter:blur(22px) saturate(180%); -webkit-backdrop-filter:blur(22px) saturate(180%); }
      .card3d:hover { transform:translateY(-6px); box-shadow:0 12px 40px rgba(22,163,74,0.15), 0 4px 12px rgba(0,0,0,0.06); }
      .card3d-income  { border-top:3px solid ${theme.income}; }
      .card3d-expense { border-top:3px solid ${theme.expense}; }
      .card3d-balance { border-top:3px solid ${theme.accent}; }
      .chart3d { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:20px; transition:transform 0.3s ease, box-shadow 0.3s ease; box-shadow:0 4px 24px rgba(0,0,0,0.07); backdrop-filter:blur(22px) saturate(180%); -webkit-backdrop-filter:blur(22px) saturate(180%); }
      .chart3d:hover { transform:translateY(-4px); box-shadow:0 12px 36px rgba(22,163,74,0.12); }
      .section-card { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:20px; box-shadow:0 4px 20px rgba(0,0,0,0.06); backdrop-filter:blur(22px) saturate(180%); -webkit-backdrop-filter:blur(22px) saturate(180%); }
      .section-label { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:${theme.textMuted}; margin:0 0 14px 2px; display:flex; align-items:center; gap:8px; }
      .section-label::after { content:""; flex:1; height:1px; background:${theme.border}; }
    `
    : `
      .card3d { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:22px 18px 16px; cursor:default; transition:transform 0.3s ease, box-shadow 0.3s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)":"0 24px 48px rgba(0,0,0,0.55), 0 6px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":""} }
      .card3d:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-8px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.12)":"0 36px 72px rgba(0,0,0,0.65), 0 12px 24px rgba(0,0,0,0.4)"}; }
      .card3d-income  { border-top:2px solid ${theme.income}; }
      .card3d-expense { border-top:2px solid ${theme.expense}; }
      .card3d-balance { border-top:2px solid ${theme.accent}; }
      .chart3d { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:20px; transition:transform 0.3s ease, box-shadow 0.3s ease; transform:perspective(900px) rotateX(3deg) rotateY(-1.5deg); box-shadow:${isGlass?"0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)":"0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":""} }
      .chart3d:hover { transform:perspective(900px) rotateX(0deg) rotateY(0deg) translateY(-5px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.12)":"0 28px 56px rgba(0,0,0,0.55)"}; }
      .section-card { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:20px; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.06)":"0 8px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":""} }
      .section-label { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:${theme.textMuted}; margin:0 0 14px 2px; display:flex; align-items:center; gap:8px; }
      .section-label::after { content:""; flex:1; height:1px; background:${theme.border}; }
      @media (max-width:768px) { .card3d,.chart3d { transform:none !important; } .card3d:hover { transform:translateY(-4px) !important; } .chart3d:hover { transform:translateY(-3px) !important; } }
    `;

  return (
    <PageLayout>
      <style>{`
        ${card3dStyle}
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${theme.primary}44; border-radius:4px; }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, overflowY:"auto", position:"relative", zIndex:1 }}>
        <Hero />

        {isPersonal && <PersonalDashboard theme={theme} isMobile={isMobile} isGlass={isGlass || isClean} token={token} />}
        {!isPersonal && role === "seller" && <SellerDashboard theme={theme} isMobile={isMobile} isGlass={isGlass || isClean} token={token} />}
        {!isPersonal && role === "stock"  && <StockDashboard  theme={theme} isMobile={isMobile} isGlass={isGlass || isClean} token={token} />}

        {!isPersonal && (role === "admin" || role === "financial" || role === "viewer") && (
          <div style={{ padding: isMobile?"16px 16px 0":"32px 40px 0" }}>
            {loading ? <p style={{ color:theme.textMuted }}>Carregando...</p> : (
              <>
                <div style={{ marginBottom:28 }}>
                  <Filters filterYear={filterYear} setFilterYear={setFilterYear} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterType={filterType} setFilterType={setFilterType} clearFilters={clearFilters} inputStyle={inputStyle} />
                </div>
                <div style={{ marginBottom:28 }}>
                  <p className="section-label">📊 Resumo Financeiro</p>
                  <div style={{ display:"grid", gridTemplateColumns:cardsColumns, gap:16 }}>
                    <div className="card3d card3d-income">
                      <div style={cardIcon}>📈</div>
                      <div style={{ ...cardLabel, color:theme.textMuted }}>Entradas</div>
                      <h2 style={{ color:theme.income, margin:"8px 0 4px", fontSize: isMobile?20:24, fontWeight:700 }}>{fmt(income)}</h2>
                      <div style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="income").length} transações</div>
                      <div style={{ height:4, borderRadius:4, overflow:"hidden", background:`${theme.income}22`, marginTop:8 }}><div style={{ height:"100%", borderRadius:4, width: income>0?"100%":"0%", background:theme.income, transition:"width 0.6s" }}/></div>
                    </div>
                    <div className="card3d card3d-expense">
                      <div style={cardIcon}>📉</div>
                      <div style={{ ...cardLabel, color:theme.textMuted }}>Saídas</div>
                      <h2 style={{ color:theme.expense, margin:"8px 0 4px", fontSize: isMobile?20:24, fontWeight:700 }}>- {fmt(expense)}</h2>
                      <div style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="expense").length} transações</div>
                      <div style={{ height:4, borderRadius:4, overflow:"hidden", background:`${theme.expense}22`, marginTop:8 }}><div style={{ height:"100%", borderRadius:4, width: income>0?`${Math.min((expense/income)*100,100)}%`:"0%", background:theme.expense, transition:"width 0.6s" }}/></div>
                    </div>
                    <div className="card3d card3d-balance">
                      <div style={cardIcon}>💰</div>
                      <div style={{ ...cardLabel, color:theme.textMuted }}>Saldo Atual</div>
                      <h2 style={{ color: balance>=0?theme.income:theme.expense, margin:"8px 0 4px", fontSize: isMobile?20:24, fontWeight:700 }}>{fmt(balance)}</h2>
                      <div style={{ ...cardSub, color:theme.textMuted }}>{filtered.length} transações</div>
                      <div style={{ height:4, borderRadius:4, overflow:"hidden", background:`${theme.accent}22`, marginTop:8 }}><div style={{ height:"100%", borderRadius:4, width: income>0?`${Math.min((Math.max(balance,0)/income)*100,100)}%`:"0%", background:theme.accent, transition:"width 0.6s" }}/></div>
                    </div>
                  </div>
                </div>
                {(role==="admin"||role==="financial") && (
                  <div style={{ marginBottom:28 }}>
                    <p className="section-label">✏️ {editingId?"Editar Transação":"Nova Transação"}</p>
                    <div className="section-card">
                      <TransactionForm editingId={editingId} handleSubmit={handleSubmit} description={description} setDescription={setDescription} amount={amount} setAmount={setAmount} type={type} setType={setType} category={category} setCategory={setCategory} date={date} setDate={setDate} form={{ display:"grid", gridTemplateColumns:formColumns, gap:"10px" }} inputStyle={inputStyle} card={cardTransparent} />
                    </div>
                  </div>
                )}
                <div style={{ marginBottom:28 }}>
                  <p className="section-label">📈 Análise Gráfica</p>
                  <div style={{ display:"grid", gridTemplateColumns:chartsColumns, gap:16 }}>
                    <div className="chart3d"><CategoryChart chartData={chartData} card={cardTransparent} /></div>
                    <div className="chart3d"><MonthlyChart monthlyData={monthlyData} card={cardTransparent} /></div>
                    <div className="chart3d" style={isMobile?{gridColumn:"1"}:{}}><BalanceChart data={balanceData} card={cardTransparent} /></div>
                    <div className="chart3d" style={isMobile?{gridColumn:"1"}:{}}>
                      <h3 style={{ ...chartTitle, color:theme.textSecondary }}>🕸️ Radar por Categoria</h3>
                      {radarData.length===0 ? <p style={{ color:theme.textMuted, textAlign:"center", paddingTop:40 }}>Sem dados</p> : (
                        <ResponsiveContainer width="100%" height={isMobile?200:260}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke={theme.border}/>
                            <PolarAngleAxis dataKey="category" stroke={theme.textMuted} tick={{ fontSize:10, fill:theme.textSecondary }}/>
                            <Radar name="Entradas" dataKey="Entradas" stroke={theme.income} fill={theme.income} fillOpacity={0.2}/>
                            <Radar name="Saídas" dataKey="Saídas" stroke={theme.expense} fill={theme.expense} fillOpacity={0.2}/>
                            <Legend/><Tooltip contentStyle={{ background:theme.bgSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:8 }} formatter={(v)=>[fmt(v)]}/>
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom:28 }}>
                  <p className="section-label">🧾 Histórico de Transações</p>
                  <div className="section-card table-scroll">
                    <TransactionList filtered={filtered} editTransaction={role==="viewer"?null:editTransaction} deleteTransaction={role==="viewer"?null:deleteTransaction} row={{ display:"grid", gridTemplateColumns:rowColumns, gap:"8px", padding:"10px", borderBottom:`1px solid ${theme.border}` }} editBtn={editBtn} deleteBtn={deleteBtn} card={cardTransparent} />
                  </div>
                </div>
                <div style={{ height:48 }}/>
              </>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

const cardIcon        = { fontSize:20, marginBottom:6 };
const cardLabel       = { fontSize:11, textTransform:"uppercase", letterSpacing:"0.6px", fontWeight:700 };
const cardSub         = { fontSize:12, marginBottom:4 };
const chartTitle      = { fontSize:14, fontWeight:600, margin:"0 0 16px 0" };
const cardTransparent = { background:"transparent", border:"none", padding:0, borderRadius:0, marginTop:0 };

export default Dashboard;