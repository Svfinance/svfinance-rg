import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { useTheme } from "../contexts/ThemeContext";
import { PRINT_THEMES, buildPrintCSS } from "../utils/printThemes";
import { enqueueMutation, getMutationsByEntity, tmpId, saveSnapshot, getSnapshot } from "../offline/offlineDB";

const API = "https://api.svfinance.com.br/api";
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
  draft:     { label:"Rascunho",  color:"#94a3b8", bg:"rgba(148,163,184,0.12)" },
  sent:      { label:"Enviado",   color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
  approved:  { label:"Aprovado",  color:"#22c55e", bg:"rgba(34,197,94,0.12)"   },
  rejected:  { label:"Recusado",  color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
  cancelled: { label:"Cancelado", color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
};

const EMPTY_FORM = {
  client_name:"", client_email:"", client_phone:"",
  client_document:"", client_address:"",
  status:"draft", valid_until:"", payment_terms:"",
  notes:"", discount:0, client_id: null,
};

const EMPTY_CLIENT_FORM = {
  name:"", email:"", phone:"", document:"", address:"", notes:"",
};

export default function Quotes() {
  const isMobile = useIsMobile();
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [quotes, setQuotes]                 = useState([]);
  const [pending, setPending]               = useState([]); // criados offline
  const [products, setProducts]             = useState([]);
  const [clients, setClients]               = useState([]);
  const [pendingClients, setPendingClients] = useState([]); // clientes criados offline
  const [company, setCompany]               = useState({});
  const [loading, setLoading]               = useState(true);
  const [view, setView]                     = useState("list");
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [items, setItems]                   = useState([]);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);
  const [sellConfirm, setSellConfirm]       = useState(null);
  const [selling, setSelling]               = useState(false);
  const [toast, setToast]                   = useState(null);
  const [filterStatus, setFilterStatus]     = useState("all");
  const [search, setSearch]                 = useState("");
  const [printQuote, setPrintQuote]         = useState(null);
  const [printTheme, setPrintTheme]         = useState(themeId || "blue");
  const [companyModal, setCompanyModal]     = useState(false);
  const [companyForm, setCompanyForm]       = useState({});
  const [logoPreview, setLogoPreview]       = useState(null);
  const [newClientModal, setNewClientModal] = useState(false);
  const [clientForm, setClientForm]         = useState(EMPTY_CLIENT_FORM);
  const [savingClient, setSavingClient]     = useState(false);
  const logoInputRef = useRef();

  async function loadPending() {
    try {
      const q = await getMutationsByEntity("quote");
      setPending(q.map(m => ({ ...m.payload, id: m.tmp_ref, __pending: true })));
      const c = await getMutationsByEntity("client");
      setPendingClients(c.map(m => ({ ...m.payload, id: m.tmp_ref, __pending: true })));
    } catch { setPending([]); setPendingClients([]); }
  }

  async function fetchQuotes() {
    const snap = await getSnapshot("quotes");
    if (snap) setQuotes(snap);
    if (!navigator.onLine) return;
    const res  = await fetch(`${API}/quotes`, { headers:{ Authorization:`Bearer ${token()}` } });
    if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setQuotes(list);
    saveSnapshot("quotes", list);
  }
  async function fetchProducts() {
    const snap = await getSnapshot("products");
    if (snap) setProducts(snap);
    if (!navigator.onLine) return;
    const res  = await fetch(`${API}/products`, { headers:{ Authorization:`Bearer ${token()}` } });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setProducts(list);
    saveSnapshot("products", list);
  }
  async function fetchClients() {
    const snap = await getSnapshot("clients");
    if (snap) setClients(snap);
    if (!navigator.onLine) return;
    const res  = await fetch(`${API}/clients`, { headers:{ Authorization:`Bearer ${token()}` } });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setClients(list);
    saveSnapshot("clients", list);
  }
  async function fetchCompany() {
    const snap = await getSnapshot("company");
    if (snap) { setCompany(snap); setCompanyForm(snap); setLogoPreview(snap.company_logo || null); }
    if (!navigator.onLine) return;
    const res  = await fetch(`${API}/company`, { headers:{ Authorization:`Bearer ${token()}` } });
    const data = await res.json();
    setCompany(data); setCompanyForm(data);
    setLogoPreview(data.company_logo || null);
    saveSnapshot("company", data);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchQuotes(), fetchProducts(), fetchClients(), fetchCompany()]);
      await loadPending();
      setLoading(false);
    })();
    const onSynced = () => { fetchQuotes(); fetchClients(); loadPending(); };
    window.addEventListener("sv_synced", onSynced);
    return () => window.removeEventListener("sv_synced", onSynced);
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setLogoPreview(ev.target.result);
      setCompanyForm(f => ({ ...f, company_logo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  }

  async function saveCompany() {
    if (!navigator.onLine) { showToast("Dados da empresa precisam de internet.", "warn"); return; }
    const res = await fetch(`${API}/company`, {
      method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
      body: JSON.stringify(companyForm),
    });
    if (res.ok) { showToast("Dados da empresa salvos!"); setCompanyModal(false); fetchCompany(); }
    else showToast("Erro ao salvar.", "error");
  }

  function selectClient(clientId) {
    if (!clientId) {
      setForm(f => ({ ...f, client_id:null, client_name:"", client_email:"", client_phone:"", client_document:"", client_address:"" }));
      return;
    }
    const all = [...pendingClients, ...clients];
    const c = all.find(c => String(c.id)===String(clientId));
    if (!c) return;
    setForm(f => ({
      ...f,
      client_id:       c.id,
      client_name:     c.name     || "",
      client_email:    c.email    || "",
      client_phone:    c.phone    || "",
      client_document: c.document || "",
      client_address:  c.address  || "",
    }));
  }

  async function handleSaveNewClient(e) {
    e.preventDefault();
    if (!clientForm.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }
    setSavingClient(true);

    // ── OFFLINE: cria cliente com tmpId e já vincula ao orçamento ──
    if (!navigator.onLine) {
      const ref = tmpId("tmpcli");
      await enqueueMutation("client", { ...clientForm }, { tmp_ref: ref });
      setForm(f => ({
        ...f,
        client_id:       ref,
        client_name:     clientForm.name,
        client_email:    clientForm.email    || "",
        client_phone:    clientForm.phone    || "",
        client_document: clientForm.document || "",
        client_address:  clientForm.address  || "",
      }));
      showToast("📴 Cliente salvo offline e vinculado.");
      await loadPending();
      setNewClientModal(false);
      setClientForm(EMPTY_CLIENT_FORM);
      setSavingClient(false);
      return;
    }

    // ── ONLINE ──
    try {
      const res  = await fetch(`${API}/clients`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Cliente criado e selecionado!");
        await fetchClients();
        setForm(f => ({
          ...f,
          client_id:       data.id,
          client_name:     clientForm.name,
          client_email:    clientForm.email    || "",
          client_phone:    clientForm.phone    || "",
          client_document: clientForm.document || "",
          client_address:  clientForm.address  || "",
        }));
        setNewClientModal(false);
        setClientForm(EMPTY_CLIENT_FORM);
      } else {
        showToast(data.msg || "Erro ao criar cliente.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
    finally { setSavingClient(false); }
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setItems([]); setView("form"); }
  function openEdit(q) {
    if (q.__pending) { showToast("Orçamento ainda não sincronizado.", "warn"); return; }
    setEditing(q);
    setForm({ client_name:q.client_name, client_email:q.client_email||"", client_phone:q.client_phone||"", client_document:q.client_document||"", client_address:q.client_address||"", status:q.status, valid_until:q.valid_until||"", payment_terms:q.payment_terms||"", notes:q.notes||"", discount:q.discount||0, client_id:q.client_id||null });
    setItems(q.items||[]);
    setView("form");
  }

  function addItem() { setItems(prev => [...prev, { product_id:"", name:"", sku:"", unit:"un", qty:1, price:0, total:0 }]); }
  function removeItem(idx) { setItems(prev => prev.filter((_,i) => i!==idx)); }
  function updateItem(idx, fld, value) {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [fld]:value };
      if (fld==="qty"||fld==="price") next[idx].total = parseFloat(next[idx].qty||0)*parseFloat(next[idx].price||0);
      return next;
    });
  }

  function selectProduct(idx, productId) {
    const p = products.find(p => String(p.id)===String(productId));
    if (!p) return;
    setItems(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        product_id: p.id,
        name:       p.name,
        sku:        p.sku || "",
        unit:       p.unit || "un",
        price:      p.price,
        total:      parseFloat(next[idx].qty||1) * p.price,
      };
      return next;
    });
  }

  const subtotal    = items.reduce((s,i) => s+(parseFloat(i.qty||0)*parseFloat(i.price||0)), 0);
  const discountAmt = subtotal*(parseFloat(form.discount||0)/100);
  const total       = subtotal - discountAmt;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_name.trim()) { showToast("Nome do cliente obrigatório.","error"); return; }
    const payload = { ...form, discount:parseFloat(form.discount||0), items };

    // ── OFFLINE: só criação ──
    if (!navigator.onLine) {
      if (editing) { showToast("Edição precisa de internet.", "warn"); return; }
      const ref = tmpId("tmpqt");
      await enqueueMutation("quote", payload, { tmp_ref: ref });
      showToast("📴 Orçamento salvo offline — sincroniza ao reconectar.");
      setView("list");
      loadPending();
      return;
    }

    // ── ONLINE ──
    const url    = editing ? `${API}/quotes/${editing.id}` : `${API}/quotes`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
      if (res.ok) { showToast(editing?"Orçamento atualizado!":"Orçamento criado!"); setView("list"); fetchQuotes(); }
      else { const err = await res.json(); showToast(err.msg||"Erro.","error"); }
    } catch {
      if (!editing) {
        const ref = tmpId("tmpqt");
        await enqueueMutation("quote", payload, { tmp_ref: ref });
        showToast("📴 Conexão instável — orçamento salvo offline.");
        setView("list");
        loadPending();
      } else {
        showToast("Erro de conexão.","error");
      }
    }
  }

  async function changeStatus(q, status) {
    if (q.__pending) { showToast("Orçamento ainda não sincronizado.", "warn"); return; }
    if (!navigator.onLine) { showToast("Mudar status precisa de internet.", "warn"); return; }
    await fetch(`${API}/quotes/${q.id}/status`, { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify({ status }) });
    fetchQuotes();
  }

  async function handleDelete(id) {
    if (String(id).startsWith("tmp")) { showToast("Item offline ainda não sincronizado.", "warn"); setDeleteConfirm(null); return; }
    if (!navigator.onLine) { showToast("Exclusão precisa de internet.", "warn"); setDeleteConfirm(null); return; }
    const res = await fetch(`${API}/quotes/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
    if (res.ok) { showToast("Orçamento removido."); setDeleteConfirm(null); fetchQuotes(); }
    else showToast("Erro ao remover.","error");
  }

  async function handleSell(quote) {
    if (quote.__pending) { showToast("Orçamento ainda não sincronizado.", "warn"); return; }
    if (!navigator.onLine) { showToast("Vender precisa de internet.", "warn"); return; }
    setSelling(true);
    try {
      const headers = { "Content-Type":"application/json", Authorization:`Bearer ${token()}` };

      if (quote.status !== "approved") {
        await fetch(`${API}/quotes/${quote.id}/status`, {
          method:"PATCH", headers, body:JSON.stringify({ status:"approved" }),
        });
      }

      const resOrder = await fetch(`${API}/orders/from-quote/${quote.id}`, {
        method:"POST", headers,
      });
      const orderData = await resOrder.json();
      if (!resOrder.ok && resOrder.status !== 200) {
        showToast(orderData.msg || "Erro ao criar venda.", "error");
        return;
      }
      const orderId     = orderData.id;
      const orderNumber = orderData.number;

      const resComplete = await fetch(`${API}/orders/${orderId}/complete`, {
        method:"POST", headers,
      });
      const completeData = await resComplete.json();
      if (!resComplete.ok) {
        showToast(completeData.msg || "Erro ao concluir venda.", "error");
        return;
      }

      showToast(`✅ ${orderNumber} concluída! Estoque baixado e transação registrada.`);
      setSellConfirm(null);
      fetchQuotes();
      setTimeout(() => navigate("/sales"), 1500);
    } catch { showToast("Erro de conexão.","error"); }
    finally { setSelling(false); }
  }

  function openPrint(q) {
    if (q.__pending) { showToast("Orçamento ainda não sincronizado.", "warn"); return; }
    setPrintQuote(q); setView("print");
  }

  function handlePrint() {
    if (!printQuote) return;
    const T   = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    const q   = printQuote;
    const sub = q.subtotal || 0;
    const disc = q.discount > 0 ? sub * q.discount / 100 : 0;

    const fmtV = v => (v||0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
    const fmtD = d => { if (!d) return "—"; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };
    const STATUS_LABELS = { draft:"Rascunho", sent:"Enviado", approved:"Aprovado", rejected:"Recusado", cancelled:"Cancelado" };

    const logoHtml = company.company_logo
      ? `<img src="${company.company_logo}" alt="Logo"/>`
      : `<span class="logo-placeholder">📄<br/>LOGO</span>`;

    const itemRows = (q.items || []).map((item, idx) => `
      <tr>
        <td class="muted">${idx + 1}</td>
        <td>${item.name || "—"}</td>
        <td class="mono">${item.sku || "—"}</td>
        <td class="muted">${item.unit || "un"}</td>
        <td class="muted">${item.qty}</td>
        <td class="right muted">${fmtV(item.price)}</td>
        <td class="right income">${fmtV(parseFloat(item.qty||0) * parseFloat(item.price||0))}</td>
      </tr>
    `).join("");

    const extraCards = [
      q.payment_terms ? `<div style="background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:10px;padding:14px 16px"><div class="section-title" style="margin-bottom:6px">Condições de Pagamento</div><div style="font-size:11px;color:${T.mutedColor};line-height:1.6">${q.payment_terms}</div></div>` : "",
      q.notes         ? `<div style="background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:10px;padding:14px 16px"><div class="section-title" style="margin-bottom:6px">Observações</div><div style="font-size:11px;color:${T.mutedColor};line-height:1.6">${q.notes}</div></div>` : "",
    ].filter(Boolean).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Orçamento ${q.number} — ${q.client_name}</title>
  <style>${buildPrintCSS(T)}</style>
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
          <div class="company-name">${company.company_name || "Sua Empresa"}</div>
          <div class="company-meta">
            ${company.company_cnpj ? `CNPJ: ${company.company_cnpj}<br/>` : ""}
            ${company.company_address || ""}
          </div>
        </div>
      </div>
      <div>
        <div class="doc-title">ORÇAMENTO</div>
        <div class="doc-subtitle">
          Nº ${q.number}<br/>
          Emitido em: ${fmtD(q.created_at)}<br/>
          ${q.valid_until ? `Válido até: ${fmtD(q.valid_until)}<br/>` : ""}
          Status: ${STATUS_LABELS[q.status] || q.status}
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-title">Para</div>
    <div class="info-grid">
      <div class="info-cell"><div class="label">Nome</div><div class="value">${q.client_name}</div></div>
      ${q.client_document ? `<div class="info-cell"><div class="label">CPF/CNPJ</div><div class="value">${q.client_document}</div></div>` : ""}
      ${q.client_email    ? `<div class="info-cell"><div class="label">E-mail</div><div class="value">${q.client_email}</div></div>`    : ""}
      ${q.client_phone    ? `<div class="info-cell"><div class="label">Telefone</div><div class="value">${q.client_phone}</div></div>`  : ""}
      ${q.client_address  ? `<div class="info-cell" style="grid-column:1/-1"><div class="label">Endereço</div><div class="value">${q.client_address}</div></div>` : ""}
    </div>

    <div class="section-title">Itens do Orçamento</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Descrição</th>
          <th>SKU</th>
          <th>Unid.</th>
          <th>Qtd.</th>
          <th class="right">Preço Unit.</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals-box">
      <div class="totals-inner">
        <div class="totals-row"><span>Subtotal</span><span>${fmtV(sub)}</span></div>
        ${q.discount > 0 ? `<div class="totals-row discount"><span>Desconto (${q.discount}%)</span><span>- ${fmtV(disc)}</span></div>` : ""}
        <div class="totals-row final"><span>TOTAL</span><span>${fmtV(q.total)}</span></div>
      </div>
    </div>

    ${extraCards ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">${extraCards}</div>` : ""}

    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-line">
          <div class="sign-name">${company.company_name || "Responsável"}</div>
          <div class="sign-label">Assinatura</div>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      SV Finance Control &nbsp;·&nbsp; Gerado em ${new Date().toLocaleDateString("pt-BR")}
    </div>
    <div class="accent-bar-bottom"></div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  const allQuotes = [...pending, ...quotes];
  const filteredQuotes = allQuotes.filter(q => {
    const statusOk = filterStatus==="all" || q.status===filterStatus;
    const searchOk = (q.client_name||"").toLowerCase().includes(search.toLowerCase()) || (q.number||"").toLowerCase().includes(search.toLowerCase());
    return statusOk && searchOk;
  });

  // ── estilos compartilhados ────────────────────────────────────────
  const glassModal   = isGlass ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" } : { background:theme.bgModal, border:`1px solid ${theme.borderCard}` };
  const btnPrimary   = { background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}33`, whiteSpace:"nowrap" };
  const btnSecondary = { background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" };
  const filterBtn       = { background:isGlass?"rgba(255,255,255,0.2)":theme.bgCard, color:theme.textMuted, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer", ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
  const filterBtnActive = { background:isGlass?"rgba(255,255,255,0.45)":`${theme.primary}33`, color:theme.primary, border:`1px solid ${isGlass?"rgba(255,255,255,0.7)":`${theme.primary}66`}` };
  const th           = { textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" };
  const td           = { padding:"12px 16px", verticalAlign:"middle" };
  const btnAction    = { background:isGlass?"rgba(255,255,255,0.25)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" };
  const emptyState   = { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted };
  const overlay      = { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" };
  const btnClose     = { background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 };
  const fieldStyle   = { display:"flex", flexDirection:"column", gap:6 };
  const labelStyle   = { color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 };
  const inputStyle   = { background:theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
  const selectStyle  = { background:isGlass?"rgba(255,255,255,0.3)":theme.bgSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", colorScheme, cursor:"pointer", ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
  const sectionLabel = { fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 14px 2px", display:"flex", alignItems:"center", gap:8 };
  const formCard     = { background:isGlass?"rgba(255,255,255,0.2)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:14, padding:24, ...(isGlass&&{backdropFilter:"blur(18px) saturate(180%)",WebkitBackdropFilter:"blur(18px) saturate(180%)"}) };
  const toastStyle   = { position:"fixed", bottom:28, color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", maxWidth:"400px" };

  if (loading) return <h2 style={{ color:theme.textPrimary, padding:20 }}>Carregando...</h2>;

  // ══════════════════════════════
  // VIEW: IMPRESSÃO
  // ══════════════════════════════
  if (view === "print" && printQuote) {
    const T = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    return (
      <div style={{ background:T.pageBg, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <div style={{ background:T.barBg, borderBottom:`1px solid ${T.barBorder}`, padding:"12px 24px", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => setView("list")} style={{ background:T.backBtn, color:T.backColor, border:`1px solid rgba(255,255,255,0.12)`, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:"0.88rem" }}>
            ← Voltar
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>Tema PDF:</span>
            {Object.values(PRINT_THEMES).map(t => (
              <button key={t.id} onClick={() => setPrintTheme(t.id)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${printTheme===t.id?"#3b82f6":"rgba(255,255,255,0.15)"}`, background:printTheme===t.id?"rgba(59,130,246,0.2)":"transparent", color:printTheme===t.id?"#60a5fa":"#94a3b8", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>

          <button onClick={handlePrint} style={{ background:T.printBtn, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:"0.9rem", boxShadow:`0 4px 15px ${T.printShadow}`, marginLeft:"auto" }}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
          <div style={{ background:T.cardBg, border:`1px solid ${T.accentBorder}`, borderRadius:20, padding:"40px 48px", textAlign:"center", maxWidth:420 }}>
            <div style={{ fontSize:"3.5rem", marginBottom:16 }}>🖨️</div>
            <div style={{ color:T.titleColor, fontWeight:800, fontSize:18, marginBottom:8 }}>
              Orçamento {printQuote.number}
            </div>
            <div style={{ color:T.mutedColor, fontSize:13, marginBottom:6 }}>{printQuote.client_name}</div>
            <div style={{ color:T.accent, fontWeight:800, fontSize:22, marginBottom:20 }}>
              {(printQuote.total||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
            </div>
            <div style={{ color:T.mutedColor, fontSize:12, lineHeight:1.7 }}>
              Selecione o tema acima e clique em<br/>
              <strong style={{ color:T.titleColor }}>🖨️ Imprimir / Salvar PDF</strong><br/>
              para abrir o documento completo
            </div>
            <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:8, fontSize:11, color:T.mutedColor, textAlign:"left", background:T.accentLight, border:`1px solid ${T.accentBorder}`, borderRadius:10, padding:"12px 16px" }}>
              <div>📄 {(printQuote.items||[]).length} item(ns) no orçamento</div>
              {printQuote.discount > 0 && <div>🏷️ Desconto de {printQuote.discount}% aplicado</div>}
              {printQuote.valid_until && <div>📅 Válido até {fmtDate(printQuote.valid_until)}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════
  // VIEW: FORMULÁRIO
  // ══════════════════════
  if (view==="form") {
    return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>
          <div style={{ marginBottom:24 }}>
            <button style={{ ...btnSecondary, marginBottom:12, fontSize:"0.82rem" }} onClick={() => setView("list")}>← Voltar</button>
            <h1 style={{ fontSize:isMobile?"1.3rem":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>{editing?"Editar Orçamento":"Novo Orçamento"}</h1>
            {editing && <p style={{ color:theme.textMuted, margin:"4px 0 0" }}>{editing.number}</p>}
          </div>

          {!navigator.onLine && (
            <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", padding:"10px 16px", borderRadius:10, fontSize:13, marginBottom:20 }}>
              📴 Offline — o orçamento será salvo e sincronizado ao reconectar. Você pode até criar um cliente novo offline.
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* CLIENTE */}
            <div style={{ marginBottom:28 }}>
              <p style={sectionLabel}>👤 Dados do Cliente</p>
              <div style={formCard}>
                <div style={{ ...fieldStyle, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <label style={labelStyle}>Selecionar cliente cadastrado</label>
                    <button type="button" onClick={() => setNewClientModal(true)} style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>+ Novo Cliente</button>
                  </div>
                  <select style={selectStyle} value={form.client_id||""} onChange={e => selectClient(e.target.value)}>
                    <option value="">— Digite manualmente ou selecione —</option>
                    {pendingClients.map(c => <option key={c.id} value={c.id}>⏳ {c.name}{c.document?` — ${c.document}`:""} (offline)</option>)}
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.document?` — ${c.document}`:""}</option>)}
                  </select>
                </div>
                <div style={{ height:1, background:`linear-gradient(90deg,transparent,${theme.borderCard},transparent)`, margin:"0 0 16px" }} />
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:16 }}>
                  <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"1 / -1" }}>
                    <label style={labelStyle}>Nome do Cliente *</label>
                    <input style={inputStyle} required placeholder="Nome completo ou razão social" value={form.client_name} onChange={e => setForm({...form,client_name:e.target.value,client_id:null})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>CPF / CNPJ</label>
                    <input style={inputStyle} placeholder="000.000.000-00" value={form.client_document} onChange={e => setForm({...form,client_document:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Telefone</label>
                    <input style={inputStyle} placeholder="(44) 99999-9999" value={form.client_phone} onChange={e => setForm({...form,client_phone:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>E-mail</label>
                    <input style={inputStyle} type="email" placeholder="cliente@email.com" value={form.client_email} onChange={e => setForm({...form,client_email:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} />
                  </div>
                  <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"2 / -1" }}>
                    <label style={labelStyle}>Endereço</label>
                    <input style={inputStyle} placeholder="Rua, número, cidade..." value={form.client_address} onChange={e => setForm({...form,client_address:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} />
                  </div>
                </div>
              </div>
            </div>

            {/* CONDIÇÕES */}
            <div style={{ marginBottom:28 }}>
              <p style={sectionLabel}>📋 Condições do Orçamento</p>
              <div style={formCard}>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:16 }}>
                  <div style={fieldStyle}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({...form,status:e.target.value})}>{Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div style={fieldStyle}><label style={labelStyle}>Válido até</label><input style={inputStyle} type="date" value={form.valid_until} onChange={e => setForm({...form,valid_until:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>Desconto Global (%)</label><input style={inputStyle} type="number" min="0" max="100" step="0.1" placeholder="0" value={form.discount} onChange={e => setForm({...form,discount:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} /></div>
                  <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"1 / -1" }}><label style={labelStyle}>Condições de Pagamento</label><input style={inputStyle} placeholder="Ex: 50% na aprovação, 50% na entrega" value={form.payment_terms} onChange={e => setForm({...form,payment_terms:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} /></div>
                  <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"1 / -1" }}><label style={labelStyle}>Observações</label><textarea style={{ ...inputStyle, resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=theme.borderCard} /></div>
                </div>
              </div>
            </div>

            {/* ITENS */}
            <div style={{ marginBottom:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <p style={{ ...sectionLabel, marginBottom:0 }}>📦 Itens do Orçamento</p>
                <button type="button" style={{ ...btnSecondary, fontSize:"0.82rem", padding:"7px 14px" }} onClick={addItem}>+ Adicionar Item</button>
              </div>
              {items.length===0 ? (
                <div style={{ ...formCard, textAlign:"center", color:theme.textMuted, padding:"32px" }}>Nenhum item adicionado. Clique em "+ Adicionar Item".</div>
              ) : (
                <div style={formCard}>
                  {!isMobile && (
                    <div style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${theme.borderCard}`, color:theme.textMuted, fontSize:"0.75rem", fontWeight:600, textTransform:"uppercase", marginBottom:12 }}>
                      <span style={{ flex:3 }}>Produto / Serviço</span>
                      <span style={{ flex:1 }}>Unid.</span>
                      <span style={{ flex:1 }}>Qtd.</span>
                      <span style={{ flex:1.5 }}>Preço Unit.</span>
                      <span style={{ flex:1.5 }}>Total</span>
                      <span style={{ width:36 }}></span>
                    </div>
                  )}
                  {items.map((item,idx) => (
                    <div key={idx} style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:10, marginBottom:16, padding:isMobile?"16px":"0", background:isMobile?(isGlass?"rgba(255,255,255,0.15)":theme.bgCard):"transparent", borderRadius:isMobile?10:0, border:isMobile?`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`:"none" }}>
                      <div style={{ flex:3 }}>
                        <select style={{ ...selectStyle, marginBottom:4 }} value={item.product_id||""} onChange={e => selectProduct(idx,e.target.value)}>
                          <option value="">— Selecione ou digite —</option>
                          {products.filter(p=>p.active).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({fmt(p.price)}){p.sku?` · ${p.sku}`:""}
                            </option>
                          ))}
                        </select>
                        <input style={{ ...inputStyle, fontSize:"0.8rem" }} placeholder="Ou descreva manualmente" value={item.name} onChange={e => updateItem(idx,"name",e.target.value)} />
                        {item.sku && (
                          <div style={{ fontSize:"0.72rem", color:theme.textMuted, paddingLeft:4, marginTop:4, fontFamily:"monospace" }}>SKU: {item.sku}</div>
                        )}
                      </div>
                      <div style={{ flex:1 }}>{isMobile&&<label style={labelStyle}>Unid.</label>}<input style={inputStyle} value={item.unit} onChange={e => updateItem(idx,"unit",e.target.value)} /></div>
                      <div style={{ flex:1 }}>{isMobile&&<label style={labelStyle}>Qtd.</label>}<input style={inputStyle} type="number" min="1" step="0.01" value={item.qty} onChange={e => updateItem(idx,"qty",e.target.value)} /></div>
                      <div style={{ flex:1.5 }}>{isMobile&&<label style={labelStyle}>Preço</label>}<input style={inputStyle} type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(idx,"price",e.target.value)} /></div>
                      <div style={{ flex:1.5, color:theme.income, fontWeight:700, display:"flex", alignItems:"center", fontSize:"0.95rem" }}>
                        {isMobile&&<label style={{ ...labelStyle, marginRight:8 }}>Total:</label>}
                        {fmt(parseFloat(item.qty||0)*parseFloat(item.price||0))}
                      </div>
                      <button type="button" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", color:"#ef4444", width:isMobile?"100%":36, height:isMobile?"auto":36 }} onClick={() => removeItem(idx)}>
                        {isMobile?"Remover item":"✕"}
                      </button>
                    </div>
                  ))}
                  <div style={{ borderTop:`1px solid ${theme.borderCard}`, marginTop:16, paddingTop:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.95rem" }}><span style={{ color:theme.textSecondary }}>Subtotal</span><span style={{ color:theme.textPrimary }}>{fmt(subtotal)}</span></div>
                    {parseFloat(form.discount)>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, color:"#ef4444", fontSize:"0.95rem" }}><span>Desconto ({form.discount}%)</span><span>- {fmt(discountAmt)}</span></div>}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"1.2rem", fontWeight:700, color:theme.primary, borderTop:`1px solid ${theme.borderCard}`, paddingTop:12, marginTop:4 }}><span>TOTAL</span><span>{fmt(total)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginBottom:48, flexDirection:isMobile?"column":"row" }}>
              <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={() => setView("list")}>Cancelar</button>
              <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar Orçamento"}</button>
            </div>
          </form>
        </div>

        {/* MODAL NOVO CLIENTE */}
        {newClientModal && (
          <div style={overlay} onClick={() => setNewClientModal(false)}>
            <div style={{ ...glassModal, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>👤 Novo Cliente</h2>
                <button style={btnClose} onClick={() => setNewClientModal(false)}>✕</button>
              </div>
              {!navigator.onLine && (
                <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:16 }}>
                  📴 Offline — cliente será salvo e vinculado ao orçamento; sincroniza depois.
                </div>
              )}
              <form onSubmit={handleSaveNewClient}>
                <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
                  <div style={fieldStyle}><label style={labelStyle}>Nome *</label><input style={inputStyle} required placeholder="Nome completo ou razão social" value={clientForm.name} onChange={e=>setClientForm({...clientForm,name:e.target.value})} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" placeholder="cliente@email.com" value={clientForm.email} onChange={e=>setClientForm({...clientForm,email:e.target.value})} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>Telefone</label><input style={inputStyle} placeholder="(44) 99999-9999" value={clientForm.phone} onChange={e=>setClientForm({...clientForm,phone:e.target.value})} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>CPF / CNPJ</label><input style={inputStyle} placeholder="000.000.000-00" value={clientForm.document} onChange={e=>setClientForm({...clientForm,document:e.target.value})} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>Endereço</label><input style={inputStyle} placeholder="Rua, número, cidade..." value={clientForm.address} onChange={e=>setClientForm({...clientForm,address:e.target.value})} /></div>
                  <div style={fieldStyle}><label style={labelStyle}>Observações</label><textarea style={{ ...inputStyle, resize:"vertical", minHeight:60 }} placeholder="Informações adicionais..." value={clientForm.notes} onChange={e=>setClientForm({...clientForm,notes:e.target.value})} /></div>
                </div>
                <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row", justifyContent:"flex-end" }}>
                  <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={() => setNewClientModal(false)}>Cancelar</button>
                  <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto", opacity:savingClient?0.6:1 }} disabled={savingClient}>{savingClient?"Salvando...":"Criar e Selecionar"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toast && <div style={{ ...toastStyle, background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":"#22c55e", right:28 }}>{toast.msg}</div>}
      </PageLayout>
    );
  }

  // ══════════════════════
  // VIEW: LISTA
  // ══════════════════════
  return (
    <PageLayout>
      <style>{`
        .card3d-q { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"}; position:relative; overflow:hidden; cursor:default; }
        .card3d-q::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-q:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.5)"}; }
        .table3d-q { background:${theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(4px);"} }
        .q-row:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0f`} !important; }
        .btn-sell { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.82rem; font-weight:700; white-space:nowrap; box-shadow:0 4px 12px rgba(34,197,94,0.4); transition:transform 0.15s, box-shadow 0.15s; }
        .btn-sell:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(34,197,94,0.5); }
        @media (max-width:768px) { .card3d-q { transform:none !important; } .card3d-q:hover { transform:translateY(-6px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Orçamentos</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Crie e gerencie seus orçamentos</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <button style={{ ...btnSecondary, fontSize:"0.85rem" }} onClick={() => setCompanyModal(true)}>⚙️ {isMobile?"Empresa":"Minha Empresa"}</button>
            <button style={btnPrimary} onClick={openCreate}>+ {isMobile?"Novo":"Novo Orçamento"}</button>
          </div>
        </div>

        {!navigator.onLine && (
          <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", padding:"10px 16px", borderRadius:10, fontSize:13, marginBottom:20 }}>
            📴 Você está offline. Novos orçamentos serão salvos e sincronizados ao reconectar.
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"📋", label:"Total",          value:allQuotes.length,                                                         color:theme.primary, border:isGlass?"rgba(255,255,255,0.5)":`${theme.primary}33` },
            { icon:"✅", label:"Aprovados",      value:quotes.filter(q=>q.status==="approved").length,                          color:"#22c55e",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.2)"  },
            { icon:"⏳", label:"Pendentes (offline)", value:pending.length,                                                     color:"#f59e0b",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(245,158,11,0.2)" },
            { icon:"💰", label:"Total Aprovado", value:fmt(quotes.filter(q=>q.status==="approved").reduce((s,q)=>s+q.total,0)), color:"#22c55e",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.2)"  },
          ].map((c,i) => (
            <div key={i} className="card3d-q" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          <input style={{ background:theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:10, padding:"8px 14px", color:theme.textPrimary, fontSize:"0.88rem", outline:"none", width:isMobile?"100%":"280px", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) }}
            type="text" placeholder="🔍 Buscar por cliente ou número..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["all",...Object.keys(STATUS_MAP)].map(s => (
              <button key={s} style={{ ...filterBtn, ...(filterStatus===s?filterBtnActive:{}) }} onClick={() => setFilterStatus(s)}>
                {s==="all"?"Todos":STATUS_MAP[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="table3d-q">
          {filteredQuotes.length===0 ? (
            <div style={emptyState}><span style={{ fontSize:"2rem" }}>📭</span><p>Nenhum orçamento encontrado</p></div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth:isMobile?"520px":"unset" }}>
              <thead>
                <tr>{(isMobile?["Número","Cliente","Status","Total","Ações"]:["Número","Cliente","Status","Itens","Total","Válido até","Criado em","Ações"]).map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredQuotes.map(q => {
                  const st         = STATUS_MAP[q.status]||STATUS_MAP.draft;
                  return (
                    <tr key={q.id} className="q-row" style={{ borderBottom:`1px solid ${theme.borderCard}`, transition:"background 0.15s", opacity:q.__pending?0.85:1 }}>
                      <td style={{ ...td, fontWeight:700, color:theme.primary }}>
                        {q.number || "—"}
                        {q.__pending && <span style={{ marginLeft:6, fontSize:9, background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", borderRadius:6, padding:"1px 6px", fontWeight:700 }}>⏳</span>}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight:600, color:theme.textPrimary }}>{q.client_name}</div>
                        {!isMobile&&q.client_email&&<div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{q.client_email}</div>}
                      </td>
                      <td style={td}>
                        {q.__pending ? (
                          <span style={{ fontSize:"0.72rem", fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(245,158,11,0.12)", color:"#f59e0b" }}>Aguardando sync</span>
                        ) : (
                          <select style={{ border:"none", borderRadius:20, padding:"4px 10px", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", colorScheme, outline:"none", color:st.color, background:st.bg }} value={q.status} onChange={e => changeStatus(q,e.target.value)}>
                            {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </td>
                      {!isMobile&&<td style={{ ...td, color:theme.textSecondary }}>{(q.items||[]).length} itens</td>}
                      <td style={{ ...td, fontWeight:700, color:"#22c55e" }}>{fmt(q.total)}</td>
                      {!isMobile&&<td style={{ ...td, color:theme.textSecondary }}>{fmtDate(q.valid_until)}</td>}
                      {!isMobile&&<td style={{ ...td, color:theme.textMuted }}>{fmtDate(q.created_at)}</td>}
                      <td style={td}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {!q.__pending && q.status !== "cancelled" && q.status !== "rejected" && <button className="btn-sell" onClick={() => setSellConfirm(q)}>🛒 Vender</button>}
                          {!q.__pending && <button style={btnAction} onClick={() => openPrint(q)}>🖨️</button>}
                          {!q.__pending && <button style={btnAction} onClick={() => openEdit(q)}>✏️</button>}
                          <button style={{ ...btnAction, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }} onClick={() => setDeleteConfirm(q)}>🗑️</button>
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

      {/* MODAL VENDER */}
      {sellConfirm && (
        <div style={overlay} onClick={() => !selling&&setSellConfirm(null)}>
          <div style={{ ...glassModal, border:isGlass?"1px solid rgba(34,197,94,0.4)":`1px solid rgba(34,197,94,0.3)`, borderRadius:18, padding:isMobile?"28px 20px":36, width:isMobile?"92%":"100%", maxWidth:460, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>🛒</div>
              <h2 style={{ margin:"0 0 8px", fontSize:"1.3rem", fontWeight:700, color:theme.textPrimary }}>Confirmar Venda</h2>
              <p style={{ color:theme.textMuted, margin:0, fontSize:"0.9rem" }}>
                Converter <strong style={{ color:theme.textPrimary }}>{sellConfirm.number}</strong> em venda concluída?
              </p>
              {sellConfirm.status !== "approved" && (
                <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:10, padding:"8px 14px", marginTop:10, fontSize:12, color:"#f59e0b", display:"flex", gap:8, alignItems:"center" }}>
                  ⚡ O status será alterado para <strong>Aprovado</strong> automaticamente
                </div>
              )}
            </div>
            <div style={{ background:isGlass?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.88rem" }}><span style={{ color:theme.textMuted }}>Cliente</span><span style={{ color:theme.textPrimary, fontWeight:600 }}>{sellConfirm.client_name}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.88rem" }}><span style={{ color:theme.textMuted }}>Itens</span><span style={{ color:theme.textPrimary }}>{(sellConfirm.items||[]).length} item(ns)</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(34,197,94,0.2)", paddingTop:10, marginTop:4 }}><span style={{ color:"#22c55e", fontWeight:700 }}>Total</span><span style={{ color:"#22c55e", fontWeight:700, fontSize:"1.1rem" }}>{fmt(sellConfirm.total)}</span></div>
            </div>
            <p style={{ color:theme.textMuted, fontSize:"0.82rem", textAlign:"center", marginBottom:20 }}>O orçamento será <strong style={{color:"#22c55e"}}>aprovado</strong>, a venda criada e <strong style={{color:"#22c55e"}}>concluída automaticamente</strong>. Estoque será baixado e a transação lançada.</p>
            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row" }}>
              <button style={{ ...btnSecondary, flex:1 }} onClick={() => setSellConfirm(null)} disabled={selling}>Cancelar</button>
              <button style={{ flex:2, background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", border:"none", borderRadius:10, padding:"12px 20px", fontWeight:700, cursor:selling?"not-allowed":"pointer", fontSize:"1rem", boxShadow:"0 4px 15px rgba(34,197,94,0.4)", opacity:selling?0.7:1 }} onClick={() => handleSell(sellConfirm)} disabled={selling}>
                {selling?"⏳ Processando...":"🛒 Confirmar e Concluir Venda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMPRESA */}
      {companyModal && (
        <div style={overlay} onClick={() => setCompanyModal(false)}>
          <div style={{ ...glassModal, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:620, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>⚙️ Dados da Empresa</h2>
              <button style={btnClose} onClick={() => setCompanyModal(false)}>✕</button>
            </div>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              {logoPreview ? <img src={logoPreview} alt="logo" style={{ maxWidth:180, maxHeight:80, objectFit:"contain", borderRadius:8, marginBottom:8 }} /> : <div style={{ width:180, height:80, background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:theme.textMuted, margin:"0 auto 8px" }}>Sem logo</div>}
              <br />
              <button style={{ ...btnSecondary, fontSize:"0.82rem" }} onClick={() => logoInputRef.current.click()}>📁 Upload da Logo</button>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoChange} />
              <div style={{ fontSize:"0.75rem", color:theme.textMuted, marginTop:6 }}>PNG, JPG ou SVG • Máx 2MB</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
              <div style={{ ...fieldStyle, gridColumn:"1 / -1" }}><label style={labelStyle}>Nome da Empresa</label><input style={inputStyle} placeholder="Sua Empresa LTDA" value={companyForm.company_name||""} onChange={e => setCompanyForm({...companyForm,company_name:e.target.value})} /></div>
              <div style={fieldStyle}><label style={labelStyle}>CNPJ</label><input style={inputStyle} placeholder="00.000.000/0001-00" value={companyForm.company_cnpj||""} onChange={e => setCompanyForm({...companyForm,company_cnpj:e.target.value})} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Endereço</label><input style={inputStyle} placeholder="Rua, número, cidade - UF" value={companyForm.company_address||""} onChange={e => setCompanyForm({...companyForm,company_address:e.target.value})} /></div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
              <button style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={() => setCompanyModal(false)}>Cancelar</button>
              <button style={{ ...btnPrimary, width:isMobile?"100%":"auto" }} onClick={saveCompany}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...glassModal, border:isGlass?"1px solid rgba(239,68,68,0.3)":`1px solid rgba(239,68,68,0.3)`, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Orçamento</h2>
              <button style={btnClose} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>Excluir <strong style={{ color:theme.textPrimary }}>{deleteConfirm.number || "este orçamento"}</strong> de <strong style={{ color:theme.textPrimary }}>{deleteConfirm.client_name}</strong>?</p>
            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ ...toastStyle, background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":"#22c55e", left:isMobile?16:"auto", right:isMobile?16:28, textAlign:isMobile?"center":"left" }}>{toast.msg}</div>}
    </PageLayout>
  );
}
