/**
 * Orders.jsx — Orquestrador de Ordens de Serviço
 *
 * Responsabilidade: buscar dados, gerenciar estado da página, renderizar layout.
 * Toda lógica visual específica está nos componentes:
 *   - QRScanner            → src/components/restaura/QRScanner.jsx
 *   - CheckinModal         → src/components/restaura/CheckinModal.jsx
 *   - RestauraGlassCard    → src/components/restaura/RestauraGlassCard.jsx
 *   - RestauraGlassCardForm→ src/components/restaura/RestauraGlassCardForm.jsx
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { setOrderStatusOverlay, getOrderOverlays } from "../offline/offlineDB";
import { syncNow } from "../offline/syncEngine";
import { isRG } from "../utils/isRG";

import CheckinModal          from "../components/restaura/CheckinModal";
import RestauraGlassCard     from "../components/restaura/RestauraGlassCard";
import RestauraGlassCardForm from "../components/restaura/RestauraGlassCardForm";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

// ── Tema Restaura Glass ───────────────────────────────────────────────────────
const RGT = {
  verde:     "#1a8a3c",
  verdeBd:   "rgba(26,138,60,0.25)",
  verdePale: "rgba(26,138,60,0.08)",
  cardBg:    "rgba(255,255,255,0.78)",
  cardBlur:  "blur(22px) saturate(180%)",
  cardShadow:"0 8px 32px rgba(26,138,60,0.13), 0 2px 8px rgba(0,0,0,0.07)",
  pageBg:    "transparent",
  text:      "#1a1a1a",
  textSub:   "#4a5568",
  radius:    14,
};

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const FREQS = [
  { value: "all",        label: "Todas"      },
  { value: "mensal",     label: "Mensal"     },
  { value: "quinzenal",  label: "Quinzenal"  },
  { value: "semanal",    label: "Semanal"    },
  { value: "esporadico", label: "Esporádico" },
];

const STATUS_MAP = {
  open:        { label: "Aberta",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  in_progress: { label: "Em andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  done:        { label: "Concluída",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  cancelled:   { label: "Cancelada",    color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const EMPTY_FORM = { client_id: "", status: "open", notes: "", payment_terms: "", discount: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ── Logo RG ───────────────────────────────────────────────────────────────────
function LogoRG({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill={RGT.verde} />
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
        fontSize="26" fontWeight="900" fontFamily="Arial Black, Arial" fill="white">RG</text>
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Orders() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const rg = isRG();

  const [sidebarOpen,    setSidebarOpen]   = useState(false);
  const [orders,         setOrders]        = useState([]);
  const [overlays,       setOverlays]      = useState({});
  const [clients,        setClients]       = useState([]);
  const [products,       setProducts]      = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [view,           setView]          = useState("list");
  const [editing,        setEditing]       = useState(null);
  const [form,           setForm]          = useState(EMPTY_FORM);
  const [items,          setItems]         = useState([]);
  const [deleteConfirm,  setDeleteConfirm] = useState(null);
  const [toast,          setToast]         = useState(null);
  const [filterStatus,   setFilterStatus]  = useState("all");
  const [search,         setSearch]        = useState("");
  const [checkinOrder,   setCheckinOrder]  = useState(null);
  const [detailOrder,    setDetailOrder]   = useState(null);
  const [orderCheckins,  setOrderCheckins] = useState([]);
  const [loadingChk,     setLoadingChk]    = useState(false);
  const [checkinSemana,  setCheckinSemana] = useState(null); // { order, semanaIdx, action }
  const [filterFreq,     setFilterFreq]    = useState("all");
  const [freqIndex,      setFreqIndex]     = useState({});

  const pollingRef = useRef(null);

  // ── Cache ───────────────────────────────────────────────────────────────────
  const CACHE_TTL = 60000;
  function cacheGet(k) { try { const r = sessionStorage.getItem(k); if (!r) return null; const { data, ts } = JSON.parse(r); if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(k); return null; } return data; } catch { return null; } }
  function cacheSet(k, d) { try { sessionStorage.setItem(k, JSON.stringify({ data: d, ts: Date.now() })); } catch {} }
  function cacheInvalidate(k) { try { sessionStorage.removeItem(k); } catch {} }

  // ── Overlays offline ────────────────────────────────────────────────────────
  async function loadOverlays() {
    try { setOverlays(await getOrderOverlays()); } catch { setOverlays({}); }
  }

  // ── Fetch orders ────────────────────────────────────────────────────────────
  async function fetchOrders() {
    try {
      const res  = await fetch(`${API}/orders`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      cacheSet("sv_orders", list);
    } catch {}
    await loadOverlays();
  }

  // ── Fetch inicial ───────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true);
    const co = cacheGet("sv_orders"), cc = cacheGet("sv_clients"), cp = cacheGet("sv_products");
    if (co) setOrders(co);
    if (cc) setClients(cc);
    if (cp) setProducts(cp);
    if (co && cc && cp) setLoading(false);
    await loadOverlays();
    if (!navigator.onLine) { setLoading(false); return; }
    try {
      const h    = { Authorization: `Bearer ${token()}` };
      const resO = await fetch(`${API}/orders`, { headers: h });
      if (resO.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const dataO = await resO.json();
      const ords  = Array.isArray(dataO) ? dataO : [];
      setOrders(ords);
      cacheSet("sv_orders", ords);
      try { const r = await fetch(`${API}/clients`,  { headers: h }); const d = await r.json(); const c = Array.isArray(d) ? d : []; setClients(c);  cacheSet("sv_clients",  c); } catch {}
      try { const r = await fetch(`${API}/products`, { headers: h }); const d = await r.json(); const p = Array.isArray(d) ? d : []; setProducts(p); cacheSet("sv_products", p); } catch {}
    } catch {
      showToast("Erro ao carregar ordens.", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch checkins de uma OS ────────────────────────────────────────────────
  async function fetchOrderCheckins(orderId) {
    setLoadingChk(true);
    try {
      const res  = await fetch(`${API}/orders/${orderId}/checkins`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setOrderCheckins(Array.isArray(data) ? data : []);
    } catch {
      setOrderCheckins([]);
    } finally {
      setLoadingChk(false);
    }
  }

  // Pré-selecionar cliente vindo de ?client_id=X&new=1 (botão do Clients.jsx)
  // CORREÇÃO: limpa os query params após usar — evita que F5 reabra o formulário
  useEffect(() => {
    const cid   = searchParams.get("client_id");
    const isNew = searchParams.get("new");
    if (!cid || !isNew) return;

    // Remove os query params da URL imediatamente, antes de abrir o form
    // replace: true para não criar entrada no histórico do navegador
    navigate("/orders", { replace: true });

    const tryOpen = setInterval(() => {
      setClients(prev => {
        if (prev.length > 0) {
          clearInterval(tryOpen);
          setEditing(null); setForm(EMPTY_FORM); setItems([]);
          setView("form");
          sessionStorage.setItem("sv_rg_preselect_client", cid);
        }
        return prev;
      });
    }, 300);
    return () => clearInterval(tryOpen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // dependência removida: searchParams — o efeito deve rodar só uma vez no mount
  // (rodar em cada mudança de searchParams causava loop de re-abertura do form)

  useEffect(() => {
    try { const idx = JSON.parse(localStorage.getItem("sv_rg_freq_idx") || "{}"); setFreqIndex(idx); } catch {}
    fetchAll();
    pollingRef.current = setInterval(fetchOrders, 15000);
    const onOnline = () => { syncNow().then(() => fetchOrders()); };
    window.addEventListener("online",     onOnline);
    window.addEventListener("sv_synced",  fetchOrders);
    return () => {
      clearInterval(pollingRef.current);
      window.removeEventListener("online",    onOnline);
      window.removeEventListener("sv_synced", fetchOrders);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function effectiveStatus(o) {
    return overlays[String(o.id)] || o.status;
  }

  // ── Criar O.S RG ────────────────────────────────────────────────────────────
  async function handleCriarRG(cliente, cardData) {
    if (!navigator.onLine) { showToast("Criar O.S precisa de internet.", "warn"); return; }
    const payload = { client_id: parseInt(cliente.id), status: "open", notes: cardData.obs || "", payment_terms: "", discount: 0, items: [] };
    try {
      const res = await fetch(`${API}/orders`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          try {
            await fetch(`${API}/limpeza/card/${data.id}`, {
              method:  "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
              body:    JSON.stringify({ card: cardData }),
            });
          } catch {}
          localStorage.setItem(`sv_rg_card_${data.id}`, JSON.stringify(cardData));
        }
        cacheInvalidate("sv_orders");
        showToast("Cartão criado!");
        setView("list");
        fetchAll();
      } else {
        const err = await res.json();
        showToast(err.msg || "Erro ao criar O.S.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    }
  }

  // ── Form padrão (não-RG) ────────────────────────────────────────────────────
  function addItem()   { setItems(p => [...p, { product_id: "", name: "", unit: "un", qty: 1, price: 0, total: 0 }]); }
  function removeItem(idx) { setItems(p => p.filter((_, i) => i !== idx)); }
  function updateItem(idx, fld, value) {
    setItems(p => {
      const n = [...p]; n[idx] = { ...n[idx], [fld]: value };
      if (fld === "qty" || fld === "price") n[idx].total = parseFloat(n[idx].qty || 0) * parseFloat(n[idx].price || 0);
      return n;
    });
  }
  function selectProduct(idx, pid) {
    const p = products.find(p => String(p.id) === String(pid));
    if (!p) return;
    setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], product_id: p.id, name: p.name, unit: p.unit || "un", price: p.price, total: parseFloat(n[idx].qty || 1) * p.price }; return n; });
  }

  const subtotal    = items.reduce((s, i) => s + parseFloat(i.qty || 0) * parseFloat(i.price || 0), 0);
  const discountAmt = subtotal * (parseFloat(form.discount || 0) / 100);
  const total       = subtotal - discountAmt;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) { showToast("Selecione um cliente.", "error"); return; }
    if (!navigator.onLine) { showToast("Criar O.S precisa de internet.", "warn"); return; }
    const payload = { ...form, client_id: parseInt(form.client_id), discount: parseFloat(form.discount || 0), items };
    const url     = editing ? `${API}/orders/${editing.id}` : `${API}/orders`;
    const method  = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(payload) });
      if (res.ok) { cacheInvalidate("sv_orders"); showToast(editing ? "O.S atualizada!" : "O.S criada!"); setView("list"); fetchAll(); }
      else { const err = await res.json(); showToast(err.msg || "Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function changeStatus(o, status) {
    if (!navigator.onLine) { showToast("Mudar status precisa de internet.", "warn"); return; }
    try {
      await fetch(`${API}/orders/${o.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status }) });
      cacheInvalidate("sv_orders");
      fetchOrders();
    } catch { showToast("Erro ao alterar status.", "error"); }
  }

  async function handleDelete(id) {
    if (!navigator.onLine) { showToast("Exclusão precisa de internet.", "warn"); setDeleteConfirm(null); return; }
    try {
      const res = await fetch(`${API}/orders/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { showToast("O.S removida."); setDeleteConfirm(null); cacheInvalidate("sv_orders"); fetchAll(); }
      else showToast("Erro ao remover.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  function openDetailOrder(o) {
    setDetailOrder(o);
    fetchOrderCheckins(o.id);
  }

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const st      = effectiveStatus(o);
    const freqOk  = filterFreq === "all" || freqIndex[String(o.id)] === filterFreq;
    return freqOk &&
      (filterStatus === "all" || st === filterStatus) &&
      (o.number.toLowerCase().includes(search.toLowerCase()) || o.client_name.toLowerCase().includes(search.toLowerCase()));
  });
  const countBy = (s) => orders.filter(o => effectiveStatus(o) === s).length;

  // ── Estilos padrão (não-RG) ─────────────────────────────────────────────────
  const inputStyle    = { background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`, borderRadius: 10, padding: "10px 14px", color: theme.textPrimary, fontSize: "0.9rem", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s", colorScheme, ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }) };
  const selectStyle   = { ...inputStyle, cursor: "pointer" };
  const modalBg       = isGlass ? { backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)" } : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };
  const btnPrimary    = { background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: `0 4px 15px ${theme.primary}33` };
  const btnSecondary  = { background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard, color: theme.textSecondary, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" };
  const formCard      = { background: isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`, borderRadius: 14, padding: 24, marginBottom: 24, ...(isGlass && { backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)" }) };
  const sectionLabel  = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.textMuted, margin: "0 0 14px 2px" };
  const fieldStyle    = { display: "flex", flexDirection: "column", gap: 6 };
  const labelStyle    = { color: theme.textSecondary, fontSize: "0.8rem", fontWeight: 600 };

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: FORM
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "form") {
    // RG: formulário de cartão
    if (rg) return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", background: RGT.pageBg, minHeight: "100vh" }}>
          <div style={{ marginBottom: 20 }}>
            <button style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 8, padding: "7px 16px", fontWeight: 600, cursor: "pointer", color: RGT.verde, fontSize: "0.85rem", marginBottom: 12 }}
              onClick={() => setView("list")}>← Voltar</button>
          </div>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <RestauraGlassCardForm
              clients={clients}
              isMobile={isMobile}
              onCancel={() => setView("list")}
              onSubmit={handleCriarRG}
            />
          </div>
        </div>
      </PageLayout>
    );

    // Padrão: formulário de OS
    return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <button style={{ ...btnSecondary, marginBottom: 12, fontSize: "0.82rem" }} onClick={() => setView("list")}>← Voltar</button>
            <h1 style={{ fontSize: isMobile ? "1.3rem" : "1.75rem", fontWeight: 700, margin: 0, color: theme.textPrimary }}>
              {editing ? `Editar O.S — ${editing.number}` : "Nova Ordem de Serviço"}
            </h1>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formCard}>
              <p style={sectionLabel}>📋 Dados da O.S</p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
                <div style={{ ...fieldStyle, gridColumn: isMobile ? "1" : "1 / -1" }}>
                  <label style={labelStyle}>Cliente *</label>
                  <select style={selectStyle} required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">— Selecione o cliente —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}><label style={labelStyle}>Status</label>
                  <select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}><label style={labelStyle}>Desconto (%)</label>
                  <input style={inputStyle} type="number" min="0" max="100" step="0.1" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Pagamento</label>
                  <input style={inputStyle} placeholder="Ex: Pix no ato" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
                <div style={{ ...fieldStyle, gridColumn: isMobile ? "1" : "1 / -1" }}><label style={labelStyle}>Observações</label>
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div style={formCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ ...sectionLabel, marginBottom: 0 }}>📦 Itens</p>
                <button type="button" style={{ ...btnSecondary, fontSize: "0.82rem", padding: "7px 14px" }} onClick={addItem}>+ Adicionar Item</button>
              </div>
              {items.length === 0
                ? <div style={{ textAlign: "center", color: theme.textMuted, padding: "32px 0" }}>Nenhum item. Clique em "+ Adicionar Item".</div>
                : (
                  <>
                    {items.map((item, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr 1fr 1.5fr 1.5fr 36px", gap: 10, marginBottom: 16, padding: isMobile ? "16px" : "0" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <select style={{ ...selectStyle, marginBottom: 4 }} value={item.product_id || ""} onChange={e => selectProduct(idx, e.target.value)}>
                            <option value="">— Selecione —</option>
                            {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
                          </select>
                          <input style={{ ...inputStyle, fontSize: "0.8rem" }} placeholder="Ou descreva manualmente" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} />
                        </div>
                        <div><input style={inputStyle} value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} /></div>
                        <div><input style={inputStyle} type="number" min="1" step="0.01" value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)} /></div>
                        <div><input style={inputStyle} type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(idx, "price", e.target.value)} /></div>
                        <div style={{ display: "flex", alignItems: "center", color: theme.income, fontWeight: 700 }}>{fmt(parseFloat(item.qty || 0) * parseFloat(item.price || 0))}</div>
                        <button type="button" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, cursor: "pointer", color: "#ef4444", width: 36, height: 36 }} onClick={() => removeItem(idx)}>✕</button>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${theme.borderCard}`, marginTop: 8, paddingTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: theme.textSecondary }}>Subtotal</span><span>{fmt(subtotal)}</span></div>
                      {parseFloat(form.discount) > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}><span>Desconto ({form.discount}%)</span><span>- {fmt(discountAmt)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 700, color: theme.primary, borderTop: `1px solid ${theme.borderCard}`, paddingTop: 12, marginTop: 4 }}><span>TOTAL</span><span>{fmt(total)}</span></div>
                    </div>
                  </>
                )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 48, flexDirection: isMobile ? "column" : "row" }}>
              <button type="button" style={{ ...btnSecondary, width: isMobile ? "100%" : "auto" }} onClick={() => setView("list")}>Cancelar</button>
              <button type="submit"  style={{ ...btnPrimary,   width: isMobile ? "100%" : "auto" }}>{editing ? "Salvar Alterações" : "Criar O.S"}</button>
            </div>
          </form>
        </div>
        {toast && <div style={{ position: "fixed", bottom: 28, right: 28, color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, background: toast.type === "error" ? "#ef4444" : toast.type === "warn" ? "#f59e0b" : theme.primaryGrad }}>{toast.msg}</div>}
      </PageLayout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: LIST
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <PageLayout>
      <style>{`
        .card3d-os{background:${rg ? RGT.cardBg : (isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard)};border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(18px);transition:transform 0.35s ease,box-shadow 0.35s ease;transform:perspective(700px) rotateX(5deg) rotateY(-3deg);box-shadow:0 20px 48px rgba(0,0,0,0.15);position:relative;overflow:hidden;cursor:default;}
        .card3d-os:hover{transform:perspective(700px) rotateX(0) rotateY(0) translateZ(20px) translateY(-10px);}
        .table3d-os{background:rgba(255,255,255,0.7);border:1px solid rgba(26,138,60,0.2);border-radius:16px;overflow-x:auto;-webkit-overflow-scrolling:touch;backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);}
        .os-row:hover{background:rgba(26,138,60,0.05)!important;}
        @media(max-width:768px){.card3d-os{transform:none!important;}.card3d-os:hover{transform:translateY(-6px)!important;}}
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", position: "relative", zIndex: 1, background: rg ? RGT.pageBg : "transparent", minHeight: rg ? "100vh" : "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {rg ? <LogoRG size={isMobile ? 44 : 56} /> : <img src={logoGif} alt="logo" style={{ width: isMobile ? 44 : 60, height: isMobile ? 44 : 60, objectFit: "contain" }} />}
            <div>
              <h1 style={{ fontSize: isMobile ? "20px" : "1.75rem", fontWeight: 700, margin: 0, color: rg ? RGT.verde : theme.textPrimary }}>{rg ? "Cartões" : "Pedidos / O.S"}</h1>
              <p style={{ color: rg ? RGT.textSub : theme.textMuted, margin: "4px 0 0", fontSize: "0.85rem" }}>{rg ? "Restaura Glass · Cartões de serviço" : "Gerencie suas ordens de serviço"}</p>
            </div>
          </div>
          <button
            style={rg ? { background: RGT.verde, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" } : { ...btnPrimary, whiteSpace: "nowrap" }}
            onClick={() => { setEditing(null); setForm(EMPTY_FORM); setItems([]); setView("form"); }}>
            {rg ? "+ Novo Cartão" : "+ Nova O.S"}
          </button>
        </div>

        {/* Banner offline */}
        {!navigator.onLine && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 20 }}>
            📴 Offline — check-ins salvos, sincroniza ao reconectar.
          </div>
        )}

        {/* Cards de resumo */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { icon: "📋", label: "Total",        value: orders.length,        color: rg ? RGT.verde : theme.primary, border: rg ? RGT.verdeBd : `${theme.primary}44` },
            { icon: "🔵", label: "Abertas",      value: countBy("open"),       color: "#3b82f6", border: "rgba(59,130,246,0.3)"  },
            { icon: "🟡", label: "Em andamento", value: countBy("in_progress"),color: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
            { icon: "✅", label: "Concluídas",   value: countBy("done"),       color: "#22c55e", border: "rgba(34,197,94,0.3)"   },
          ].map((c, i) => (
            <div key={i} className="card3d-os" style={{ border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: "1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color: rg ? RGT.textSub : theme.textMuted, fontSize: "0.75rem", marginBottom: 2 }}>{c.label}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: isMobile ? "1rem" : "1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, ...(rg && { background: "rgba(255,255,255,0.85)", border: `1px solid ${RGT.verdeBd}`, color: RGT.text }), width: isMobile ? "100%" : "280px" }}
            type="text" placeholder="🔍 Buscar por número ou cliente..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", ...Object.keys(STATUS_MAP)].map(s => (
              <button key={s}
                style={{ background: filterStatus === s ? (rg ? `${RGT.verde}22` : `${theme.primary}33`) : "rgba(255,255,255,0.75)", color: filterStatus === s ? (rg ? RGT.verde : theme.textActive) : (rg ? RGT.textSub : theme.textMuted), border: filterStatus === s ? `1px solid ${rg ? RGT.verde : theme.primary}` : `1px solid ${rg ? RGT.verdeBd : theme.borderCard}`, borderRadius: 8, padding: "6px 14px", fontSize: "0.82rem", cursor: "pointer" }}
                onClick={() => setFilterStatus(s)}>
                {s === "all" ? "Todos" : STATUS_MAP[s].label}
              </button>
            ))}
          </div>
          {/* Filtro frequência — exclusivo RG */}
          {rg && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {FREQS.map(f => (
                <button key={f.value}
                  style={{ background: filterFreq === f.value ? RGT.verde : "rgba(255,255,255,0.8)", color: filterFreq === f.value ? "#fff" : RGT.textSub, border: `1px solid ${filterFreq === f.value ? RGT.verde : RGT.verdeBd}`, borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
                  onClick={() => setFilterFreq(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="table3d-os">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: rg ? RGT.textSub : theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12, color: rg ? RGT.textSub : theme.textMuted }}>
              <span style={{ fontSize: "2rem" }}>📋</span>
              <p>{search ? "Nenhuma O.S encontrada" : "Nenhuma O.S cadastrada ainda"}</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: isMobile ? "580px" : "unset" }}>
              <thead>
                <tr>
                  {(isMobile ? ["Número","Cliente","Status","Check-in","Ações"] : ["Número","Cliente","Origem","Total","Criado em","Status","Check-in","Ações"]).map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: rg ? RGT.textSub : theme.textMuted, fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: rg ? "rgba(255,255,255,0.5)" : "transparent", borderBottom: `1px solid ${rg ? RGT.verdeBd : theme.borderCard}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const effStatus   = effectiveStatus(o);
                  const st          = STATUS_MAP[effStatus] || STATUS_MAP.open;
                  const isOverlay   = !!overlays[String(o.id)];
                  const podeCheckin = effStatus === "open" || effStatus === "in_progress";
                  return (
                    <tr key={o.id} className="os-row" style={{ borderBottom: `1px solid ${rg ? RGT.verdeBd : theme.border}`, transition: "background 0.15s" }}>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <button style={{ background: "none", border: "none", fontWeight: 700, color: rg ? RGT.verde : theme.primary, cursor: "pointer", fontSize: "0.88rem", padding: 0, textDecoration: "underline" }} onClick={() => openDetailOrder(o)}>{o.number}</button>
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: rg ? RGT.text : theme.textPrimary }}>{o.client_name}</div>
                      </td>
                      {!isMobile && <td style={{ padding: "12px 16px", verticalAlign: "middle" }}><span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: rg ? RGT.verdePale : `${theme.primary}22`, color: rg ? RGT.verde : theme.primary }}>{o.origin === "quote" ? "🧾 Orçamento" : "✏️ Direta"}</span></td>}
                      {!isMobile && <td style={{ padding: "12px 16px", verticalAlign: "middle", fontWeight: 700, color: rg ? RGT.verde : theme.income }}>{fmt(o.total)}</td>}
                      {!isMobile && <td style={{ padding: "12px 16px", verticalAlign: "middle", color: rg ? RGT.textSub : theme.textMuted }}>{fmtDate(o.created_at)}</td>}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        {isOverlay ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, color: st.color, background: st.bg }}>{st.label} <span style={{ fontSize: 9 }}>⏳</span></span>
                        ) : (
                          <select style={{ border: "none", borderRadius: 20, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", outline: "none", color: st.color, background: st.bg }} value={o.status} onChange={e => changeStatus(o, e.target.value)}>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        {podeCheckin ? (
                          <button
                            style={{ background: effStatus === "in_progress" ? "rgba(34,197,94,0.12)" : (rg ? `${RGT.verde}15` : "rgba(79,142,247,0.12)"), border: `1px solid ${effStatus === "in_progress" ? "rgba(34,197,94,0.3)" : (rg ? RGT.verdeBd : "rgba(79,142,247,0.3)")}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: effStatus === "in_progress" ? "#22c55e" : (rg ? RGT.verde : "#4f8ef7"), whiteSpace: "nowrap" }}
                            onClick={() => setCheckinOrder(o)}>
                            {effStatus === "in_progress" ? "✅ Finalizar" : "📍 Check-in"}
                          </button>
                        ) : <span style={{ fontSize: "0.75rem", color: rg ? RGT.textSub : theme.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ background: rg ? "rgba(255,255,255,0.8)" : `${theme.primary}22`, border: `1px solid ${rg ? RGT.verdeBd : `${theme.primary}44`}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }}
                            onClick={() => { if (!rg) { setEditing(o); setForm({ client_id: o.client_id, status: o.status, notes: o.notes || "", payment_terms: o.payment_terms || "", discount: o.discount || 0 }); setItems(o.items || []); setView("form"); } else openDetailOrder(o); }}>✏️</button>
                          <button style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }}
                            onClick={() => setDeleteConfirm(o)}>🗑️</button>
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

      {/* ── MODAIS ─────────────────────────────────────────────────────────── */}

      {/* CheckinModal via tabela */}
      {checkinOrder && (
        <CheckinModal
          order={{ ...checkinOrder, client_address: checkinOrder.client_address || "" }}
          isGlass={isGlass} isMobile={isMobile} theme={theme}
          onClose={() => setCheckinOrder(null)}
          onSuccess={() => { cacheInvalidate("sv_orders"); loadOverlays(); fetchOrders(); showToast("Registro salvo!"); setTimeout(() => setCheckinOrder(null), 1500); }}
        />
      )}

      {/* CheckinModal via semana do cartão RG — passa initialAction para pular seleção */}
      {checkinSemana && (
        <CheckinModal
          order={{ ...checkinSemana.order, client_address: checkinSemana.order.client_address || "" }}
          initialAction={checkinSemana.action}
          isGlass={isGlass} isMobile={isMobile} theme={theme}
          onClose={() => setCheckinSemana(null)}
          onSuccess={(result) => {
            cacheInvalidate("sv_orders");
            loadOverlays();
            fetchOrders();
            showToast(result?.action === "start" ? "Check-in registrado!" : "Serviço concluído!");
            // Atualiza visualmente o cartão RG sem precisar recarregar a página
            if (checkinSemana.onCheckinSuccess) checkinSemana.onCheckinSuccess(checkinSemana.semanaIdx);
            setCheckinSemana(null);
          }}
        />
      )}

      {/* Modal detalhe OS — RG (cartão completo) */}
      {detailOrder && rg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)", padding: isMobile ? "8px" : "24px", overflowY: "auto" }} onClick={() => setDetailOrder(null)}>
          <div style={{ width: "100%", maxWidth: 700, background: RGT.pageBg, borderRadius: 20, padding: isMobile ? "16px" : "24px", margin: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
              <div style={{ fontSize: "0.75rem", color: RGT.textSub }}>Toque fora para fechar</div>
              <button style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer", color: RGT.verde, fontSize: "0.82rem" }} onClick={() => setDetailOrder(null)}>✕ Fechar</button>
            </div>
            <RestauraGlassCard
              order={detailOrder} theme={theme} isMobile={isMobile}
              onCheckinClick={(idx, action, onCheckinSuccess) =>
                setCheckinSemana({ order: detailOrder, semanaIdx: idx, action, onCheckinSuccess })
              }
            />
          </div>
        </div>
      )}

      {/* Modal detalhe OS — padrão (não-RG) */}
      {detailOrder && !rg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)", padding: 16 }} onClick={() => setDetailOrder(null)}>
          <div style={{ ...modalBg, borderRadius: 20, padding: isMobile ? "20px 16px" : 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: theme.textPrimary }}>{detailOrder.number}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>{detailOrder.client_name}</div>
              </div>
              <button style={{ background: theme.bgCard, border: "none", color: theme.textPrimary, width: 32, height: 32, borderRadius: 8, cursor: "pointer" }} onClick={() => setDetailOrder(null)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Status",     value: STATUS_MAP[effectiveStatus(detailOrder)]?.label },
                { label: "Total",      value: fmt(detailOrder.total)                          },
                { label: "Criado em",  value: fmtDate(detailOrder.created_at)                 },
                { label: "Concluído",  value: fmtDate(detailOrder.finished_at)                },
              ].map((f, i) => (
                <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.borderCard}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: theme.textPrimary }}>{f.value || "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: theme.textMuted, marginBottom: 12 }}>
              📍 Registros ({orderCheckins.length})
            </div>
            {loadingChk
              ? <div style={{ color: theme.textMuted, textAlign: "center", padding: 20 }}>Carregando...</div>
              : orderCheckins.length === 0
                ? <div style={{ color: theme.textMuted, textAlign: "center", padding: 20 }}>Nenhum registro ainda.</div>
                : orderCheckins.map((chk, i) => (
                  <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.borderCard}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div><div style={{ fontSize: 12, color: theme.textMuted }}>Colaborador</div><div style={{ fontWeight: 600, color: theme.textPrimary }}>{chk.user_name || "—"}</div></div>
                      {chk.duration_str && (
                        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "4px 12px", textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#64748b" }}>Duração</div>
                          <div style={{ fontWeight: 700, color: "#22c55e" }}>{chk.duration_str}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      <div><div style={{ color: theme.textMuted }}>📍 Entrada</div><div style={{ fontWeight: 600, color: theme.textPrimary }}>{chk.checkin_at ? chk.checkin_at.replace("T", " ").slice(0, 16) : "—"}</div></div>
                      <div><div style={{ color: theme.textMuted }}>🏁 Saída</div><div style={{ fontWeight: 600, color: theme.textPrimary }}>{chk.checkout_at ? chk.checkout_at.replace("T", " ").slice(0, 16) : "Em andamento..."}</div></div>
                    </div>
                  </div>
                ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setDetailOrder(null)}>Fechar</button>
              {(effectiveStatus(detailOrder) === "open" || effectiveStatus(detailOrder) === "in_progress") && (
                <button style={btnPrimary} onClick={() => { setDetailOrder(null); setCheckinOrder(detailOrder); }}>
                  {effectiveStatus(detailOrder) === "in_progress" ? "✅ Finalizar" : "📍 Check-in"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: rg ? RGT.cardBg : theme.bgModal, border: "1px solid rgba(239,68,68,0.3)", backdropFilter: rg ? RGT.cardBlur : "none", WebkitBackdropFilter: rg ? RGT.cardBlur : "none", borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", fontWeight: 700, color: "#ef4444" }}>Excluir O.S</h2>
            <p style={{ color: rg ? RGT.textSub : theme.textSecondary, marginBottom: 24 }}>Excluir <strong>{deleteConfirm.number}</strong> de <strong>{deleteConfirm.client_name}</strong>?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: isMobile ? "column" : "row" }}>
              <button style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${rg ? RGT.verdeBd : theme.borderCard}`, borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", color: rg ? RGT.text : theme.textSecondary, width: isMobile ? "100%" : "auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, right: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", background: toast.type === "error" ? "#ef4444" : toast.type === "warn" ? "#f59e0b" : (rg ? RGT.verde : theme.primaryGrad), textAlign: isMobile ? "center" : "left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}