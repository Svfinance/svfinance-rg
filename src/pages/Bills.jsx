import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "http://localhost:5000/api";
const token = () => localStorage.getItem("token");

function fmt(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function isOverdue(due_date, status) {
  if (status === "paid") return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(due_date + "T00:00:00");
  return due < today;
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

export default function Bills() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass";
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    description:"", amount:"", type:"payable",
    status:"pending", due_date:"", paid_date:"",
    category:"", notes:"",
  });
  const navigate = useNavigate();

  async function fetchBills() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/bills`, { headers:{ Authorization:`Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar contas.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchBills(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditingBill(null);
    setForm({ description:"", amount:"", type:"payable", status:"pending", due_date:"", paid_date:"", category:"", notes:"" });
    setModalOpen(true);
  }

  function openEdit(bill) {
    setEditingBill(bill);
    setForm({
      description: bill.description||"", amount: bill.amount||"",
      type: bill.type||"payable", status: bill.status||"pending",
      due_date: bill.due_date||"", paid_date: bill.paid_date||"",
      category: bill.category||"", notes: bill.notes||"",
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingBill(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount) };
    const url    = editingBill ? `${API}/bills/${editingBill.id}` : `${API}/bills`;
    const method = editingBill ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) { showToast(editingBill?"Conta atualizada!":"Conta criada!"); closeModal(); fetchBills(); }
      else { const err = await res.json(); showToast(err.msg||"Erro ao salvar.","error"); }
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handlePay(bill) {
    try {
      const res = await fetch(`${API}/bills/${bill.id}/pay`, {
        method:"PATCH", headers:{ Authorization:`Bearer ${token()}` },
      });
      if (res.ok) { showToast("Conta marcada como paga! ✅"); fetchBills(); }
      else showToast("Erro ao marcar como paga.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/bills/${id}`, {
        method:"DELETE", headers:{ Authorization:`Bearer ${token()}` },
      });
      if (res.ok) { showToast("Conta removida."); setDeleteConfirm(null); fetchBills(); }
      else showToast("Erro ao remover.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  const filtered = bills.filter(b => {
    const typeOk = filter==="all" || b.type===filter;
    const realStatus = b.status!=="paid" && isOverdue(b.due_date, b.status) ? "overdue" : b.status;
    const statusOk = statusFilter==="all" || realStatus===statusFilter;
    return typeOk && statusOk;
  });

  const totalPayable    = bills.filter(b=>b.type==="payable"&&b.status!=="paid").reduce((s,b)=>s+b.amount,0);
  const totalPaid       = bills.filter(b=>b.type==="payable"&&b.status==="paid").reduce((s,b)=>s+b.amount,0);
  const totalReceivable = bills.filter(b=>b.type==="receivable"&&b.status!=="paid").reduce((s,b)=>s+b.amount,0);
  const totalReceived   = bills.filter(b=>b.type==="receivable"&&b.status==="paid").reduce((s,b)=>s+b.amount,0);
  const totalOverdue    = bills.filter(b=>isOverdue(b.due_date,b.status)).reduce((s,b)=>s+b.amount,0);

  const colorScheme = isGlass ? "light" : "dark";
  const inputFocus = e => e.target.style.borderColor = theme.borderActive;
  const inputBlur  = e => e.target.style.borderColor = theme.borderInput;

  const modalBg = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border:`1px solid ${theme.borderCard}` };

  return (
    <PageLayout>

      <style>{`
        .card3d-b {
          border-radius: 14px; padding: 16px 20px;
          display: flex; align-items: center; gap: 14px;
          backdrop-filter: ${isGlass ? "blur(18px) saturate(180%)" : "blur(10px)"};
          -webkit-backdrop-filter: ${isGlass ? "blur(18px) saturate(180%)" : "blur(10px)"};
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          transform: perspective(700px) rotateX(5deg) rotateY(-3deg);
          box-shadow: ${isGlass
            ? "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)"
            : "0 20px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"};
          position: relative; overflow: hidden; cursor: default;
        }
        .card3d-b::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,${isGlass ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)"},transparent);
        }
        .card3d-b:hover {
          transform: perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-8px);
          box-shadow: ${isGlass ? "0 20px 48px rgba(0,0,0,0.1)" : "0 36px 72px rgba(0,0,0,0.6)"};
        }
        .table-bills {
          background: ${theme.bgCard};
          border: 1px solid ${theme.borderCard};
          border-radius: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); box-shadow: 0 4px 24px rgba(0,0,0,0.07);" : ""}
        }
        @media (max-width: 768px) {
          .card3d-b { transform: none !important; }
          .card3d-b:hover { transform: translateY(-6px) !important; }
        }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:70, height: isMobile?44:70, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Contas</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.9rem" }}>Gerencie suas contas a pagar e a receber</p>
            </div>
          </div>
          <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44` }} onClick={openCreate}>
            + Nova Conta
          </button>
        </div>

        {/* CARDS A PAGAR */}
        <p style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 12px 0" }}>📤 Contas a Pagar</p>
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:16, marginBottom:24 }}>
          {[
            { icon:"📤", label:"A Pagar",  value:fmt(totalPayable),  color:"#ef4444" },
            { icon:"✅", label:"Pagas",    value:fmt(totalPaid),    color:theme.income  },
            { icon:"⚠️", label:"Vencidas", value:fmt(totalOverdue), color:theme.warning },
          ].map((c,i) => (
            <div key={i} className="card3d-b" style={{
              background: isGlass ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.03)",
              border: isGlass ? "1px solid rgba(255,255,255,0.5)" : `1px solid ${c.color}33`,
            }}>
              <div style={{ fontSize:"1.6rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.78rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize: isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CARDS A RECEBER */}
        <p style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 12px 0" }}>📥 Contas a Receber</p>
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(2,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"📥", label:"A Receber", value:fmt(totalReceivable), color:theme.primary },
            { icon:"💰", label:"Recebidas", value:fmt(totalReceived),   color:theme.income  },
          ].map((c,i) => (
            <div key={i} className="card3d-b" style={{
              background: isGlass ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.03)",
              border: isGlass ? "1px solid rgba(255,255,255,0.5)" : `1px solid ${c.color}33`,
            }}>
              <div style={{ fontSize:"1.6rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.78rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize: isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600 }}>Tipo:</span>
            {["all","payable","receivable"].map(f => (
              <button key={f} style={{
                background: filter===f ? `${theme.primary}33` : theme.bgCard,
                color: filter===f ? theme.textActive : theme.textMuted,
                border: filter===f ? `1px solid ${theme.primary}66` : `1px solid ${theme.borderCard}`,
                borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer",
                ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
              }} onClick={() => setFilter(f)}>
                {f==="all"?"Todos":f==="payable"?"A Pagar":"A Receber"}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600 }}>Status:</span>
            {["all","pending","paid","overdue"].map(s => (
              <button key={s} style={{
                background: statusFilter===s ? `${theme.primary}33` : theme.bgCard,
                color: statusFilter===s ? theme.textActive : theme.textMuted,
                border: statusFilter===s ? `1px solid ${theme.primary}66` : `1px solid ${theme.borderCard}`,
                borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer",
                ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
              }} onClick={() => setStatusFilter(s)}>
                {s==="all"?"Todos":s==="pending"?"Pendente":s==="paid"?"Pago":"Vencido"}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="table-bills">
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>📭</span><p>Nenhuma conta encontrada</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth: isMobile?"600px":"unset" }}>
              <thead>
                <tr>
                  {["Descrição","Tipo","Valor","Vencimento","Status","Categoria","Ações"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"14px 18px", color:theme.textMuted, fontWeight:600, fontSize:"0.78rem", textTransform:"uppercase", letterSpacing:"0.05em", background:theme.bgCard, borderBottom:`1px solid ${theme.borderCard}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(bill => {
                  const overdue = isOverdue(bill.due_date, bill.status);
                  const realStatus = bill.status!=="paid" && overdue ? "overdue" : bill.status;
                  return (
                    <tr key={bill.id}
                      style={{ borderBottom:`1px solid ${theme.border}`, transition:"background 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background= isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0d`}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <span style={{ fontWeight:500, color:theme.textPrimary }}>{bill.description}</span>
                          {bill.notes && <span style={{ fontSize:"0.75rem", color:theme.textMuted }}>{bill.notes}</span>}
                        </div>
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, background: bill.type==="payable"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color: bill.type==="payable"?"#ef4444":theme.income }}>
                          {bill.type==="payable"?"📤 A Pagar":"📥 A Receber"}
                        </span>
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", fontWeight:600, color:theme.textPrimary }}>{fmt(bill.amount)}</td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", color: overdue?"#f59e0b":theme.textSecondary }}>
                        {fmtDate(bill.due_date)}{overdue && <span style={{ marginLeft:4, fontSize:"0.7rem" }}>⚠️</span>}
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}><StatusBadge status={realStatus} /></td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", color:theme.textMuted }}>{bill.category||"—"}</td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          {bill.status!=="paid" && (
                            <button style={{ background:`${theme.income}22`, border:`1px solid ${theme.income}44`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => handlePay(bill)}>✅</button>
                          )}
                          <button style={{ background: isGlass?"rgba(255,255,255,0.25)":theme.bgCardHover, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(bill)}>✏️</button>
                          <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => setDeleteConfirm(bill)}>🗑️</button>
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

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:620, maxHeight:"90vh", overflowY:"auto", boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editingBill?"✏️ Editar Conta":"➕ Nova Conta"}</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Descrição *</label>
                  <input style={getInput(theme, isGlass)} type="text" required placeholder="Ex: Conta de luz" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Valor *</label>
                  <input style={getInput(theme, isGlass)} type="number" step="0.01" min="0" required placeholder="0,00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Tipo *</label>
                  <select style={getSelect(theme, isGlass)} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    <option value="payable">A Pagar</option>
                    <option value="receivable">A Receber</option>
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Status</label>
                  <select style={getSelect(theme, isGlass)} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Vencimento *</label>
                  <input style={getInput(theme, isGlass)} type="date" required value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Data Pagamento</label>
                  <input style={getInput(theme, isGlass)} type="date" value={form.paid_date} onChange={e=>setForm({...form,paid_date:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Categoria</label>
                  <input style={getInput(theme, isGlass)} type="text" placeholder="Ex: Moradia, Alimentação..." value={form.category} onChange={e=>setForm({...form,category:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Observações</label>
                  <textarea style={{ ...getInput(theme, isGlass), resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection: isMobile?"column":"row" }}>
                <button type="button" style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width: isMobile?"100%":"auto" }}>
                  {editingBill?"Salvar Alterações":"Criar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border: isGlass?"1px solid rgba(239,68,68,0.3)":`1px solid rgba(239,68,68,0.3)`, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:400, boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Conta</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Tem certeza que deseja excluir <strong style={{ color:theme.textPrimary }}>"{deleteConfirm.description}"</strong>?
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection: isMobile?"column":"row" }}>
              <button style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={()=>setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={()=>handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom: isMobile?16:28, right: isMobile?16:28, left: isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background: toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign: isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label:"Pendente", color:"#f59e0b", bg:"rgba(245,158,11,0.12)" },
    paid:    { label:"Pago",     color:"#22c55e", bg:"rgba(34,197,94,0.12)"  },
    overdue: { label:"Vencido",  color:"#ef4444", bg:"rgba(239,68,68,0.12)" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, color:s.color, background:s.bg, border:`1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

function getInput(theme, isGlass) {
  return {
    background: theme.bgInput,
    border: `1px solid ${theme.borderInput}`,
    borderRadius:10, padding:"10px 14px",
    color: theme.textPrimary, fontSize:"0.9rem",
    outline:"none", width:"100%", boxSizing:"border-box",
    transition:"border-color 0.2s",
    colorScheme: isGlass ? "light" : "dark",
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  };
}

function getSelect(theme, isGlass) {
  return { ...getInput(theme, isGlass), cursor:"pointer", appearance:"auto" };
}