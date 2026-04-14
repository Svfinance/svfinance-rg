import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API_URL = "https://finance-control-api-production.up.railway.app/api";

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
  all:    { label: "Todas",    icon: "📋" },
  manual: { label: "Lançadas", icon: "✏️" },
  sale:   { label: "Vendas",   icon: "🛒" },
  bill:   { label: "Contas",   icon: "📄" },
};

const PERSONAL_CATEGORIES = {
  expense: ["🍔 Alimentação","🚗 Transporte","🏠 Moradia","💊 Saúde","🎬 Lazer","👗 Vestuário","📚 Educação","💡 Energia","📱 Telefone/Internet","🐾 Pet","✈️ Viagem","💳 Cartão","💰 Investimento","🎁 Presentes","Outros"],
  income:  ["💼 Salário","🔄 Freelance","💹 Investimentos","🏠 Aluguel Recebido","🎁 Presente","💰 Reembolso","Outros"],
};
const BUSINESS_CATEGORIES = {
  expense: ["Fornecedores","Salários","Aluguel","Marketing","Equipamentos","Serviços","Impostos","Logística","Outros"],
  income:  ["Vendas","Serviços Prestados","Consultoria","Outros"],
};

// ✅ helpers de data para recorrência
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function addWeeks(dateStr, n) {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setDate(dt.getDate() + n * 7);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function addYears(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y + n}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export default function Transactions() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();

  const accountType = localStorage.getItem("account_type") || "business";
  const isPersonal  = accountType === "personal";
  const token       = localStorage.getItem("token");

  const CATEGORIES = isPersonal ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES;

  const [transactions, setTransactions]             = useState([]);
  const [filtered, setFiltered]                     = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [sidebarOpen, setSidebarOpen]               = useState(false);
  const [searchText, setSearchText]                 = useState("");
  const [filterType, setFilterType]                 = useState("");
  const [filterMonth, setFilterMonth]               = useState("");
  const [filterYear, setFilterYear]                 = useState("");
  const [filterCategory, setFilterCategory]         = useState("");
  const [filterSource, setFilterSource]             = useState("all");
  const [sortField, setSortField]                   = useState("date");
  const [sortDir, setSortDir]                       = useState("desc");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm]     = useState({ description:"", amount:"", type:"income", category:"", date:"" });
  const [showForm, setShowForm]     = useState(false);
  const [newForm, setNewForm]       = useState({ description:"", amount:"", type:"income", category:"", date:"" });
  const [toast, setToast]           = useState(null);

  // ✅ estados de recorrência
  const [recurring, setRecurring]               = useState(false);
  const [recurringFreq, setRecurringFreq]       = useState("monthly");
  const [recurringQty, setRecurringQty]         = useState(3);
  const [savingRecurring, setSavingRecurring]   = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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
    if (!isPersonal && filterSource !== "all") result = result.filter(t => t.source === filterSource);
    if (searchText)     result = result.filter(t => t.description?.toLowerCase().includes(searchText.toLowerCase()) || t.category?.toLowerCase().includes(searchText.toLowerCase()));
    if (filterType)     result = result.filter(t => t.type === filterType);
    if (filterMonth)    result = result.filter(t => t.date?.substring(5, 7) === filterMonth);
    if (filterYear)     result = result.filter(t => t.date?.startsWith(filterYear));
    if (filterCategory) result = result.filter(t => (t.category||"").includes(filterCategory.replace(/^.* /,"")));
    result.sort((a, b) => {
      let valA = a[sortField] ?? "", valB = b[sortField] ?? "";
      if (sortField === "amount") { valA = Number(valA); valB = Number(valB); }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    setFiltered(result);
  }, [searchText, filterType, filterMonth, filterYear, filterCategory, filterSource, sortField, sortDir, transactions]);

  const years         = [...new Set(transactions.map(t => t.date?.substring(0, 4)).filter(Boolean))].sort().reverse();
  const allCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();

  // ✅ submit com suporte a recorrência
  const handleNewSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!newForm.description || !newForm.amount || !newForm.date) {
      showToast("Preencha todos os campos!", "error"); return;
    }
    setSavingRecurring(true);
    try {
      if (!recurring) {
        const res = await fetch(`${API_URL}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ description:newForm.description, amount:Number(newForm.amount), type:newForm.type, category:newForm.category, date:newForm.date }),
        });
        if (res.ok) {
          setNewForm({ description:"", amount:"", type:"income", category:"", date:"" });
          setShowForm(false);
          showToast("Transação criada!");
          fetchTransactions();
        } else { const data = await res.json(); showToast(data.msg || "Erro ao criar", "error"); }
      } else {
        const qty   = parseInt(recurringQty) || 2;
        const dates = [newForm.date];
        for (let i = 1; i < qty; i++) {
          if (recurringFreq === "monthly") dates.push(addMonths(newForm.date, i));
          if (recurringFreq === "weekly")  dates.push(addWeeks(newForm.date, i));
          if (recurringFreq === "yearly")  dates.push(addYears(newForm.date, i));
        }
        const freqLabel = { monthly:"Mensal", weekly:"Semanal", yearly:"Anual" }[recurringFreq];
        const results = await Promise.all(
          dates.map((dt, i) =>
            fetch(`${API_URL}/transactions`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                description: `${newForm.description} (${freqLabel} ${i+1}/${qty})`,
                amount: Number(newForm.amount),
                type: newForm.type,
                category: newForm.category,
                date: dt,
              }),
            })
          )
        );
        if (results.every(r => r.ok)) {
          setNewForm({ description:"", amount:"", type:"income", category:"", date:"" });
          setRecurring(false); setRecurringQty(3);
          setShowForm(false);
          showToast(`✅ ${qty} transações recorrentes criadas!`);
          fetchTransactions();
        } else { showToast("Erro ao criar algumas transações.", "error"); }
      }
    } catch { showToast("Erro de conexão", "error"); }
    finally { setSavingRecurring(false); }
  };

  const duplicateTransaction = async (t) => {
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description:`${t.description} (cópia)`, amount:t.amount, type:t.type, category:t.category, date:t.date }),
      });
      if (res.ok) { showToast("Transação duplicada!"); fetchTransactions(); }
      else showToast("Erro ao duplicar", "error");
    } catch { showToast("Erro de conexão", "error"); }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Excluir esta transação?")) return;
    try {
      const res = await fetch(`${API_URL}/transactions/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) { showToast("Transação removida."); fetchTransactions(); }
      else { const d = await res.json(); showToast(d.msg || "Erro ao excluir", "error"); }
    } catch { showToast("Erro de conexão", "error"); }
  };

  const openEdit = (t) => {
    if (!isPersonal && t.source !== "manual") { showToast("Transações automáticas não podem ser editadas.", "error"); return; }
    setEditingTransaction(t);
    setEditForm({ description:t.description, amount:t.amount, type:t.type, category:t.category||"", date:t.date||"" });
  };
  const closeEdit = () => setEditingTransaction(null);

  const saveEdit = async () => {
    if (!editForm.description || !editForm.amount || !editForm.date) { showToast("Preencha todos os campos!", "error"); return; }
    try {
      const res = await fetch(`${API_URL}/transactions/${editingTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ description:editForm.description, amount:Number(editForm.amount), type:editForm.type, category:editForm.category, date:editForm.date }),
      });
      if (res.ok) { closeEdit(); showToast("Salvo!"); fetchTransactions(); }
      else { const data = await res.json(); showToast(data.msg || "Erro ao salvar", "error"); }
    } catch { showToast("Erro de conexão", "error"); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortIcon = (field) => sortField !== field ? " ↕" : sortDir === "asc" ? " ↑" : " ↓";

  const totalIncome  = filtered.filter(t => t.type==="income").reduce((a,b) => a+b.amount, 0);
  const totalExpense = filtered.filter(t => t.type==="expense").reduce((a,b) => a+b.amount, 0);
  const totalBalance = totalIncome - totalExpense;
  const totalSales   = transactions.filter(t => t.source==="sale" && t.type==="income").reduce((a,b)=>a+b.amount,0);
  const totalBills   = transactions.filter(t => t.source==="bill").reduce((a,b)=>a+b.amount,0);
  const totalManual  = transactions.filter(t => t.source==="manual").reduce((a,b)=>a+b.amount,0);

  const fmt     = (v) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  const fmtDate = (d) => { if (!d) return "-"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; };

  function sourceLabel(source) {
    return { manual:"✏️ Manual", sale:"🛒 Venda", bill:"📄 Conta" }[source] || source;
  }
  function sourceBadgeStyle(source) {
    return { manual:{ bg:"rgba(148,163,184,0.15)", color:"#94a3b8" }, sale:{ bg:"rgba(34,197,94,0.15)", color:"#22c55e" }, bill:{ bg:"rgba(59,130,246,0.15)", color:"#3b82f6" } }[source] || { bg:"rgba(148,163,184,0.15)", color:"#94a3b8" };
  }

  const inputStyle = {
    background:theme.bgInput, color:theme.textPrimary,
    border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`,
    padding:"10px 14px", borderRadius:"8px", fontSize:"14px", outline:"none", colorScheme,
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  };
  const modalInput = {
    background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard,
    border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderInput}`,
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

  const formCats     = CATEGORIES[newForm.type]  || [];
  const editFormCats = CATEGORIES[editForm.type] || [];

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .card3d-t { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}; border-radius:16px; padding:18px 20px; cursor:default; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(800px) rotateX(3deg) rotateY(-1.5deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"}; animation:fadeSlideUp 0.5s ease forwards; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"}; position:relative; overflow:hidden; }
        .card3d-t::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-t:hover { transform:perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-8px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.6)"}; }
        .card3d-income-t  { border-top:2px solid ${theme.income}; }
        .card3d-expense-t { border-top:2px solid ${theme.expense}; }
        .card3d-balance-t { border-top:2px solid ${theme.accent}; }
        .table3d { background:${isGlass?"rgba(255,255,255,0.18)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.4)"}; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; }
        .form3d { background:${isGlass?"rgba(255,255,255,0.2)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; padding:24px; margin-bottom:24px; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.06)":"0 12px 32px rgba(0,0,0,0.4)"}; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; }
        .tr-hover:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}11`} !important; }
        @media (max-width:768px) { .card3d-t { transform:none !important; } .card3d-t:hover { transform:translateY(-4px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"40px", overflow:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"22px":"28px", fontWeight:700, margin:0, color:theme.textPrimary }}>Transações</h1>
              <p style={{ color:theme.textMuted, fontSize:"13px", margin:"4px 0 0" }}>{filtered.length} registro{filtered.length!==1?"s":""} encontrado{filtered.length!==1?"s":""}</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background:theme.primaryGrad, border:"none", color:"white", padding:isMobile?"10px 16px":"12px 20px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:"600", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}>
            {showForm?"✕ Fechar":"+ Nova Transação"}
          </button>
        </div>

        {/* ✅ FORMULÁRIO COM RECORRÊNCIA */}
        {showForm && (
          <div className="form3d">
            <h3 style={{ fontSize:"16px", fontWeight:"600", margin:"0 0 20px 0", color:theme.textPrimary }}>➕ Nova Transação</h3>

            {/* seletor visual tipo PF */}
            {isPersonal && (
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                {[{ v:"expense", label:"💸 Saída", color:theme.expense }, { v:"income", label:"💚 Entrada", color:theme.income }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setNewForm({...newForm, type:opt.v, category:""})}
                    style={{ flex:1, padding:"12px", borderRadius:10, border:`2px solid ${newForm.type===opt.v?opt.color:theme.borderCard}`, background:newForm.type===opt.v?`${opt.color}22`:"transparent", color:newForm.type===opt.v?opt.color:theme.textMuted, fontWeight:700, fontSize:15, cursor:"pointer", transition:"all 0.2s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* campos principais */}
            <div style={isMobile ? { display:"flex", flexDirection:"column", gap:14 } : { display:"grid", gridTemplateColumns:isPersonal?"1fr 1fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", gap:"16px", alignItems:"start" }}>
              <div style={fieldGroup}>
                <label style={{ ...modalLabel, color:theme.textSecondary }}>Descrição</label>
                <input type="text" placeholder={isPersonal?"Ex: Mercado, Salário...":"Ex: Salário, Aluguel..."} value={newForm.description} onChange={e=>setNewForm({...newForm,description:e.target.value})} style={modalInput} required />
              </div>
              <div style={fieldGroup}>
                <label style={{ ...modalLabel, color:theme.textSecondary }}>Valor (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={newForm.amount} onChange={e=>setNewForm({...newForm,amount:e.target.value})} style={modalInput} required />
              </div>
              {!isPersonal && (
                <div style={fieldGroup}>
                  <label style={{ ...modalLabel, color:theme.textSecondary }}>Tipo</label>
                  <select value={newForm.type} onChange={e=>setNewForm({...newForm,type:e.target.value,category:""})} style={modalInput}>
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                </div>
              )}
              <div style={fieldGroup}>
                <label style={{ ...modalLabel, color:theme.textSecondary }}>Categoria</label>
                <select value={newForm.category} onChange={e=>setNewForm({...newForm,category:e.target.value})} style={modalInput}>
                  <option value="">— Selecione —</option>
                  {formCats.map(c => <option key={c} value={c.replace(/^.* /,"")}>{c}</option>)}
                </select>
              </div>
              <div style={fieldGroup}>
                <label style={{ ...modalLabel, color:theme.textSecondary }}>Data</label>
                <input type="date" value={newForm.date} onChange={e=>setNewForm({...newForm,date:e.target.value})} style={modalInput} required />
              </div>
            </div>

            {/* ✅ BLOCO RECORRÊNCIA */}
            <div style={{ marginTop:20, padding:"16px 20px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:12, border:`1px solid ${recurring?`${theme.primary}44`:isGlass?"rgba(255,255,255,0.3)":theme.border}`, transition:"border-color 0.2s" }}>
              {/* toggle */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={() => setRecurring(!recurring)}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:"1.1rem" }}>🔁</span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:recurring?theme.primary:theme.textPrimary }}>Transação Recorrente</div>
                    <div style={{ fontSize:12, color:theme.textMuted }}>Repete automaticamente nas próximas datas</div>
                  </div>
                </div>
                <div style={{ width:44, height:24, borderRadius:12, background:recurring?theme.primary:"rgba(100,116,139,0.3)", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:3, left:recurring?22:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>
              </div>

              {/* opções */}
              {recurring && (
                <div style={{ marginTop:16, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
                  <div style={fieldGroup}>
                    <label style={{ ...modalLabel, color:theme.textSecondary }}>Frequência</label>
                    <select value={recurringFreq} onChange={e=>setRecurringFreq(e.target.value)} style={{ ...modalInput, width:"auto" }}>
                      <option value="weekly">📅 Semanal</option>
                      <option value="monthly">📆 Mensal</option>
                      <option value="yearly">🗓️ Anual</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={{ ...modalLabel, color:theme.textSecondary }}>Repetições</label>
                    <select value={recurringQty} onChange={e=>setRecurringQty(e.target.value)} style={{ ...modalInput, width:"auto" }}>
                      {recurringFreq === "weekly"  && [2,3,4,6,8,12,16,24,52].map(n => <option key={n} value={n}>{n}x ({n} semanas)</option>)}
                      {recurringFreq === "monthly" && [2,3,6,9,12,18,24].map(n => <option key={n} value={n}>{n}x ({n} meses)</option>)}
                      {recurringFreq === "yearly"  && [2,3,4,5].map(n => <option key={n} value={n}>{n}x ({n} anos)</option>)}
                    </select>
                  </div>
                  {/* preview datas */}
                  {newForm.date && (
                    <div style={{ padding:"10px 14px", background:isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, borderRadius:10, border:`1px solid ${theme.primary}33`, fontSize:12, color:theme.textMuted, flex:1, minWidth:180 }}>
                      <div style={{ fontWeight:600, color:theme.primary, marginBottom:6 }}>📋 Preview das datas:</div>
                      {Array.from({ length: Math.min(parseInt(recurringQty)||2, 4) }).map((_, i) => {
                        let dt = newForm.date;
                        if (recurringFreq === "monthly") dt = addMonths(newForm.date, i);
                        if (recurringFreq === "weekly")  dt = addWeeks(newForm.date, i);
                        if (recurringFreq === "yearly")  dt = addYears(newForm.date, i);
                        const [y,m,d] = dt.split("-");
                        return <div key={i} style={{ marginBottom:2 }}>• {d}/{m}/{y}</div>;
                      })}
                      {parseInt(recurringQty) > 4 && <div style={{ color:theme.textMuted }}>+ {parseInt(recurringQty)-4} mais...</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* botões */}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:16, flexDirection:isMobile?"column":"row" }}>
              <button type="button" onClick={() => { setShowForm(false); setRecurring(false); }}
                style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleNewSubmit} disabled={savingRecurring}
                style={{ ...saveBtn, opacity:savingRecurring?0.6:1, cursor:savingRecurring?"not-allowed":"pointer", width:isMobile?"100%":"auto", borderRadius:10, padding:"10px 24px" }}>
                {savingRecurring ? "Criando..." : recurring ? `🔁 Criar ${recurringQty}x ${{ weekly:"Semanal", monthly:"Mensal", yearly:"Anual" }[recurringFreq]}` : "💾 Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
          <div className="card3d-t card3d-income-t">
            <div style={cardIcon}>📈</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Total Entradas</span>
            <h2 style={{ color:theme.income, margin:"8px 0 4px", fontSize:isMobile?20:22, fontWeight:700 }}>{fmt(totalIncome)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="income").length} entradas</span>
          </div>
          <div className="card3d-t card3d-expense-t">
            <div style={cardIcon}>📉</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Total Saídas</span>
            <h2 style={{ color:theme.expense, margin:"8px 0 4px", fontSize:isMobile?20:22, fontWeight:700 }}>{fmt(totalExpense)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.filter(t=>t.type==="expense").length} saídas</span>
          </div>
          <div className="card3d-t card3d-balance-t">
            <div style={cardIcon}>💰</div>
            <span style={{ ...cardLabel, color:theme.textMuted }}>Saldo do Período</span>
            <h2 style={{ color:totalBalance>=0?theme.income:theme.expense, margin:"8px 0 4px", fontSize:isMobile?20:22, fontWeight:700 }}>{fmt(totalBalance)}</h2>
            <span style={{ ...cardSub, color:theme.textMuted }}>{filtered.length} transações</span>
          </div>
        </div>

        {/* MINI CARDS ORIGEM — só business */}
        {!isPersonal && !isMobile && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
            {[
              { icon:"🛒", label:"De Vendas", value:fmt(totalSales),  color:"#22c55e", bg:"rgba(34,197,94,0.08)",  border:"rgba(34,197,94,0.2)"  },
              { icon:"📄", label:"De Contas", value:fmt(totalBills),  color:"#3b82f6", bg:"rgba(59,130,246,0.08)", border:"rgba(59,130,246,0.2)" },
              { icon:"✏️", label:"Manuais",   value:fmt(totalManual), color:theme.textMuted, bg:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, border:isGlass?"rgba(255,255,255,0.3)":theme.borderCard },
            ].map((c,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, ...(isGlass&&{backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}) }}>
                <span style={{ fontSize:"1.3rem" }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
                  <div style={{ fontSize:"0.95rem", fontWeight:700, color:c.color }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTRO POR ORIGEM — só business */}
        {!isPersonal && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, alignSelf:"center", marginRight:4 }}>Origem:</span>
            {Object.entries(SOURCE_MAP).map(([key, { label, icon }]) => (
              <button key={key} style={filterBtnStyle(filterSource===key)} onClick={() => setFilterSource(key)}>
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <input type="text" placeholder="🔍 Buscar..." value={searchText} onChange={e=>setSearchText(e.target.value)} style={{ ...inputStyle, width:isMobile?"100%":"200px" }} />
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ ...inputStyle, width:isMobile?"100%":"auto" }}>
            <option value="">Tipo: Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{ ...inputStyle, width:isMobile?"100%":"auto" }}>
            <option value="">Categoria: Todas</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {years.length > 1 && (
            <select value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={{ ...inputStyle, width:isMobile?"100%":"auto" }}>
              <option value="">Todos os anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ ...inputStyle, width:isMobile?"100%":"auto" }}>
            <option value="">Mês: Todos</option>
            {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m,i) => (
              <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
            ))}
          </select>
          {(searchText||filterType||filterMonth||filterYear||filterCategory||filterSource!=="all") && (
            <button onClick={() => { setSearchText(""); setFilterType(""); setFilterMonth(""); setFilterYear(""); setFilterCategory(""); setFilterSource("all"); }}
              style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"10px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", width:isMobile?"100%":"auto" }}>
              ✕ Limpar
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
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:isMobile?"580px":"unset" }}>
              <thead>
                <tr>
                  {["date","description","category","type","amount"].map(f => {
                    const labels = { date:"Data", description:"Descrição", category:"Categoria", type:"Tipo", amount:"Valor" };
                    if (f==="category" && isMobile) return null;
                    return (
                      <th key={f} onClick={() => handleSort(f)} style={{ padding:"14px 16px", textAlign:f==="amount"?"right":"left", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", background:"transparent" }}>
                        {labels[f]}{sortIcon(f)}
                      </th>
                    );
                  })}
                  {!isPersonal && !isMobile && (
                    <th style={{ padding:"14px 16px", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:"transparent" }}>Origem</th>
                  )}
                  <th style={{ padding:"14px 16px", textAlign:"center", fontSize:"12px", fontWeight:"600", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:"transparent" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isManual = isPersonal || t.source === "manual";
                  const badge    = sourceBadgeStyle(t.source);
                  return (
                    <tr key={t.id} className="tr-hover" style={{ background:"transparent" }}>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, color:theme.textSecondary }}>{fmtDate(t.date)}</td>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, color:theme.textPrimary, maxWidth:isMobile?"120px":"none", overflow:"hidden", textOverflow:"ellipsis" }}>{t.description}</td>
                      {!isMobile && (
                        <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                          <span style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCardHover, padding:"3px 10px", borderRadius:"20px", fontSize:"12px", color:theme.textSecondary }}>{t.category||"—"}</span>
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                        <span style={{ padding:"3px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:600, background:t.type==="income"?`${theme.income}22`:`${theme.expense}22`, color:t.type==="income"?theme.income:theme.expense, border:`1px solid ${t.type==="income"?theme.income:theme.expense}44`, whiteSpace:"nowrap" }}>
                          {t.type==="income"?"↑":"↓"}{!isMobile&&(t.type==="income"?" Entrada":" Saída")}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, textAlign:"right", fontWeight:600 }}>
                        <span style={{ color:t.type==="income"?theme.income:theme.expense, whiteSpace:"nowrap" }}>{t.type==="expense"?"-":"+"}{fmt(t.amount)}</span>
                      </td>
                      {!isPersonal && !isMobile && (
                        <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                          <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:"11px", fontWeight:600, background:badge.bg, color:badge.color, border:`1px solid ${badge.color}33` }}>{sourceLabel(t.source)}</span>
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                          <button onClick={() => openEdit(t)} title="Editar"
                            style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:"6px", padding:"6px 10px", cursor:isManual?"pointer":"not-allowed", fontSize:"14px", opacity:isManual?1:0.4 }}>✏️</button>
                          <button onClick={() => duplicateTransaction(t)} title="Duplicar"
                            style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.accent}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.accent}44`}`, borderRadius:"6px", padding:"6px 10px", cursor:"pointer", fontSize:"14px" }}>📋</button>
                          <button onClick={() => isManual && deleteTransaction(t.id)} title={isManual?"Excluir":"Não excluível"}
                            style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"6px", padding:"6px 10px", cursor:isManual?"pointer":"not-allowed", fontSize:"14px", opacity:isManual?1:0.4 }}>🗑️</button>
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
          <div style={{ ...glassModal, borderRadius:"16px", maxWidth:"520px", width:isMobile?"92%":"100%", padding:isMobile?"24px 20px":"32px", maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 50px rgba(0,0,0,0.5)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <h3 style={{ fontSize:"18px", fontWeight:"700", margin:0, color:theme.textPrimary }}>✏️ Editar Transação</h3>
              <button onClick={closeEdit} style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:"32px", height:"32px", borderRadius:"8px", cursor:"pointer", fontSize:"14px" }}>✕</button>
            </div>
            {isPersonal && (
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                {[{ v:"expense", label:"💸 Saída", color:theme.expense }, { v:"income", label:"💚 Entrada", color:theme.income }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setEditForm({...editForm, type:opt.v, category:""})}
                    style={{ flex:1, padding:"10px", borderRadius:10, border:`2px solid ${editForm.type===opt.v?opt.color:theme.borderCard}`, background:editForm.type===opt.v?`${opt.color}22`:"transparent", color:editForm.type===opt.v?opt.color:theme.textMuted, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Descrição</label><input type="text" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} style={modalInput} /></div>
              <div style={{ display:"flex", gap:16, flexDirection:isMobile?"column":"row" }}>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Valor (R$)</label><input type="number" step="0.01" value={editForm.amount} onChange={e=>setEditForm({...editForm,amount:e.target.value})} style={modalInput} /></div>
                {!isPersonal && (
                  <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Tipo</label><select value={editForm.type} onChange={e=>setEditForm({...editForm,type:e.target.value,category:""})} style={modalInput}><option value="income">Entrada</option><option value="expense">Saída</option></select></div>
                )}
              </div>
              <div style={{ display:"flex", gap:16, flexDirection:isMobile?"column":"row" }}>
                <div style={fieldGroup}>
                  <label style={{ ...modalLabel, color:theme.textSecondary }}>Categoria</label>
                  <select value={editForm.category} onChange={e=>setEditForm({...editForm,category:e.target.value})} style={modalInput}>
                    <option value="">— Selecione —</option>
                    {editFormCats.map(c => <option key={c} value={c.replace(/^.* /,"")}>{c}</option>)}
                  </select>
                </div>
                <div style={fieldGroup}><label style={{ ...modalLabel, color:theme.textSecondary }}>Data</label><input type="date" value={editForm.date} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={modalInput} /></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:28, flexDirection:isMobile?"column":"row" }}>
              <button onClick={closeEdit} style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, color:theme.textPrimary, padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", width:isMobile?"100%":"auto" }}>Cancelar</button>
              <button onClick={saveEdit} style={{ ...saveBtn, width:isMobile?"100%":"auto" }}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}

const cardIcon   = { fontSize:20, marginBottom:6 };
const cardLabel  = { fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 };
const cardSub    = { fontSize:12, marginTop:2, display:"block" };
const tdStyle    = { padding:"12px 16px", fontSize:"13px", whiteSpace:"nowrap" };
const emptyState = { padding:"60px", textAlign:"center", fontSize:"15px" };
const fieldGroup = { display:"flex", flexDirection:"column", gap:"8px", flex:1 };
const modalLabel = { fontSize:"13px", fontWeight:"500" };
