import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API_URL = "http://localhost:5000/api";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const SOURCE_MAP = {
  all:    { label: "Todas",           icon: "📋" },
  manual: { label: "Lançadas",        icon: "✏️" },
  sale:   { label: "Vendas",          icon: "🛒" },
  bill:   { label: "Contas",          icon: "📄" },
};

export default function Transactions() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile = useIsMobile();

  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [filterType, setFilterType]     = useState("");
  const [filterMonth, setFilterMonth]   = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [sortField, setSortField]       = useState("date");
  const [sortDir, setSortDir]           = useState("desc");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({ description:"", amount:"", type:"income", category:"", date:"" });
  const [showForm, setShowForm]   = useState(false);
  const [newForm, setNewForm]     = useState({ description:"", amount:"", type:"income", category:"", date:"" });

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    if (!token) { navigate("/"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTransactions(list); setFiltered(list);
    } catch { setTransactions([]); setFiltered([]); }
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    let result = [...transactions];

    if (filterSource !== "all") result = result.filter(t => t.source === filterSource);
    if (searchText)  result = result.filter(t =>
      t.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchText.toLowerCase())
    );
    if (filterType)  result = result.filter(t => t.type === filterType);
    if (filterMonth) result = result.filter(t => t.date?.substring(5, 7) === filterMonth);

    result.sort((a, b) => {
      let valA = a[sortField] ?? "", valB = b[sortField] ?? "";
      if (sortField === "amount") { valA = Number(valA); valB = Number(valB); }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    setFiltered(result);
  }, [searchText, filterType, filterMonth, filterSource, sortField, sortDir, transactions]);

  const handleNewSubmit = async (e) => {
    e.preventDefault();
    if (!newForm.description || !newForm.amount || !newForm.date) { alert("Preencha todos os campos!"); return; }
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: newForm.description, amount: Number(newForm.amount), type: newForm.type, category: newForm.category, date: newForm.date }),
      });
      if (res.ok) { setNewForm({ description:"", amount:"", type:"income", category:"", date:"" }); setShowForm(false); fetchTransactions(); }
      else { const data = await res.json(); alert(data.msg || "Erro ao criar transação"); }
    } catch { alert("Erro de conexão com servidor"); }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const res = await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); alert(d.msg || "Não foi possível excluir."); return; }
      fetchTransactions();
    } catch { console.error("Erro ao deletar"); }
  };

  const openEdit = (t) => {
    if (t.source !== "manual") { alert("Transações automáticas não podem ser editadas.\nPara alterar, edite a venda ou conta correspondente."); return; }
    setEditingTransaction(t);
    setEditForm({ description:t.description, amount:t.amount, type:t.type, category:t.category||"", date:t.date||"" });
  };
  const closeEdit = () => setEditingTransaction(null);

  const saveEdit = async () => {
    if (!editForm.description || !editForm.amount || !editForm.date) { alert("Preencha todos os campos!"); return; }
    try {
      const res = await fetch(`${API_URL}/transactions/${editingTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description:editForm.description, amount:Number(editForm.amount), type:editForm.type, category:editForm.category, date:editForm.date }),
      });
      if (res.ok) { closeEdit(); fetchTransactions(); }
      else { const data = await res.json(); alert(data.msg || "Erro ao salvar"); }
    } catch { alert("Erro de conexão com servidor"); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortIcon = (field) => sortField !== field ? " ↕" : sortDir === "asc" ? " ↑" : " ↓";

  const totalIncome  = filtered.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  // totais por source
  const totalSales  = transactions.filter(t => t.source === "sale"   && t.type === "income").reduce((a,b)=>a+b.amount,0);
  const totalBills  = transactions.filter(t => t.source === "bill").reduce((a,b)=>a+b.amount,0);
  const totalManual = transactions.filter(t => t.source === "manual").reduce((a,b)=>a+b.amount,0);

  const fmt = (v) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  const fmtDate = (d) => { if (!d) return "-"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; };

  function sourceLabel(source) {
    const map = { manual:"✏️ Manual", sale:"🛒 Venda", bill:"📄 Conta" };
    return map[source] || source;
  }
  function sourceBadgeStyle(source) {
    const map = {
      manual: { bg:"rgba(148,163,184,0.15)", color:"#94a3b8" },
      sale:   { bg:"rgba(34,197,94,0.15)",   color:"#22c55e" },
      bill:   { bg:"rgba(59,130,246,0.15)",   color:"#3b82f6" },
    };
    return map[source] || map.manual;
  }

  const inputStyle = {
    background: theme.bgInput, color: theme.textPrimary,
    border: `1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`,
    padding:"10px 14px", borderRadius:"8px", fontSize:"14px", outline:"none", colorScheme,
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  };
  const modalInput = {
    background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard,
    border: `1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderInput}`,
    borderRadius:"8px", padding:"10px 14px", color:theme.textPrimary,
    fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box", colorScheme,
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  };
  const saveBtn = { background:theme.primaryGrad, border:"none", color:"white", padding:"10px 24px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", fontWeight:"600" };
  const glassModal = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background:theme.bgModal, border:`1px solid ${theme.borderCard}` };

  const filterBtnStyle = (active) => ({
    background: active ? `${theme.primary}33` : (isGlass?"rgba(255,255,255,0.2)":theme.bgCard),
    color: active ? theme.textActive : theme.textMuted,
    border: active ? `1px solid ${theme.primary}66` : `1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,
    borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer",
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  });

  return (
    <PageLayout>

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .card3d-t {
          background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard};
          border:1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard};
          border-radius:16px; padding:18px 20px; cursor:default;
          transition:transform 0.35s ease, box-shadow 0.35s ease;
          transform:perspective(800px) rotateX(3deg) rotateY(-1.5deg);
          box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"};
          animation:fadeSlideUp 0.5s ease forwards;
          backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"};
          -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"};
          position:relative; overflow:hidden;
        }
        .card3d-t::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-t:hover { transform:perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-8px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.6)"}; }
        .card3d-income-t  { border-top:2px solid ${theme.income}; }
        .card3d-expense-t { border-top:2px solid ${theme.expense}; }
        .card3d-balance-t { border-top:2px solid ${theme.accent}; }
        .table3d {
          background:${isGlass?"rgba(255,255,255,0.18)":theme.bgCard};
          border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard};
          border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch;
          box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.4)"};
          backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"};
          -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"};
        }
        .form3d {
          background:${isGlass?"rgba(255,255,255,0.2)":theme.bgCard};
          border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard};
          border-radius:16px; padding:24px; margin-bottom:24px;
          box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.06)":"0 12px 32px rgba(0,0,0,0.4)"};
          backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"};
          -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"};
        }
        .source-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
        @media (max-width:768px) {
          .card3d-t { transform:none !important; }
          .card3d-t:hover { transform:translateY(-4px) !important; }
          .table3d { transform:none !important; }
          .form-grid-mobile { display:flex !important; flex-direction:column !important; gap:12px !important; }
          .form-grid-mobile input, .form-grid-mobile select, .form-grid-mobile button { width:100% !important; box-sizing:border-box !important; }
          .filters-mobile { flex-direction:column !important; }
          .filters-mobile input, .filters-mobile select { min-width:unset !important; width:100% !important; }
        }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"40px", overflow:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"22px":"28px", fontWeight:700, margin:0, color:theme.textPrimary }}>Transações</h1>
              <p style={{ color:theme.textMuted, fontSize:"13px", margin:"4px 0 0" }}>
                {filtered.length} registro{filtered.length!==1?"s":""} encontrado{filtered.length!==1?"s":""}
              </p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background:theme.primaryGrad, border:"none", color:"white", padding: isMobile?"10px 16px":"12px 20px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:"600", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}>
            {showForm?"✕ Fechar":"+ Nova Transação"}
          </button>
        </div>

        {/* FORMULÁRIO */}
        {showForm && (
          <div className="form3d">
            <h3 style={{ fontSize:"16px", fontWeight:"600", margin:"0 0 20px 0", color:theme.textPrimary }}>➕ Nova Transação Manual</h3>
            <form onSubmit={handleNewSubmit} className={isMobile?"form-grid-mobile":""} style={isMobile?{}:{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto", gap:"16px", alignItems:"start" }}>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Descrição</label><input type="text" placeholder="Ex: Salário, Aluguel..." value={newForm.description} onChange={e=>setNewForm({...newForm,description:e.target.value})} style={modalInput} required /></div>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Valor (R$)</label><input type="number" step="0.01" placeholder="0,00" value={newForm.amount} onChange={e=>setNewForm({...newForm,amount:e.target.value})} style={modalInput} required /></div>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Tipo</label><select value={newForm.type} onChange={e=>setNewForm({...newForm,type:e.target.value})} style={modalInput}><option value="income">Entrada</option><option value="expense">Saída</option></select></div>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Categoria</label><input type="text" placeholder="Ex: Alimentação" value={newForm.category} onChange={e=>setNewForm({...newForm,category:e.target.value})} style={modalInput} /></div>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Data</label><input type="date" value={newForm.date} onChange={e=>setNewForm({...newForm,date:e.target.value})} style={modalInput} required /></div>
              <div style={{ display:"flex", alignItems: isMobile?"stretch":"flex-end" }}>
                <button type="submit" style={{ ...saveBtn, width: isMobile?"100%":"auto" }}>Salvar</button>
              </div>
            </form>
          </div>
        )}

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
          <div className="card3d-t card3d-income-t">
            <div style={cardIcon}>📈</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Total Entradas</span>
            <h2 style={{ color:theme.income, margin:"8px 0 4px", fontSize: isMobile?20:22, fontWeight:700 }}>{fmt(totalIncome)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="income").length} entradas</span>
          </div>
          <div className="card3d-t card3d-expense-t">
            <div style={cardIcon}>📉</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Total Saídas</span>
            <h2 style={{ color:theme.expense, margin:"8px 0 4px", fontSize: isMobile?20:22, fontWeight:700 }}>{fmt(totalExpense)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="expense").length} saídas</span>
          </div>
          <div className="card3d-t card3d-balance-t">
            <div style={cardIcon}>💰</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Saldo do Período</span>
            <h2 style={{ color: totalBalance>=0?theme.income:theme.expense, margin:"8px 0 4px", fontSize: isMobile?20:22, fontWeight:700 }}>{fmt(totalBalance)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.length} transações no total</span>
          </div>
        </div>

        {/* MINI CARDS POR ORIGEM */}
        {!isMobile && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
            {[
              { icon:"🛒", label:"De Vendas",   value:fmt(totalSales),  color:"#22c55e", bg:"rgba(34,197,94,0.08)",   border:"rgba(34,197,94,0.2)"  },
              { icon:"📄", label:"De Contas",   value:fmt(totalBills),  color:"#3b82f6", bg:"rgba(59,130,246,0.08)",  border:"rgba(59,130,246,0.2)" },
              { icon:"✏️", label:"Manuais",     value:fmt(totalManual), color:theme.textMuted, bg: isGlass?"rgba(255,255,255,0.1)":theme.bgCard, border: isGlass?"rgba(255,255,255,0.3)":theme.borderCard },
            ].map((c,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, ...(isGlass && { backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }) }}>
                <span style={{ fontSize:"1.3rem" }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
                  <div style={{ fontSize:"0.95rem", fontWeight:700, color:c.color }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTRO POR ORIGEM */}
        <div className="source-tabs">
          <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, alignSelf:"center", marginRight:4 }}>Origem:</span>
          {Object.entries(SOURCE_MAP).map(([key, { label, icon }]) => (
            <button key={key} style={filterBtnStyle(filterSource===key)} onClick={() => setFilterSource(key)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* FILTROS COMPLEMENTARES */}
        <div className={isMobile?"filters-mobile":""} style={{ display:"flex", gap:"12px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
          <input type="text" placeholder="🔍 Buscar descrição ou categoria..." value={searchText} onChange={e=>setSearchText(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile?"unset":"200px", width: isMobile?"100%":"auto" }} />
          <select value={filterType} onChange={e=>setFilterType(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile?"unset":"160px", width: isMobile?"100%":"auto" }}>
            <option value="">Todos os tipos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile?"unset":"160px", width: isMobile?"100%":"auto" }}>
            <option value="">Todos os meses</option>
            {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m,i) => (
              <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
            ))}
          </select>
          {(searchText||filterType||filterMonth||filterSource!=="all") && (
            <button onClick={() => { setSearchText(""); setFilterType(""); setFilterMonth(""); setFilterSource("all"); }}
              style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"10px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", width: isMobile?"100%":"auto" }}>
              ✕ Limpar filtros
            </button>
          )}
        </div>

        {/* TABELA */}
        <div className="table3d">
          {loading ? (
            <div style={{ ...emptyState, color:theme.textMuted }}>Carregando transações...</div>
          ) : filtered.length === 0 ? (
            <div style={{ ...emptyState, color:theme.textMuted }}>Nenhuma transação encontrada.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth: isMobile?"640px":"unset" }}>
              <thead>
                <tr>
                  {["date","description","category","type","amount"].map(f => {
                    const labels = { date:"Data", description:"Descrição", category:"Categoria", type:"Tipo", amount:"Valor" };
                    if (f==="category" && isMobile) return null;
                    return (
                      <th key={f} style={{ padding:"14px 16px", textAlign: f==="amount"?"right":"left", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", background:"transparent" }} onClick={() => handleSort(f)}>
                        {labels[f]}{sortIcon(f)}
                      </th>
                    );
                  })}
                  {/* COLUNA ORIGEM */}
                  {!isMobile && (
                    <th style={{ padding:"14px 16px", textAlign:"left", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:"transparent", whiteSpace:"nowrap" }}>
                      Origem
                    </th>
                  )}
                  <th style={{ padding:"14px 16px", textAlign:"center", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:"transparent" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isManual = t.source === "manual";
                  const badge = sourceBadgeStyle(t.source);
                  return (
                    <tr key={t.id}
                      style={{ transition:"background 0.15s", background:"transparent" }}
                      onMouseEnter={e=>e.currentTarget.style.background= isGlass?"rgba(255,255,255,0.15)":`${theme.primary}11`}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, color:theme.textSecondary }}>{fmtDate(t.date)}</td>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, color:theme.textPrimary, maxWidth: isMobile?"120px":"none", overflow:"hidden", textOverflow:"ellipsis" }}>{t.description}</td>
                      {!isMobile && (
                        <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                          <span style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCardHover, padding:"3px 10px", borderRadius:"20px", fontSize:"12px", color:theme.textSecondary }}>
                            {t.category||"—"}
                          </span>
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                        <span style={{ padding:"3px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:600, background: t.type==="income"?`${theme.income}22`:`${theme.expense}22`, color: t.type==="income"?theme.income:theme.expense, border:`1px solid ${t.type==="income"?theme.income:theme.expense}44`, whiteSpace:"nowrap" }}>
                          {t.type==="income"?"↑":"↓"}{!isMobile&&(t.type==="income"?" Entrada":" Saída")}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, textAlign:"right", fontWeight:600 }}>
                        <span style={{ color: t.type==="income"?theme.income:theme.expense, whiteSpace:"nowrap" }}>
                          {t.type==="expense"?"-":"+"}{fmt(t.amount)}
                        </span>
                      </td>
                      {/* BADGE ORIGEM */}
                      {!isMobile && (
                        <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                          <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:"11px", fontWeight:600, background:badge.bg, color:badge.color, border:`1px solid ${badge.color}33` }}>
                            {sourceLabel(t.source)}
                          </span>
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                          <button onClick={() => openEdit(t)} style={{ background: isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:"6px", padding:"6px 10px", cursor: isManual?"pointer":"not-allowed", fontSize:"14px", opacity: isManual?1:0.4 }} title={isManual?"Editar":"Transação automática — não editável"}>✏️</button>
                          <button onClick={() => isManual && deleteTransaction(t.id)} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"6px", padding:"6px 10px", cursor: isManual?"pointer":"not-allowed", fontSize:"14px", opacity: isManual?1:0.4 }} title={isManual?"Excluir":"Transação automática — não excluível"}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL EDIÇÃO */}
      {editingTransaction && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }} onClick={closeEdit}>
          <div style={{ ...glassModal, borderRadius:"16px", maxWidth:"520px", width: isMobile?"92%":"100%", padding: isMobile?"24px 20px":"32px", maxHeight:"90vh", overflowY:"auto", boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 50px rgba(0,0,0,0.5)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <h3 style={{ fontSize:"18px", fontWeight:"700", margin:0, color:theme.textPrimary }}>✏️ Editar Transação</h3>
              <button onClick={closeEdit} style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:"32px", height:"32px", borderRadius:"8px", cursor:"pointer", fontSize:"14px" }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Descrição</label><input type="text" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} style={modalInput} /></div>
              <div style={{ display:"flex", gap:16, flexDirection: isMobile?"column":"row" }}>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Valor (R$)</label><input type="number" step="0.01" value={editForm.amount} onChange={e=>setEditForm({...editForm,amount:e.target.value})} style={modalInput} /></div>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Tipo</label><select value={editForm.type} onChange={e=>setEditForm({...editForm,type:e.target.value})} style={modalInput}><option value="income">Entrada</option><option value="expense">Saída</option></select></div>
              </div>
              <div style={{ display:"flex", gap:16, flexDirection: isMobile?"column":"row" }}>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Categoria</label><input type="text" value={editForm.category} onChange={e=>setEditForm({...editForm,category:e.target.value})} style={modalInput} /></div>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Data</label><input type="date" value={editForm.date} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={modalInput} /></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:28, flexDirection: isMobile?"column":"row" }}>
              <button onClick={closeEdit} style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, color:theme.textPrimary, padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", width: isMobile?"100%":"auto" }}>Cancelar</button>
              <button onClick={saveEdit} style={{ ...saveBtn, width: isMobile?"100%":"auto" }}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// =========================
// ESTILOS ESTÁTICOS
// =========================
const cardIcon   = { fontSize:20, marginBottom:6 };
const cardLabel  = { fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 };
const cardSub    = { fontSize:12, marginTop:2, display:"block" };
const tdStyle    = { padding:"12px 16px", fontSize:"13px", whiteSpace:"nowrap" };
const emptyState = { padding:"60px", textAlign:"center", fontSize:"15px" };
const fieldGroup = { display:"flex", flexDirection:"column", gap:"8px", flex:1 };
const modalLabel = { fontSize:"13px", fontWeight:"500" };