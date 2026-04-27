import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import ProductReportModal from "../components/ProductReportModal";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
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

const EMPTY_FORM     = { name:"", sku:"", description:"", type:"service", unit:"un", cost:"", price:"", category:"", active:true, stock_min:0, stock_qty_initial:0 };
const EMPTY_MOVEMENT = { type:"in", qty:"", cost:"", reason:"", date:"" };
const EMPTY_SERVICE  = { client_id:"", duration_min:"", amount:"", notes:"", date:"" };

export default function Products() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();

  const role       = localStorage.getItem("role") || "viewer";
  const isSeller   = role === "seller";
  const canEdit    = role === "admin" || role === "financial" || role === "stock";

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [products, setProducts]             = useState([]);
  const [clients, setClients]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [filterType, setFilterType]         = useState("all");
  const [search, setSearch]                 = useState("");
  const [modalOpen, setModalOpen]           = useState(false);
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);
  const [detailProduct, setDetailProduct]   = useState(null);
  const [activeTab, setActiveTab]           = useState("info");
  const [movements, setMovements]           = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [loadingDetail, setLoadingDetail]   = useState(false);
  const [movModal, setMovModal]             = useState(false);
  const [movForm, setMovForm]               = useState(EMPTY_MOVEMENT);
  const [svcModal, setSvcModal]             = useState(false);
  const [svcForm, setSvcForm]               = useState(EMPTY_SERVICE);
  const [toast, setToast]                   = useState(null);
  const [reportModal, setReportModal]       = useState(false); // ← NOVO

  async function fetchProducts() {
    setLoading(true);
    try {
      const [resP, resC] = await Promise.all([
        fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/clients`,  { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (resP.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const [dataP, dataC] = await Promise.all([resP.json(), resC.json()]);
      setProducts(Array.isArray(dataP) ? dataP : []);
      setClients(Array.isArray(dataC) ? dataC : []);
    } catch { showToast("Erro ao carregar.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchMovements(productId) {
    setLoadingDetail(true);
    const res  = await fetch(`${API}/stock/${productId}/movements`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    setMovements(Array.isArray(data) ? data : []);
    setLoadingDetail(false);
  }

  async function fetchServiceRecords(productId) {
    setLoadingDetail(true);
    const res  = await fetch(`${API}/services/${productId}/records`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    setServiceRecords(Array.isArray(data) ? data : []);
    setLoadingDetail(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (!detailProduct) return;
    if (activeTab === "stock")    fetchMovements(detailProduct.id);
    if (activeTab === "services") fetchServiceRecords(detailProduct.id);
  }, [activeTab, detailProduct]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openDetail(p) { setDetailProduct(p); setActiveTab("info"); }
  function closeDetail()  { setDetailProduct(null); }

  function openCreate() {
    if (!canEdit) return;
    setEditing(null); setForm(EMPTY_FORM); setModalOpen(true);
  }

  function openEdit(p) {
    if (!canEdit) return;
    setEditing(p);
    setForm({
      name:p.name, sku:p.sku||"", description:p.description||"", type:p.type,
      unit:p.unit||"un", cost:p.cost, price:p.price,
      category:p.category||"", active:p.active,
      stock_min:p.stock_min||0, stock_qty_initial:0,
    });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      cost:              parseFloat(form.cost)||0,
      price:             parseFloat(form.price),
      stock_min:         parseFloat(form.stock_min||0),
      stock_qty_initial: editing ? undefined : parseFloat(form.stock_qty_initial||0),
      sku:               form.sku.trim() || null,
    };
    const url    = editing ? `${API}/products/${editing.id}` : `${API}/products`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
      if (res.ok) { showToast(editing?"Produto atualizado!":"Produto criado!"); closeModal(); fetchProducts(); }
      else { const err = await res.json(); showToast(err.msg||"Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleToggle(p) {
    if (!canEdit) return;
    await fetch(`${API}/products/${p.id}/toggle`, { method:"PATCH", headers:{ Authorization:`Bearer ${token()}` } });
    fetchProducts();
  }

  async function handleDelete(id) {
    if (!canEdit) return;
    const res = await fetch(`${API}/products/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
    if (res.ok) { showToast("Produto removido."); setDeleteConfirm(null); fetchProducts(); if (detailProduct?.id===id) closeDetail(); }
    else showToast("Erro ao remover.", "error");
  }

  async function handleMovimentar(e) {
    e.preventDefault();
    if (!movForm.qty || parseFloat(movForm.qty)<=0) { showToast("Quantidade inválida.", "error"); return; }
    const payload = { ...movForm, qty:parseFloat(movForm.qty), cost:movForm.cost?parseFloat(movForm.cost):undefined };
    const res = await fetch(`${API}/stock/${detailProduct.id}/movements`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
    if (res.ok) {
      showToast("Movimentação registrada!");
      setMovModal(false); setMovForm(EMPTY_MOVEMENT);
      fetchProducts(); fetchMovements(detailProduct.id);
      const updated = await res.json();
      setDetailProduct(prev => ({ ...prev, stock_qty:updated.stock_qty, stock_avg_cost:updated.stock_avg_cost }));
    } else { const err = await res.json(); showToast(err.msg||"Erro.", "error"); }
  }

  async function handleRegistrarServico(e) {
    e.preventDefault();
    const payload = { ...svcForm, duration_min:svcForm.duration_min?parseInt(svcForm.duration_min):undefined, amount:parseFloat(svcForm.amount||detailProduct.price), client_id:svcForm.client_id||undefined };
    const res = await fetch(`${API}/services/${detailProduct.id}/records`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
    if (res.ok) {
      showToast("Serviço registrado!");
      setSvcModal(false); setSvcForm(EMPTY_SERVICE);
      fetchProducts(); fetchServiceRecords(detailProduct.id);
      const updated = await res.json();
      setDetailProduct(prev => ({ ...prev, services_count:updated.services_count }));
    } else { const err = await res.json(); showToast(err.msg||"Erro.", "error"); }
  }

  async function deleteSvcRecord(id) {
    if (!canEdit) return;
    const res = await fetch(`${API}/services/records/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
    if (res.ok) { showToast("Registro removido."); fetchProducts(); fetchServiceRecords(detailProduct.id); }
    else showToast("Erro ao remover.", "error");
  }

  const filtered = products.filter(p => {
    const typeOk   = filterType==="all" || p.type===filterType;
    const searchOk = p.name.toLowerCase().includes(search.toLowerCase())
      || (p.category||"").toLowerCase().includes(search.toLowerCase())
      || (p.sku||"").toLowerCase().includes(search.toLowerCase());
    return typeOk && searchOk;
  });

  const totalProducts = products.filter(p=>p.type==="product").length;
  const totalServices = products.filter(p=>p.type==="service").length;
  const avgMargin     = products.length ? (products.reduce((s,p)=>s+p.margin,0)/products.length).toFixed(1) : 0;
  const stockAlerts   = products.filter(p=>p.type==="product"&&p.stock_qty<=p.stock_min).length;

  const inputStyle   = { background:theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
  const selectStyle  = { ...inputStyle, cursor:"pointer" };
  const modalBg      = isGlass ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" } : { background:theme.bgModal, border:`1px solid ${theme.borderCard}` };
  const btnPrimary   = { background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}33` };
  const btnSecondary = { background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" };
  const labelStyle   = { color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 };
  const fieldStyle   = { display:"flex", flexDirection:"column", gap:6 };
  const tabStyle     = (active) => ({ padding:"8px 18px", borderRadius:8, fontSize:"0.85rem", fontWeight:600, cursor:"pointer", border:"none", transition:"all 0.2s", background:active?theme.primaryGrad:(isGlass?"rgba(255,255,255,0.2)":theme.bgCard), color:active?"#fff":theme.textMuted, boxShadow:active?`0 4px 12px ${theme.primary}33`:"none" });

  const tableHeaders = isMobile
    ? ["Nome","Tipo","Preço","Estq.","Ações"]
    : canEdit
      ? ["Nome","SKU","Tipo","Unid.","Custo","Preço","Margem","Estq./Serv.","Status","Ações"]
      : ["Nome","SKU","Tipo","Unid.","Preço","Estq./Serv."];

  return (
    <PageLayout>
      <style>{`
        .card3d-pr { background:${isGlass?"rgba(255,255,255,0.25)":theme.bgCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"}; position:relative; overflow:hidden; cursor:default; }
        .card3d-pr::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-pr:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.5)"}; }
        .table3d-pr { background:${theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(4px);"} }
        .pr-row { cursor:pointer; transition:background 0.15s; }
        .pr-row:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0d`} !important; }
        .detail-panel { background:${isGlass?"rgba(255,255,255,0.2)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; padding:24px; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 8px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":""} }
        @media (max-width:768px) { .card3d-pr { transform:none !important; } .card3d-pr:hover { transform:translateY(-6px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Produtos & Serviços</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>
                {isSeller ? "Consulta de catálogo e estoque" : "Catálogo, estoque e histórico de serviços"}
              </p>
            </div>
          </div>
          {/* ── BOTÕES DO HEADER ── */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {/* Botão Relatório — visível para admin, financial e stock */}
            {canEdit && (
              <button
                onClick={() => setReportModal(true)}
                style={{ ...btnSecondary, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}
              >
                📊 {isMobile ? "Relatório" : "Relatório PDF"}
              </button>
            )}
            {canEdit && (
              <button style={{ ...btnPrimary, whiteSpace:"nowrap" }} onClick={openCreate}>
                + {isMobile ? "Novo" : "Novo Item"}
              </button>
            )}
          </div>
        </div>

        {/* CARDS */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"📦", label:"Produtos",      value:totalProducts, color:theme.primary, border:isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44` },
            { icon:"⚙️", label:"Serviços",      value:totalServices, color:theme.purple,  border:isGlass?"rgba(255,255,255,0.5)":`${theme.purple}44`  },
            ...(!isSeller ? [{ icon:"📊", label:"Margem Média", value:`${avgMargin}%`, color:theme.income, border:isGlass?"rgba(255,255,255,0.5)":`${theme.income}44` }] : []),
            { icon:"⚠️", label:"Alertas Estq.", value:stockAlerts, color:stockAlerts>0?"#ef4444":theme.income, border:isGlass?"rgba(255,255,255,0.5)":stockAlerts>0?"rgba(239,68,68,0.3)":`${theme.income}44` },
          ].map((c,i) => (
            <div key={i} className="card3d-pr" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"1rem":"1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          <input style={{ ...inputStyle, width:isMobile?"100%":"280px" }} type="text" placeholder="🔍 Buscar por nome, SKU ou categoria..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["all","product","service"].map(f=>(
              <button key={f} style={{ background:filterType===f?`${theme.primary}33`:(isGlass?"rgba(255,255,255,0.2)":theme.bgCard), color:filterType===f?theme.textActive:theme.textMuted, border:filterType===f?`1px solid ${theme.primary}66`:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer", ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) }} onClick={()=>setFilterType(f)}>
                {f==="all"?"Todos":f==="product"?"📦 Produtos":"⚙️ Serviços"}
              </button>
            ))}
          </div>
        </div>

        {/* LAYOUT */}
        <div style={{ display:"grid", gridTemplateColumns:detailProduct&&!isMobile?"1fr 380px":"1fr", gap:20, alignItems:"start" }}>

          {/* TABELA */}
          <div className="table3d-pr">
            {loading ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
            ) : filtered.length===0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
                <span style={{ fontSize:"2rem" }}>📭</span><p>Nenhum item encontrado</p>
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth:isMobile?"520px":"unset" }}>
                <thead>
                  <tr>
                    {tableHeaders.map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isAlert    = p.type==="product" && p.stock_qty<=p.stock_min;
                    const isSelected = detailProduct?.id===p.id;
                    return (
                      <tr key={p.id} className="pr-row"
                        style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, background:isSelected?(isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`):"transparent" }}
                        onClick={()=>openDetail(p)}>
                        <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                          <div style={{ fontWeight:600, color:theme.textPrimary }}>{p.name}</div>
                          {!isMobile&&p.category&&<div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{p.category}</div>}
                        </td>
                        {!isMobile && (
                          <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                            {p.sku ? (
                              <span style={{ background:isGlass?"rgba(255,255,255,0.3)":`${theme.primary}11`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`}`, borderRadius:6, padding:"2px 8px", fontSize:"0.75rem", fontWeight:600, color:theme.primary, fontFamily:"monospace" }}>
                                {p.sku}
                              </span>
                            ) : (
                              <span style={{ color:theme.textMuted, fontSize:"0.78rem" }}>—</span>
                            )}
                          </td>
                        )}
                        <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                          <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:"0.72rem", fontWeight:600, background:p.type==="product"?`${theme.primary}22`:`${theme.purple}22`, color:p.type==="product"?theme.primary:theme.purple }}>
                            {p.type==="product"?"📦":"⚙️"}{!isMobile&&(p.type==="product"?" Produto":" Serviço")}
                          </span>
                        </td>
                        {!isMobile&&<td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textSecondary }}>{p.unit}</td>}
                        {!isMobile&&canEdit&&<td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textPrimary }}>{fmt(p.cost)}</td>}
                        <td style={{ padding:"12px 16px", verticalAlign:"middle", fontWeight:600, color:theme.textPrimary }}>{fmt(p.price)}</td>
                        {!isMobile&&canEdit&&(
                          <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                            <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:"0.72rem", fontWeight:600, background:p.margin>=30?`${theme.income}22`:`${theme.warning}22`, color:p.margin>=30?theme.income:theme.warning }}>{p.margin}%</span>
                          </td>
                        )}
                        {!isMobile&&(
                          <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                            {p.type==="product" ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontWeight:700, color:isAlert?"#ef4444":theme.income }}>{p.stock_qty}</span>
                                <span style={{ fontSize:"0.72rem", color:theme.textMuted }}>{p.unit}</span>
                                {isAlert&&<span>⚠️</span>}
                              </div>
                            ) : (
                              <span style={{ color:theme.textMuted, fontSize:"0.85rem" }}>{p.services_count} realizado{p.services_count!==1?"s":""}</span>
                            )}
                          </td>
                        )}
                        {!isMobile&&canEdit&&(
                          <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                            <button style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, cursor:"pointer", border:`1px solid ${p.active?theme.income:theme.textMuted}44`, background:p.active?`${theme.income}22`:"rgba(100,116,139,0.12)", color:p.active?theme.income:theme.textMuted }} onClick={e=>{ e.stopPropagation(); handleToggle(p); }}>
                              {p.active?"Ativo":"Inativo"}
                            </button>
                          </td>
                        )}
                        {canEdit&&(
                          <td style={{ padding:"12px 16px", verticalAlign:"middle" }} onClick={e=>e.stopPropagation()}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button style={{ background:`${theme.primary}22`, border:`1px solid ${theme.primary}44`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={()=>openEdit(p)}>✏️</button>
                              <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={()=>setDeleteConfirm(p)}>🗑️</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* PAINEL DETALHE */}
          {detailProduct && (
            <div className="detail-panel">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:"1rem", color:theme.textPrimary, marginBottom:2 }}>{detailProduct.name}</div>
                  <div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{detailProduct.type==="product"?"📦 Produto":"⚙️ Serviço"} · {detailProduct.category||"Sem categoria"}</div>
                  {detailProduct.sku && (
                    <div style={{ marginTop:4 }}>
                      <span style={{ background:isGlass?"rgba(255,255,255,0.3)":`${theme.primary}11`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`}`, borderRadius:6, padding:"2px 8px", fontSize:"0.72rem", fontWeight:600, color:theme.primary, fontFamily:"monospace" }}>
                        SKU: {detailProduct.sku}
                      </span>
                    </div>
                  )}
                </div>
                <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:8, color:theme.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:13 }} onClick={closeDetail}>✕</button>
              </div>

              <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                <button style={tabStyle(activeTab==="info")} onClick={()=>setActiveTab("info")}>ℹ️ Info</button>
                {detailProduct.type==="product"&&<button style={tabStyle(activeTab==="stock")} onClick={()=>setActiveTab("stock")}>📦 Estoque</button>}
                {detailProduct.type==="service"&&canEdit&&<button style={tabStyle(activeTab==="services")} onClick={()=>setActiveTab("services")}>⚙️ Serviços</button>}
              </div>

              {activeTab==="info" && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[
                    { label:"Preço de Venda", value:fmt(detailProduct.price), color:theme.income },
                    ...(!isSeller ? [
                      { label:"Custo",  value:fmt(detailProduct.cost), color:theme.expense },
                      { label:"Lucro",  value:fmt(detailProduct.profit||detailProduct.price-detailProduct.cost), color:theme.primary },
                      { label:"Margem", value:`${detailProduct.margin}%`, color:theme.warning },
                    ] : []),
                    ...(detailProduct.type==="product" ? [
                      { label:"Estoque Atual",  value:`${detailProduct.stock_qty} ${detailProduct.unit}`, color:detailProduct.stock_qty<=detailProduct.stock_min?"#ef4444":theme.income },
                      { label:"Estoque Mínimo", value:`${detailProduct.stock_min} ${detailProduct.unit}`, color:theme.textSecondary },
                      ...(!isSeller ? [{ label:"Custo Médio", value:fmt(detailProduct.stock_avg_cost), color:theme.textSecondary }] : []),
                    ] : [
                      { label:"Serviços Realizados", value:detailProduct.services_count, color:theme.primary },
                    ]),
                  ].map((f,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:8, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}` }}>
                      <span style={{ fontSize:"0.82rem", color:theme.textMuted }}>{f.label}</span>
                      <span style={{ fontSize:"0.88rem", fontWeight:700, color:f.color }}>{f.value}</span>
                    </div>
                  ))}
                  {detailProduct.description&&(
                    <div style={{ padding:"10px 12px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:8, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}` }}>
                      <div style={{ fontSize:"0.72rem", color:theme.textMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Descrição</div>
                      <div style={{ fontSize:"0.85rem", color:theme.textSecondary }}>{detailProduct.description}</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab==="stock" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div>
                      <span style={{ fontSize:"1.3rem", fontWeight:700, color:detailProduct.stock_qty<=detailProduct.stock_min?"#ef4444":theme.income }}>{detailProduct.stock_qty}</span>
                      <span style={{ fontSize:"0.85rem", color:theme.textMuted, marginLeft:4 }}>{detailProduct.unit} em estoque</span>
                    </div>
                    {canEdit&&(
                      <button style={{ ...btnPrimary, fontSize:"0.82rem", padding:"7px 14px" }} onClick={()=>{ setMovForm(EMPTY_MOVEMENT); setMovModal(true); }}>+ Movimentar</button>
                    )}
                  </div>
                  {detailProduct.stock_qty<=detailProduct.stock_min&&(
                    <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:"0.82rem", color:"#ef4444", display:"flex", gap:8, alignItems:"center" }}>
                      ⚠️ Estoque abaixo do mínimo ({detailProduct.stock_min} {detailProduct.unit})!
                    </div>
                  )}
                  {loadingDetail ? (
                    <div style={{ textAlign:"center", color:theme.textMuted, padding:"20px 0" }}>Carregando...</div>
                  ) : movements.length===0 ? (
                    <div style={{ textAlign:"center", color:theme.textMuted, padding:"24px 0" }}>Nenhuma movimentação registrada.</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                      {movements.map(m=>(
                        <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:8, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}` }}>
                          <div>
                            <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:"0.7rem", fontWeight:700, marginRight:8, background:m.type==="in"?"rgba(34,197,94,0.15)":m.type==="out"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)", color:m.type==="in"?theme.income:m.type==="out"?"#ef4444":"#f59e0b" }}>
                              {m.type==="in"?"Entrada":m.type==="out"?"Saída":"Ajuste"}
                            </span>
                            <span style={{ fontSize:"0.88rem", fontWeight:700, color:theme.textPrimary }}>{m.type==="adjust"?"→ ":""}{m.qty} {detailProduct.unit}</span>
                            {m.reason&&<div style={{ fontSize:"0.75rem", color:theme.textMuted, marginTop:2 }}>{m.reason}</div>}
                          </div>
                          <div style={{ textAlign:"right" }}>
                            {canEdit&&m.cost&&<div style={{ fontSize:"0.8rem", color:theme.textMuted }}>{fmt(m.cost)}/un</div>}
                            <div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{m.date?m.date.split("-").reverse().join("/"):"—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab==="services"&&canEdit&&(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <span style={{ fontSize:"0.9rem", color:theme.textMuted }}><strong style={{ color:theme.primary, fontSize:"1.1rem" }}>{detailProduct.services_count}</strong> serviço{detailProduct.services_count!==1?"s":""} realizado{detailProduct.services_count!==1?"s":""}</span>
                    <button style={{ ...btnPrimary, fontSize:"0.82rem", padding:"7px 14px" }} onClick={()=>{ setSvcForm({...EMPTY_SERVICE,amount:detailProduct.price}); setSvcModal(true); }}>+ Registrar</button>
                  </div>
                  {loadingDetail ? (
                    <div style={{ textAlign:"center", color:theme.textMuted, padding:"20px 0" }}>Carregando...</div>
                  ) : serviceRecords.length===0 ? (
                    <div style={{ textAlign:"center", color:theme.textMuted, padding:"24px 0" }}>Nenhum serviço registrado.</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                      {serviceRecords.map(r=>(
                        <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 12px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:8, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}` }}>
                          <div>
                            <div style={{ fontWeight:600, color:theme.income, fontSize:"0.9rem" }}>{fmt(r.amount)}</div>
                            {r.client_name&&<div style={{ fontSize:"0.75rem", color:theme.textMuted }}>👤 {r.client_name}</div>}
                            {r.duration_min&&<div style={{ fontSize:"0.75rem", color:theme.textMuted }}>⏱️ {r.duration_min} min</div>}
                            {r.notes&&<div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{r.notes}</div>}
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                            <div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{r.date?r.date.split("-").reverse().join("/"):"—"}</div>
                            <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:"0.8rem", color:"#ef4444" }} onClick={()=>deleteSvcRecord(r.id)}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen&&canEdit&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:620, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editing?"✏️ Editar Item":"➕ Novo Item"}</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
                <div style={{ ...fieldStyle, gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Nome *</label>
                  <input style={inputStyle} required placeholder="Nome do produto ou serviço" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div style={{ ...fieldStyle, gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Código / SKU</label>
                  <input style={inputStyle} placeholder="Ex: PROD-001, SRV-042, ELE-103..." value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} />
                  <span style={{ fontSize:"0.72rem", color:theme.textMuted, paddingLeft:4 }}>Código de referência interno (opcional)</span>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tipo *</label>
                  <select style={selectStyle} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    <option value="service">⚙️ Serviço</option>
                    <option value="product">📦 Produto</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Unidade</label>
                  <select style={selectStyle} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                    {["un","hr","kg","g","m","m²","m³","L","cx","pc","par","vb"].map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Custo (R$)</label>
                  <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0,00" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Preço de Venda (R$) *</label>
                  <input style={inputStyle} type="number" step="0.01" min="0" required placeholder="0,00" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} />
                </div>
                {form.type==="product"&&(
                  <>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Estoque Mínimo</label>
                      <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0" value={form.stock_min} onChange={e=>setForm({...form,stock_min:e.target.value})} />
                    </div>
                    {!editing&&(
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Estoque Inicial</label>
                        <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0" value={form.stock_qty_initial} onChange={e=>setForm({...form,stock_qty_initial:e.target.value})} />
                        <span style={{ fontSize:"0.72rem", color:theme.textMuted, paddingLeft:4 }}>Será registrado como entrada automática</span>
                      </div>
                    )}
                  </>
                )}
                {form.price>0&&(
                  <div style={{ gridColumn:"1 / -1" }}>
                    <div style={{ background:isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`}`, borderRadius:10, padding:"10px 16px", display:"flex", gap:24, fontSize:"0.88rem", color:theme.textSecondary, flexWrap:"wrap" }}>
                      <span>💡 Lucro: <strong style={{ color:theme.income }}>{fmt((parseFloat(form.price)||0)-(parseFloat(form.cost)||0))}</strong></span>
                      <span>Margem: <strong style={{ color:theme.warning }}>{form.price>0?(((parseFloat(form.price)-parseFloat(form.cost||0))/parseFloat(form.price))*100).toFixed(1):0}%</strong></span>
                    </div>
                  </div>
                )}
                <div style={{ ...fieldStyle, gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Categoria</label>
                  <input style={inputStyle} placeholder="Ex: Mão de obra, Elétrica, TI..." value={form.category} onChange={e=>setForm({...form,category:e.target.value})} />
                </div>
                <div style={{ ...fieldStyle, gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Descrição</label>
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:70 }} placeholder="Detalhes..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {movModal&&canEdit&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setMovModal(false)}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:480, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:theme.textPrimary }}>📦 Movimentar Estoque</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={()=>setMovModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMovimentar}>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tipo *</label>
                  <select style={selectStyle} value={movForm.type} onChange={e=>setMovForm({...movForm,type:e.target.value})}>
                    <option value="in">📥 Entrada</option>
                    <option value="out">📤 Saída</option>
                    <option value="adjust">🔧 Ajuste (novo total)</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{movForm.type==="adjust"?"Novo Estoque Total *":"Quantidade *"}</label>
                  <input style={inputStyle} required type="number" step="0.01" min="0.01" placeholder="0" value={movForm.qty} onChange={e=>setMovForm({...movForm,qty:e.target.value})} />
                </div>
                {movForm.type==="in"&&(
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Custo Unitário (R$)</label>
                    <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0,00" value={movForm.cost} onChange={e=>setMovForm({...movForm,cost:e.target.value})} />
                  </div>
                )}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Motivo</label>
                  <input style={inputStyle} placeholder="Ex: Compra, Venda, Inventário..." value={movForm.reason} onChange={e=>setMovForm({...movForm,reason:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Data</label>
                  <input style={inputStyle} type="date" value={movForm.date} onChange={e=>setMovForm({...movForm,date:e.target.value})} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={()=>setMovModal(false)}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto" }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SERVIÇO */}
      {svcModal&&canEdit&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setSvcModal(false)}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:480, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:theme.textPrimary }}>⚙️ Registrar Serviço</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={()=>setSvcModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegistrarServico}>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Cliente</label>
                  <select style={selectStyle} value={svcForm.client_id} onChange={e=>setSvcForm({...svcForm,client_id:e.target.value})}>
                    <option value="">— Sem cliente —</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Valor Cobrado (R$) *</label>
                  <input style={inputStyle} required type="number" step="0.01" min="0" placeholder="0,00" value={svcForm.amount} onChange={e=>setSvcForm({...svcForm,amount:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Duração (minutos)</label>
                  <input style={inputStyle} type="number" min="1" placeholder="60" value={svcForm.duration_min} onChange={e=>setSvcForm({...svcForm,duration_min:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Data</label>
                  <input style={inputStyle} type="date" value={svcForm.date} onChange={e=>setSvcForm({...svcForm,date:e.target.value})} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Observações</label>
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:60 }} placeholder="Detalhes do serviço..." value={svcForm.notes} onChange={e=>setSvcForm({...svcForm,notes:e.target.value})} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={()=>setSvcModal(false)}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto" }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm&&canEdit&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Item</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>Excluir <strong style={{ color:theme.textPrimary }}>"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.</p>
            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={()=>setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={()=>handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RELATÓRIO DE PRODUTOS ── */}
      {reportModal && (
        <ProductReportModal
          onClose={() => setReportModal(false)}
          theme={theme}
          isGlass={isGlass}
        />
      )}

      {toast&&(
        <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}
