import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
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

export default function Analytics() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const role     = localStorage.getItem("role")  || "viewer";
  const myUserId = parseInt(localStorage.getItem("user_id") || "0");
  const token    = localStorage.getItem("token");

  const [transactions, setTransactions] = useState([]);
  const [bills, setBills]               = useState([]);
  const [orders, setOrders]             = useState([]);
  const [teamUsers, setTeamUsers]       = useState([]);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [filterYear, setFilterYear]     = useState("");
  const [filterMonth, setFilterMonth]   = useState("");
  const [filterSeller, setFilterSeller] = useState("all"); // ✅ filtro por vendedor
  const [activeTab, setActiveTab]       = useState("financeiro"); // financeiro | vendas
  const [activeCategory, setActiveCategory] = useState(null);

  const fetchData = async () => {
    if (!token) { navigate("/"); return; }
    setLoading(true);
    try {
      const requests = [
        fetch(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/bills`,        { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/orders`,       { headers: { Authorization: `Bearer ${token}` } }),
      ];
      if (role === "admin" || role === "financial") {
        requests.push(fetch(`${API_URL}/company/users`, { headers: { Authorization: `Bearer ${token}` } }));
      }

      const responses = await Promise.all(requests);
      if (responses[0].status === 401) { localStorage.removeItem("token"); navigate("/"); return; }

      const [dataT, dataB, dataO] = await Promise.all([responses[0].json(), responses[1].json(), responses[2].json()]);
      setTransactions(Array.isArray(dataT) ? dataT : []);
      setBills(Array.isArray(dataB) ? dataB : []);
      setOrders(Array.isArray(dataO) ? dataO : []);

      if (responses[3]) {
        const dataU = await responses[3].json();
        setTeamUsers(Array.isArray(dataU) ? dataU : []);
      }
    } catch (err) { console.log("Erro:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const safe = Array.isArray(transactions) ? transactions : [];
  const filtered = safe.filter(t => {
    const yearOk   = !filterYear  || t.date?.startsWith(filterYear);
    const monthOk  = !filterMonth || t.date?.substring(5, 7) === filterMonth;
    return yearOk && monthOk;
  });

  // ✅ orders filtradas por vendedor
  const filteredOrders = orders.filter(o => {
    const sellerOk = filterSeller === "all" || String(o.user_id) === String(filterSeller);
    const yearOk   = !filterYear  || o.created_at?.startsWith(filterYear);
    const monthOk  = !filterMonth || o.created_at?.substring(5, 7) === filterMonth;
    return sellerOk && yearOk && monthOk;
  });

  const years = [...new Set(safe.map(t => t.date?.substring(0, 4)).filter(Boolean))].sort();

  // ── dados financeiros ──
  let running = 0;
  const balanceData = [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      running += t.type === "income" ? t.amount : -t.amount;
      return { date: t.date, balance: running };
    });

  const monthMap = {};
  filtered.forEach(t => {
    if (!t.date) return;
    const m = t.date.substring(0, 7);
    if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0, balance: 0 };
    if (t.type === "income") monthMap[m].income += t.amount;
    else monthMap[m].expense += t.amount;
    monthMap[m].balance = monthMap[m].income - monthMap[m].expense;
  });
  const monthlyData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  const categoryMap = {};
  filtered.forEach(t => {
    const cat = t.category || "Outros";
    if (!categoryMap[cat]) categoryMap[cat] = { name: cat, income: 0, expense: 0, total: 0 };
    if (t.type === "income") categoryMap[cat].income += t.amount;
    else categoryMap[cat].expense += t.amount;
    categoryMap[cat].total += t.amount;
  });
  const categoryData = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  const totalIncome  = filtered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const totalBalance = totalIncome - totalExpense;
  const avgIncome    = monthlyData.length > 0 ? totalIncome  / monthlyData.length : 0;
  const avgExpense   = monthlyData.length > 0 ? totalExpense / monthlyData.length : 0;

  const pieData      = [{ name:"Entradas", value:totalIncome }, { name:"Saídas", value:totalExpense }];
  const top5Expense  = Object.values(categoryMap).filter(c=>c.expense>0).sort((a,b)=>b.expense-a.expense).slice(0,5).map(c=>({ category:c.name, value:c.expense }));
  const radarData    = categoryData.slice(0,6).map(c=>({ category:c.name, Entradas:c.income, Saídas:c.expense }));

  const safeBills    = Array.isArray(bills) ? bills : [];
  const billsChartData = [
    { name:"A Pagar",   value:safeBills.filter(b=>b.type==="payable"   &&b.status!=="paid").reduce((a,b)=>a+b.amount,0), color:"#ef4444" },
    { name:"A Receber", value:safeBills.filter(b=>b.type==="receivable"&&b.status!=="paid").reduce((a,b)=>a+b.amount,0), color:theme.primary },
    { name:"Pagas",     value:safeBills.filter(b=>b.type==="payable"   &&b.status==="paid").reduce((a,b)=>a+b.amount,0), color:"#22c55e" },
    { name:"Recebidas", value:safeBills.filter(b=>b.type==="receivable"&&b.status==="paid").reduce((a,b)=>a+b.amount,0), color:theme.accent },
    { name:"Vencidas",  value:safeBills.filter(b=>{ if(b.status==="paid") return false; const t=new Date(); t.setHours(0,0,0,0); return new Date(b.due_date+"T00:00:00")<t; }).reduce((a,b)=>a+b.amount,0), color:"#f59e0b" },
  ];

  // ── dados de vendas por vendedor ──
  const sellerMap = {};
  orders.forEach(o => {
    const uid  = o.user_id;
    const name = teamUsers.find(u => u.id === uid)?.name || `Usuário ${uid}`;
    if (!sellerMap[uid]) sellerMap[uid] = { name, total:0, done:0, open:0, count:0 };
    sellerMap[uid].count++;
    sellerMap[uid].total += o.total;
    if (o.status === "done") { sellerMap[uid].done++; sellerMap[uid].total += 0; }
    if (o.status === "open" || o.status === "in_progress") sellerMap[uid].open++;
  });
  const sellerRanking = Object.values(sellerMap).sort((a,b) => b.total - a.total);

  // produtos mais vendidos nas vendas filtradas
  const productSalesMap = {};
  filteredOrders.forEach(o => {
    (o.items||[]).forEach(item => {
      const name = item.name || "Item";
      if (!productSalesMap[name]) productSalesMap[name] = { name, qty:0, total:0 };
      productSalesMap[name].qty   += parseFloat(item.qty   || 0);
      productSalesMap[name].total += parseFloat(item.qty   || 0) * parseFloat(item.price || 0);
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a,b) => b.total - a.total).slice(0, 8);

  // vendas por mês filtradas
  const orderMonthMap = {};
  filteredOrders.forEach(o => {
    if (!o.created_at) return;
    const m = o.created_at.substring(0,7);
    if (!orderMonthMap[m]) orderMonthMap[m] = { month:m, total:0, count:0 };
    orderMonthMap[m].total += o.total;
    orderMonthMap[m].count++;
  });
  const orderMonthlyData = Object.values(orderMonthMap).sort((a,b)=>a.month.localeCompare(b.month));

  const totalVendido    = filteredOrders.filter(o=>o.status==="done").reduce((s,o)=>s+o.total,0);
  const totalVendas     = filteredOrders.length;
  const vendasConcluidas= filteredOrders.filter(o=>o.status==="done").length;
  const vendasAbertas   = filteredOrders.filter(o=>o.status==="open"||o.status==="in_progress").length;

  const colorScheme  = isGlass ? "light" : "dark";
  const tooltipStyle = { background:theme.bgSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:8, ...(isGlass && { backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }) };
  const chartH       = isMobile ? 200 : 280;
  const inputSt      = { background:theme.bgInput, color:theme.textPrimary, border:`1px solid ${theme.borderInput}`, padding:"8px 14px", borderRadius:8, fontSize:13, outline:"none", colorScheme, flex: isMobile?1:"auto", ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }) };

  if (loading) return <h2 style={{ color:theme.textPrimary, padding:"20px" }}>Carregando...</h2>;

  return (
    <PageLayout>
      <style>{`
        .chart3d-a { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; padding:20px; margin-bottom:20px; transition:transform 0.3s ease, box-shadow 0.3s ease; transform:perspective(1000px) rotateX(1deg); box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)":"0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(6px);"} }
        .chart3d-a:hover { transform:perspective(1000px) rotateX(0deg) translateY(-5px); box-shadow:${isGlass?"0 16px 40px rgba(0,0,0,0.1)":"0 24px 48px rgba(0,0,0,0.5)"}; }
        .card3d-a { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:14px; padding:16px 20px; display:flex; flex-direction:column; gap:8px; transition:transform 0.3s ease, box-shadow 0.3s ease; transform:perspective(700px) rotateX(4deg) rotateY(-2deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)":"0 14px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(8px);"} position:relative; overflow:hidden; }
        .card3d-a::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-a:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-8px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 28px 56px rgba(0,0,0,0.55)"}; }
        @media (max-width:768px) { .chart3d-a { transform:none !important; } .chart3d-a:hover { transform:translateY(-3px) !important; } .card3d-a { transform:none !important; } .card3d-a:hover { transform:translateY(-4px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"40px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems: isMobile?"flex-start":"center", marginBottom:28, flexWrap:"wrap", gap:16, flexDirection: isMobile?"column":"row" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"22px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Analytics</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Análise detalhada das suas finanças e vendas</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", width: isMobile?"100%":"auto" }}>
            <select value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={inputSt}>
              <option value="">Todos os anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={inputSt}>
              <option value="">Todos os meses</option>
              {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=>(
                <option key={m} value={m}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]}</option>
              ))}
            </select>
            {(filterYear||filterMonth) && (
              <button onClick={()=>{setFilterYear("");setFilterMonth("");}} style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:13 }}>✕ Limpar</button>
            )}
          </div>
        </div>

        {/* TABS — admin/financial vê as duas abas */}
        {(role === "admin" || role === "financial") && (
          <div style={{ display:"flex", gap:8, marginBottom:28, borderBottom:`1px solid ${theme.borderCard}`, paddingBottom:0 }}>
            {[{ id:"financeiro", label:"💰 Financeiro" }, { id:"vendas", label:"🛒 Vendas & Equipe" }].map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background: activeTab===tab.id?`${theme.primary}22`:"transparent", color: activeTab===tab.id?theme.primary:theme.textMuted, border:"none", borderBottom: activeTab===tab.id?`2px solid ${theme.primary}`:"2px solid transparent", padding:"10px 20px", fontSize:"0.9rem", fontWeight:600, cursor:"pointer", borderRadius:"8px 8px 0 0", transition:"all 0.2s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ══════════════════════════════
            ABA: FINANCEIRO
        ══════════════════════════════ */}
        {(activeTab === "financeiro" || role === "viewer") && (
          <>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
              {[
                { label:"Total Entradas",    value:fmt(totalIncome),  color:theme.income,   border:theme.income  },
                { label:"Total Saídas",      value:fmt(totalExpense), color:theme.expense,  border:theme.expense },
                { label:"Saldo",             value:fmt(totalBalance), color:totalBalance>=0?theme.income:theme.expense, border:theme.accent },
                { label:"Média Entrada/Mês", value:fmt(avgIncome),    color:theme.warning,  border:theme.warning },
                { label:"Média Saída/Mês",   value:fmt(avgExpense),   color:theme.primary,  border:theme.primary },
                { label:"Total Transações",  value:filtered.length,   color:theme.purple,   border:theme.purple  },
              ].map((c,i) => (
                <div key={i} className="card3d-a" style={{ borderLeft:`3px solid ${c.border}` }}>
                  <span style={{ fontSize:10, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>{c.label}</span>
                  <span style={{ fontSize: isMobile?16:20, fontWeight:700, color:c.color }}>{c.value}</span>
                </div>
              ))}
            </div>

            <div className="chart3d-a">
              <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>📈 Evolução do Saldo</h3>
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={balanceData}>
                  <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={theme.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={theme.accent} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                  <XAxis dataKey="date" stroke={theme.textMuted} tick={{ fontSize:10 }}/>
                  <YAxis stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)} width={isMobile?60:80}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={v=>[fmt(v),"Saldo"]}/>
                  <Area type="monotone" dataKey="balance" stroke={theme.accent} strokeWidth={2} fill="url(#balGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart3d-a">
              <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>📊 Entradas vs Saídas por Mês</h3>
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                  <XAxis dataKey="month" stroke={theme.textMuted} tick={{ fontSize:10 }}/>
                  <YAxis stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)} width={isMobile?60:80}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v,name)=>[fmt(v), name==="income"?"Entradas":name==="expense"?"Saídas":"Saldo"]}/>
                  <Legend formatter={v=>v==="income"?"Entradas":v==="expense"?"Saídas":"Saldo"}/>
                  <Bar dataKey="income"  fill={theme.income}  radius={[4,4,0,0]}/>
                  <Bar dataKey="expense" fill={theme.expense} radius={[4,4,0,0]}/>
                  <Bar dataKey="balance" fill={theme.accent}  radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:20, marginBottom:0 }}>
              <div className="chart3d-a">
                <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>🥧 Distribuição Geral</h3>
                <ResponsiveContainer width="100%" height={isMobile?200:260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={isMobile?70:90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      <Cell fill={theme.income}/><Cell fill={theme.expense}/>
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={v=>[fmt(v)]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart3d-a">
                <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>🔴 Top 5 Categorias de Despesa</h3>
                <ResponsiveContainer width="100%" height={isMobile?200:260}>
                  <BarChart data={top5Expense} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                    <XAxis type="number" stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)}/>
                    <YAxis type="category" dataKey="category" stroke={theme.textMuted} tick={{ fontSize:10 }} width={isMobile?70:90}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={v=>[fmt(v),"Despesa"]}/>
                    <Bar dataKey="value" radius={[0,4,4,0]}>{top5Expense.map((_,i)=><Cell key={i} fill={theme.chartColors[i%theme.chartColors.length]}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart3d-a" style={{ marginTop:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>📂 Entradas e Saídas por Categoria</h3>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                <button onClick={()=>setActiveCategory(null)} style={{ background: activeCategory===null?`${theme.primary}33`:theme.bgCard, color: activeCategory===null?theme.textActive:theme.textMuted, border: activeCategory===null?`1px solid ${theme.primary}66`:`1px solid ${theme.borderCard}`, borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>Todas</button>
                {categoryData.map(c=>(
                  <button key={c.name} onClick={()=>setActiveCategory(c.name===activeCategory?null:c.name)} style={{ background: activeCategory===c.name?`${theme.primary}33`:theme.bgCard, color: activeCategory===c.name?theme.textActive:theme.textMuted, border: activeCategory===c.name?`1px solid ${theme.primary}66`:`1px solid ${theme.borderCard}`, borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>{c.name}</button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={activeCategory?categoryData.filter(c=>c.name===activeCategory):categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                  <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize:10 }}/>
                  <YAxis stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)} width={isMobile?60:80}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v,name)=>[fmt(v), name==="income"?"Entradas":"Saídas"]}/>
                  <Legend formatter={v=>v==="income"?"Entradas":"Saídas"}/>
                  <Bar dataKey="income"  fill={theme.income}  radius={[4,4,0,0]}/>
                  <Bar dataKey="expense" fill={theme.expense} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {radarData.length > 0 && (
              <div className="chart3d-a">
                <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>🕸️ Radar por Categoria</h3>
                <ResponsiveContainer width="100%" height={isMobile?220:300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={theme.border}/>
                    <PolarAngleAxis dataKey="category" stroke={theme.textMuted} tick={{ fontSize: isMobile?9:11 }}/>
                    <Radar name="Entradas" dataKey="Entradas" stroke={theme.income}  fill={theme.income}  fillOpacity={0.2}/>
                    <Radar name="Saídas"   dataKey="Saídas"   stroke={theme.expense} fill={theme.expense} fillOpacity={0.2}/>
                    <Legend/>
                    <Tooltip contentStyle={tooltipStyle} formatter={v=>[fmt(v)]}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="chart3d-a">
              <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>📄 Situação das Contas</h3>
              <ResponsiveContainer width="100%" height={isMobile?200:260}>
                <BarChart data={billsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                  <XAxis dataKey="name" stroke={theme.textMuted} tick={{ fontSize: isMobile?9:11 }}/>
                  <YAxis stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)} width={isMobile?60:80}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={v=>[fmt(v)]}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>{billsChartData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:12 }}>
                {billsChartData.map(b=>(
                  <div key={b.name} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:b.color }}/>
                    <span style={{ color:theme.textSecondary, fontSize:12 }}>{b.name}: <strong style={{ color:theme.textPrimary }}>{fmt(b.value)}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            ABA: VENDAS & EQUIPE (admin/financial)
        ══════════════════════════════ */}
        {activeTab === "vendas" && (role === "admin" || role === "financial") && (
          <>
            {/* FILTRO POR VENDEDOR */}
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:24 }}>
              <select value={filterSeller} onChange={e=>setFilterSeller(e.target.value)} style={{ ...inputSt, flex: isMobile?"1":"auto" }}>
                <option value="all">👥 Todos os vendedores</option>
                {teamUsers.map(u=>(
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
              {filterSeller !== "all" && (
                <button onClick={()=>setFilterSeller("all")} style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:13 }}>✕ Limpar filtro</button>
              )}
            </div>

            {/* CARDS VENDAS */}
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:28 }}>
              {[
                { label:"Total Vendido",    value:fmt(totalVendido),    color:"#22c55e", border:"#22c55e" },
                { label:"Total Vendas",     value:totalVendas,           color:theme.primary, border:theme.primary },
                { label:"Concluídas",       value:vendasConcluidas,      color:"#22c55e", border:"#22c55e" },
                { label:"Em aberto",        value:vendasAbertas,         color:"#f59e0b", border:"#f59e0b" },
              ].map((c,i)=>(
                <div key={i} className="card3d-a" style={{ borderLeft:`3px solid ${c.border}` }}>
                  <span style={{ fontSize:10, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>{c.label}</span>
                  <span style={{ fontSize: isMobile?16:20, fontWeight:700, color:c.color }}>{c.value}</span>
                </div>
              ))}
            </div>

            {/* RANKING DE VENDEDORES — só quando "todos" */}
            {filterSeller === "all" && sellerRanking.length > 0 && (
              <div className="chart3d-a">
                <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 16px 0", color:theme.textSecondary }}>🏆 Ranking de Vendedores</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {sellerRanking.map((s,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background: isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderRadius:10, border:`1px solid ${theme.borderCard}` }}>
                      <div style={{ fontSize:"1.3rem", minWidth:32, textAlign:"center" }}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color:theme.textPrimary, fontSize:"0.95rem" }}>{s.name}</div>
                        <div style={{ color:theme.textMuted, fontSize:"0.78rem" }}>{s.count} vendas · {s.done} concluídas · {s.open} em aberto</div>
                      </div>
                      <div style={{ fontWeight:700, color:"#22c55e", fontSize:"1rem" }}>{fmt(s.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VENDAS POR MÊS */}
            <div className="chart3d-a">
              <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 4px 0", color:theme.textSecondary }}>📊 Vendas por Mês</h3>
              <p style={{ fontSize:12, color:theme.textMuted, margin:"0 0 16px" }}>
                {filterSeller==="all" ? "Toda a equipe" : `Vendedor: ${teamUsers.find(u=>String(u.id)===String(filterSeller))?.name || ""}`}
              </p>
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={orderMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                  <XAxis dataKey="month" stroke={theme.textMuted} tick={{ fontSize:10 }}/>
                  <YAxis stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)} width={isMobile?60:80}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v,name)=>[name==="total"?fmt(v):v, name==="total"?"Total vendido":"Nº vendas"]}/>
                  <Legend formatter={v=>v==="total"?"Total vendido":"Nº vendas"}/>
                  <Bar dataKey="total" fill={theme.primary} radius={[4,4,0,0]}/>
                  <Bar dataKey="count" fill={theme.accent}  radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PRODUTOS MAIS VENDIDOS */}
            {topProducts.length > 0 && (
              <div className="chart3d-a">
                <h3 style={{ fontSize:14, fontWeight:600, margin:"0 0 4px 0", color:theme.textSecondary }}>📦 Produtos/Serviços Mais Vendidos</h3>
                <p style={{ fontSize:12, color:theme.textMuted, margin:"0 0 16px" }}>
                  {filterSeller==="all" ? "Toda a equipe" : `Vendedor: ${teamUsers.find(u=>String(u.id)===String(filterSeller))?.name || ""}`}
                </p>
                <ResponsiveContainer width="100%" height={isMobile?220:300}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border}/>
                    <XAxis type="number" stroke={theme.textMuted} tick={{ fontSize:10 }} tickFormatter={v=>fmt(v)}/>
                    <YAxis type="category" dataKey="name" stroke={theme.textMuted} tick={{ fontSize:10 }} width={isMobile?80:120}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v,name)=>[name==="total"?fmt(v):`${v} un`, name==="total"?"Total vendido":"Qtd."]}/>
                    <Legend formatter={v=>v==="total"?"Total vendido":"Qtd."}/>
                    <Bar dataKey="total" fill={theme.income}  radius={[0,4,4,0]}/>
                    <Bar dataKey="qty"   fill={theme.primary} radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}