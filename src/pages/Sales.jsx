import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
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

const STATUS_MAP = {
  open:        { label: "Aberta",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  in_progress: { label: "Em andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  done:        { label: "Concluída",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  cancelled:   { label: "Cancelada",    color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const EMPTY_FORM = {
  client_id: "", status: "open", notes: "", payment_terms: "", discount: 0,
};

export default function Sales() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();

  const role     = localStorage.getItem("role")    || "viewer";
  const myUserId = parseInt(localStorage.getItem("user_id") || "0");
  const isSeller = role === "seller";

  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [allOrders, setAllOrders]             = useState([]);
  const [clients, setClients]                 = useState([]);
  const [products, setProducts]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [view, setView]                       = useState("list");
  const [editing, setEditing]                 = useState(null);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [items, setItems]                     = useState([]);
  const [deleteConfirm, setDeleteConfirm]     = useState(null);
  const [completeConfirm, setCompleteConfirm] = useState(null);
  const [toast, setToast]                     = useState(null);
  const [filterStatus, setFilterStatus]       = useState("all");
  const [filterUser, setFilterUser]           = useState("all");
  const [search, setSearch]                   = useState("");
  const [completing, setCompleting]           = useState(false);
  const [teamUsers, setTeamUsers]             = useState([]);

  async function fetchAll() {
    setLoading(true);
    try {
      const requests = [
        fetch(`${API}/orders`,   { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/clients`,  { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token()}` } }),
      ];
      // admin/financial busca lista de usuários para filtro
      if (role === "admin" || role === "financial") {
        requests.push(fetch(`${API}/company/users`, { headers: { Authorization: `Bearer ${token()}` } }));
      }

      const responses = await Promise.all(requests);
      if (responses[0].status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const [dataO, dataC, dataP] = await Promise.all([responses[0].json(), responses[1].json(), responses[2].json()]);

      setAllOrders(Array.isArray(dataO) ? dataO : []);
      setClients(Array.isArray(dataC) ? dataC : []);
      setProducts(Array.isArray(dataP) ? dataP : []);

      if (responses[3]) {
        const dataU = await responses[3].json();
        setTeamUsers(Array.isArray(dataU) ? dataU : []);
      }
    } catch { showToast("Erro ao carregar dados.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  // ✅ vendedor vê só as próprias vendas
  const orders = isSeller
    ? allOrders.filter(o => o.user_id === myUserId)
    : allOrders;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setItems([]); setView("form"); }
  function openEdit(o) {
    setEditing(o);
    setForm({ client_id: o.client_id, status: o.status, notes: o.notes || "", payment_terms: o.payment_terms || "", discount: o.discount || 0 });
    setItems(o.items || []);
    setView("form");
  }

  function addItem() { setItems(prev => [...prev, { product_id: "", name: "", unit: "un", qty: 1, price: 0, total: 0 }]); }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function updateItem(idx, fld, value) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [fld]: value };
      if (fld === "qty" || fld === "price") next[idx].total = parseFloat(next[idx].qty || 0) * parseFloat(next[idx].price || 0);
      return next;
    });
  }
  function selectProduct(idx, productId) {
    const p = products.find(p => String(p.id) === String(productId));
    if (!p) return;
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], product_id: p.id, name: p.name, unit: p.unit || "un", price: p.price, total: parseFloat(next[idx].qty || 1) * p.price };
      return next;
    });
  }

  const subtotal    = items.reduce((s, i) => s + parseFloat(i.qty || 0) * parseFloat(i.price || 0), 0);
  const discountAmt = subtotal * (parseFloat(form.discount || 0) / 100);
  const total       = subtotal - discountAmt;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) { showToast("Selecione um cliente.", "error"); return; }
    const payload = { ...form, client_id: parseInt(form.client_id), discount: parseFloat(form.discount || 0), items };
    const url    = editing ? `${API}/orders/${editing.id}` : `${API}/orders`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(payload) });
      if (res.ok) { showToast(editing ? "Venda atualizada!" : "Venda criada!"); setView("list"); fetchAll(); }
      else { const err = await res.json(); showToast(err.msg || "Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function changeStatus(o, status) {
    try {
      await fetch(`${API}/orders/${o.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      fetchAll();
    } catch { showToast("Erro ao alterar status.", "error"); }
  }

  async function handleComplete(order) {
    setCompleting(true);
    try {
      const res  = await fetch(`${API}/orders/${order.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.msg} — ${fmt(data.total)} lançado em Transações!`);
        setCompleteConfirm(null);
        fetchAll();
      } else {
        showToast(data.msg || "Erro ao concluir.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
    finally { setCompleting(false); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/orders/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { showToast("Venda removida."); setDeleteConfirm(null); fetchAll(); }
      else { const err = await res.json(); showToast(err.msg || "Erro ao remover.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  // ✅ filtros combinados
  const filtered = orders.filter(o => {
    const statusOk = filterStatus === "all" || o.status === filterStatus;
    const userOk   = filterUser === "all" || String(o.user_id) === String(filterUser);
    const searchOk = o.number.toLowerCase().includes(search.toLowerCase()) ||
                     o.client_name.toLowerCase().includes(search.toLowerCase());
    return statusOk && userOk && searchOk;
  });

  const totalVendas     = orders.filter(o => o.status === "done").reduce((s, o) => s + o.total, 0);
  const totalAbertas    = orders.filter(o => o.status === "open").length;
  const totalAndamento  = orders.filter(o => o.status === "in_progress").length;
  const totalConcluidas = orders.filter(o => o.status === "done").length;

  // ── estilos ──
  const inputStyle = {
    background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10, padding: "10px 14px", color: theme.textPrimary,
    fontSize: "0.9rem", outline: "none", width: "100%",
    boxSizing: "border-box", transition: "border-color 0.2s", colorScheme,
    ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
  };
  const selectStyle  = { ...inputStyle, cursor: "pointer" };
  const modalBg      = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };
  const btnPrimary   = { background: theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}33` };
  const btnSecondary = { background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" };
  const formCard     = { background: isGlass?"rgba(255,255,255,0.2)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:14, padding:24, marginBottom:24, ...(isGlass && { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)" }) };
  const sectionLabel = { fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 14px 2px" };
  const fieldStyle   = { display:"flex", flexDirection:"column", gap:6 };
  const labelStyle   = { color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 };
  const th           = { textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background: isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" };
  const td           = { padding:"12px 16px", verticalAlign:"middle" };

  // ══════════════════════
  // VIEW: FORMULÁRIO
  // ══════════════════════
  if (view === "form") {
    return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>
          <div style={{ marginBottom:24 }}>
            <button style={{ ...btnSecondary, marginBottom:12, fontSize:"0.82rem" }} onClick={() => setView("list")}>← Voltar</button>
            <h1 style={{ fontSize: isMobile?"1.3rem":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>
              {editing ? `Editar Venda — ${editing.number}` : "Nova Venda"}
            </h1>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formCard}>
              <p style={sectionLabel}>📋 Dados da Venda</p>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap:16 }}>
                <div style={{ ...fieldStyle, gridColumn: isMobile?"1":"1 / -1" }}>
                  <label style={labelStyle}>Cliente *</label>
                  <select style={selectStyle} required value={form.client_id} onChange={e => setForm({...form, client_id:e.target.value})}>
                    <option value="">— Selecione o cliente —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Status</label>
                  <select style={selectStyle} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                    {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Desconto Global (%)</label>
                  <input style={inputStyle} type="number" min="0" max="100" step="0.1" placeholder="0" value={form.discount} onChange={e => setForm({...form, discount:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Condições de Pagamento</label>
                  <input style={inputStyle} placeholder="Ex: À vista, 30/60 dias..." value={form.payment_terms} onChange={e => setForm({...form, payment_terms:e.target.value})} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: isMobile?"1":"1 / -1" }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />
                </div>
              </div>
            </div>

            <div style={formCard}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ ...sectionLabel, marginBottom:0 }}>📦 Produtos & Serviços</p>
                <button type="button" style={{ ...btnSecondary, fontSize:"0.82rem", padding:"7px 14px" }} onClick={addItem}>+ Adicionar Item</button>
              </div>
              {items.length === 0 ? (
                <div style={{ textAlign:"center", color:theme.textMuted, padding:"32px 0" }}>Nenhum item. Clique em "+ Adicionar Item".</div>
              ) : (
                <>
                  {!isMobile && (
                    <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1.5fr 1.5fr 36px", gap:10, padding:"8px 0", borderBottom:`1px solid ${theme.borderCard}`, color:theme.textMuted, fontSize:"0.75rem", fontWeight:600, textTransform:"uppercase", marginBottom:12 }}>
                      <span>Produto / Serviço</span><span>Unid.</span><span>Qtd.</span><span>Preço Unit.</span><span>Total</span><span></span>
                    </div>
                  )}
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"3fr 1fr 1fr 1.5fr 1.5fr 36px", gap:10, marginBottom:16, padding: isMobile?"16px":"0", background: isMobile?(isGlass?"rgba(255,255,255,0.15)":theme.bgCard):"transparent", borderRadius: isMobile?10:0, border: isMobile?`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`:"none" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {isMobile && <label style={labelStyle}>Produto / Serviço</label>}
                        <select style={{ ...selectStyle, marginBottom:4 }} value={item.product_id||""} onChange={e => selectProduct(idx, e.target.value)}>
                          <option value="">— Selecione —</option>
                          {products.filter(p=>p.active).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.type==="product"?"📦":"⚙️"} {p.name} ({fmt(p.price)}){p.type==="product"?` · Estq: ${p.stock_qty}`:""}
                            </option>
                          ))}
                        </select>
                        <input style={{ ...inputStyle, fontSize:"0.8rem" }} placeholder="Ou descreva manualmente" value={item.name} onChange={e => updateItem(idx,"name",e.target.value)} />
                      </div>
                      <div>{isMobile&&<label style={labelStyle}>Unid.</label>}<input style={inputStyle} value={item.unit} onChange={e => updateItem(idx,"unit",e.target.value)} /></div>
                      <div>{isMobile&&<label style={labelStyle}>Qtd.</label>}<input style={inputStyle} type="number" min="1" step="0.01" value={item.qty} onChange={e => updateItem(idx,"qty",e.target.value)} /></div>
                      <div>{isMobile&&<label style={labelStyle}>Preço</label>}<input style={inputStyle} type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(idx,"price",e.target.value)} /></div>
                      <div style={{ display:"flex", alignItems:"center", color:theme.income, fontWeight:700, fontSize:"0.95rem" }}>
                        {isMobile&&<label style={{ ...labelStyle, marginRight:8 }}>Total:</label>}
                        {fmt(parseFloat(item.qty||0)*parseFloat(item.price||0))}
                      </div>
                      <button type="button" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, cursor:"pointer", color:"#ef4444", width: isMobile?"100%":36, height: isMobile?"auto":36, padding: isMobile?"8px":0 }} onClick={() => removeItem(idx)}>
                        {isMobile?"Remover":"✕"}
                      </button>
                    </div>
                  ))}
                  <div style={{ borderTop:`1px solid ${theme.borderCard}`, marginTop:8, paddingTop:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.95rem" }}>
                      <span style={{ color:theme.textSecondary }}>Subtotal</span>
                      <span style={{ color:theme.textPrimary }}>{fmt(subtotal)}</span>
                    </div>
                    {parseFloat(form.discount)>0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, color:"#ef4444", fontSize:"0.95rem" }}>
                        <span>Desconto ({form.discount}%)</span><span>- {fmt(discountAmt)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"1.2rem", fontWeight:700, color:theme.primary, borderTop:`1px solid ${theme.borderCard}`, paddingTop:12, marginTop:4 }}>
                      <span>TOTAL</span><span>{fmt(total)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginBottom:48, flexDirection: isMobile?"column":"row" }}>
              <button type="button" style={{ ...btnSecondary, width: isMobile?"100%":"auto" }} onClick={() => setView("list")}>Cancelar</button>
              <button type="submit" style={{ ...btnPrimary, width: isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar Venda"}</button>
            </div>
          </form>
        </div>
        {toast && <div style={{ position:"fixed", bottom:28, right:28, color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, background: toast.type==="error"?"#ef4444":theme.primaryGrad }}>{toast.msg}</div>}
      </PageLayout>
    );
  }

  // ══════════════════════
  // VIEW: LISTA
  // ══════════════════════
  return (
    <PageLayout>
      <style>{`
        .card3d-sv { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"}; position:relative; overflow:hidden; cursor:default; }
        .card3d-sv::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-sv:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.5)"}; }
        .table3d-sv { background:${isGlass?"rgba(255,255,255,0.18)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(4px);"} }
        .sv-row { transition:background 0.15s; }
        .sv-row:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0d`} !important; }
        .btn-complete { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.82rem; font-weight:700; white-space:nowrap; box-shadow:0 4px 12px rgba(34,197,94,0.4); transition:transform 0.15s, box-shadow 0.15s; }
        .btn-complete:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(34,197,94,0.5); }
        @media (max-width:768px) { .card3d-sv { transform:none !important; } .card3d-sv:hover { transform:translateY(-6px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>
                Vendas {isSeller && <span style={{ fontSize:"0.75rem", color:theme.textMuted, fontWeight:400 }}>(suas vendas)</span>}
              </h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie suas vendas e ordens de serviço</p>
            </div>
          </div>
          <button style={{ ...btnPrimary, whiteSpace:"nowrap" }} onClick={openCreate}>+ Nova Venda</button>
        </div>

        {/* CARDS */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"💰", label:"Faturado",     value: fmt(totalVendas),   color:"#22c55e", border: isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.3)"  },
            { icon:"🔵", label:"Abertas",       value: totalAbertas,       color:"#3b82f6", border: isGlass?"rgba(255,255,255,0.5)":"rgba(59,130,246,0.3)"  },
            { icon:"🟡", label:"Em andamento",  value: totalAndamento,     color:"#f59e0b", border: isGlass?"rgba(255,255,255,0.5)":"rgba(245,158,11,0.3)"  },
            { icon:"✅", label:"Concluídas",    value: totalConcluidas,    color:"#22c55e", border: isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.3)"   },
          ].map((c,i) => (
            <div key={i} className="card3d-sv" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize: isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          <input style={{ ...inputStyle, width: isMobile?"100%":"240px" }}
            type="text" placeholder="🔍 Buscar número ou cliente..."
            value={search} onChange={e => setSearch(e.target.value)} />

          {/* ✅ filtro por vendedor — só para admin/financial */}
          {!isSeller && teamUsers.length > 0 && (
            <select style={{ ...selectStyle, width: isMobile?"100%":"200px" }}
              value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="all">👥 Todos os vendedores</option>
              {teamUsers.filter(u => u.role === "seller" || u.role === "admin").map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          )}

          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["all",...Object.keys(STATUS_MAP)].map(s => (
              <button key={s} style={{
                background: filterStatus===s ? `${theme.primary}33` : (isGlass?"rgba(255,255,255,0.2)":theme.bgCard),
                color: filterStatus===s ? theme.textActive : theme.textMuted,
                border: filterStatus===s ? `1px solid ${theme.primary}66` : `1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,
                borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer",
                ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
              }} onClick={() => setFilterStatus(s)}>
                {s==="all"?"Todas":STATUS_MAP[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="table3d-sv">
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>🛒</span>
              <p>{search?"Nenhuma venda encontrada":"Nenhuma venda cadastrada ainda"}</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth: isMobile?"600px":"unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Número","Cliente","Status","Total","Ações"]
                    : ["Número","Cliente","Vendedor","Origem","Total","Criado em","Concluído em","Status","Ações"]
                  ).map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const st          = STATUS_MAP[o.status] || STATUS_MAP.open;
                  const isDone      = o.status === "done";
                  const isCancelled = o.status === "cancelled";
                  // ✅ vendedor só opera as próprias vendas
                  const canOperate  = !isSeller || o.user_id === myUserId;
                  const sellerName  = teamUsers.find(u => u.id === o.user_id)?.name || "—";

                  return (
                    <tr key={o.id} className="sv-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}` }}>
                      <td style={{ ...td, fontWeight:700, color:theme.primary }}>{o.number}</td>
                      <td style={td}>
                        <div style={{ fontWeight:600, color:theme.textPrimary }}>{o.client_name}</div>
                      </td>
                      {!isMobile && (
                        <td style={td}>
                          <span style={{ color:theme.textMuted, fontSize:"0.82rem" }}>{sellerName}</span>
                        </td>
                      )}
                      {!isMobile && (
                        <td style={td}>
                          <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:600, background: o.origin==="quote"?`${theme.accent}22`:`${theme.primary}22`, color: o.origin==="quote"?theme.accent:theme.primary }}>
                            {o.origin==="quote"?"🧾 Orçamento":"✏️ Direta"}
                          </span>
                        </td>
                      )}
                      <td style={{ ...td, fontWeight:700, color: isDone?theme.income:theme.textPrimary }}>{fmt(o.total)}</td>
                      {!isMobile && <td style={{ ...td, color:theme.textMuted }}>{fmtDate(o.created_at)}</td>}
                      {!isMobile && (
                        <td style={td}>
                          {isDone ? <span style={{ color:"#22c55e", fontWeight:600, fontSize:"0.85rem" }}>✅ {fmtDate(o.finished_at)}</span> : "—"}
                        </td>
                      )}
                      <td style={td}>
                        {isDone ? (
                          <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:"0.75rem", fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.color}44` }}>✅ Concluída</span>
                        ) : (
                          <select style={{ border:"none", borderRadius:20, padding:"4px 10px", fontSize:"0.75rem", fontWeight:600, cursor: canOperate?"pointer":"not-allowed", outline:"none", colorScheme, color:st.color, background:st.bg }} value={o.status} onChange={e => canOperate && changeStatus(o, e.target.value)} disabled={isDone || !canOperate}>
                            {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {!isDone && !isCancelled && canOperate && (
                            <button className="btn-complete" onClick={() => setCompleteConfirm(o)}>💰 Concluir</button>
                          )}
                          {!isDone && canOperate && (
                            <button style={{ background: isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(o)}>✏️</button>
                          )}
                          {canOperate && (
                            <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => setDeleteConfirm(o)}>🗑️</button>
                          )}
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

      {/* MODAL CONCLUIR */}
      {completeConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => !completing && setCompleteConfirm(null)}>
          <div style={{ ...modalBg, border: isGlass?"1px solid rgba(34,197,94,0.4)":`1px solid rgba(34,197,94,0.3)`, borderRadius:18, padding: isMobile?"28px 20px":36, width: isMobile?"92%":"100%", maxWidth:460, boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>💰</div>
              <h2 style={{ margin:"0 0 8px", fontSize:"1.3rem", fontWeight:700, color:theme.textPrimary }}>Concluir Venda</h2>
              <p style={{ color:theme.textMuted, margin:0, fontSize:"0.9rem" }}>Confirmar conclusão de <strong style={{ color:theme.textPrimary }}>{completeConfirm.number}</strong>?</p>
            </div>
            <div style={{ background: isGlass?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.88rem" }}><span style={{ color:theme.textMuted }}>Cliente</span><span style={{ color:theme.textPrimary, fontWeight:600 }}>{completeConfirm.client_name}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.88rem" }}><span style={{ color:theme.textMuted }}>Itens</span><span style={{ color:theme.textPrimary }}>{(completeConfirm.items||[]).length} item(ns)</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", borderTop:`1px solid rgba(34,197,94,0.2)`, paddingTop:10, marginTop:4 }}><span style={{ color:"#22c55e", fontWeight:700 }}>Total a receber</span><span style={{ color:"#22c55e", fontWeight:700, fontSize:"1.1rem" }}>{fmt(completeConfirm.total)}</span></div>
            </div>
            <p style={{ color:theme.textMuted, fontSize:"0.82rem", textAlign:"center", marginBottom:20 }}>
              ✅ O valor será lançado automaticamente em <strong>Transações</strong> como entrada.
            </p>
            <div style={{ display:"flex", gap:12, flexDirection: isMobile?"column":"row" }}>
              <button style={{ ...btnSecondary, flex:1 }} onClick={() => setCompleteConfirm(null)} disabled={completing}>Cancelar</button>
              <button style={{ flex:2, background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", border:"none", borderRadius:10, padding:"12px 20px", fontWeight:700, cursor: completing?"not-allowed":"pointer", fontSize:"1rem", boxShadow:"0 4px 15px rgba(34,197,94,0.4)", opacity: completing?0.7:1 }} onClick={() => handleComplete(completeConfirm)} disabled={completing}>
                {completing ? "Processando..." : "💰 Confirmar Venda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border: isGlass?"1px solid rgba(239,68,68,0.3)":`1px solid rgba(239,68,68,0.3)`, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:400, boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Venda</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Excluir <strong style={{ color:theme.textPrimary }}>{deleteConfirm.number}</strong> de <strong style={{ color:theme.textPrimary }}>{deleteConfirm.client_name}</strong>?
              {deleteConfirm.transaction_id && <><br/><span style={{ color:"#f59e0b", fontSize:"0.82rem" }}>⚠️ A transação vinculada também será removida.</span></>}
            </p>
            <div style={{ display:"flex", gap:12, flexDirection: isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ ...btnSecondary, width: isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom: isMobile?16:28, right: isMobile?16:28, left: isMobile?16:"auto", color:"#fff", padding:"14px 24px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background: toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign: isMobile?"center":"left", maxWidth: isMobile?"unset":"400px" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}