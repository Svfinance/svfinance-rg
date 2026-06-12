/**
 * Clients.jsx
 *
 * Correções aplicadas (11/06/2026 — PR2):
 *  - Fix 1: cleanup AbortController no useEffect de buscarProximoCodigo
 *  - Fix 2: submittingRef bloqueia duplo disparo "Criar Cliente e Cartão"
 *  - Fix 3: geocode-cep passa `numero` junto com o CEP para melhor precisão
 *  - Fix 3: feedback visual diferenciado por precisão do GPS
 *           📍 verde  = endereço completo (confiável)
 *           🟡 amarelo = logradouro sem número (aproximado)
 *           ⚠️ laranja = só cidade (impreciso — admin deve salvar no local)
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { enqueueMutation, getMutationsByEntity, tmpId, saveSnapshot, getSnapshot } from "../offline/offlineDB";
import { isRG } from "../utils/isRG";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

const QR_UNIVERSAL_TOKEN = "sv-checkin-universal";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const DIAS_SEMANA = [
  { value: "0", label: "Dom" }, { value: "1", label: "Seg" },
  { value: "2", label: "Ter" }, { value: "3", label: "Qua" },
  { value: "4", label: "Qui" }, { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

const EMPTY_FORM = {
  codigo: "", name: "", emails: [""], phones: [""], document: "", cnpj: "",
  address: "", notes: "",
  cep: "", logradouro: "", numero: "", bairro: "", municipio: "", uf: "",
  contrato_tipo: "avulso", contrato_valor: "", contrato_forma_pagamento: "",
  contrato_dia_pagamento: "", contrato_inicio: "", contrato_fim: "",
  contrato_status: "ativo", contrato_dias_semana: "", contrato_observacoes: "",
  contrato_modelo: "", recorrencia: "",
};

export default function Clients() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();
  const rg          = isRG();

  const QR_IMG_URL = `https://quickchart.io/qr?text=${encodeURIComponent(QR_UNIVERSAL_TOKEN)}&size=280&margin=2&ecLevel=H&dark=0a0f1e&light=ffffff`;

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [clients,         setClients]         = useState([]);
  const [pending,         setPending]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editing,         setEditing]         = useState(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState(null);
  const [detailClient,    setDetailClient]    = useState(null);
  const [detailModal,     setDetailModal]     = useState(false);
  const [qrModal,         setQrModal]         = useState(false);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [toast,           setToast]           = useState(null);
  const [cepLoading,      setCepLoading]      = useState(false);
  const [geoStatus,       setGeoStatus]       = useState(null); // null | 'numero' | 'logradouro' | 'cidade' | 'warn'
  const [criarCartaoApos, setCriarCartaoApos] = useState(false);
  const [filterFreqCli,   setFilterFreqCli]   = useState("all");
  const [codigoConflito,  setCodigoConflito]  = useState(null);
  const [detailTabCartao, setDetailTabCartao] = useState(false);
  const [filtroMesCartao, setFiltroMesCartao] = useState("");

  // Pop-up pós-criação de cliente
  const [popupPosCliente, setPopupPosCliente] = useState(null); // { id, name }

  // CORREÇÃO Fix 2: guard contra duplo disparo no botão "Criar Cliente e Cartão"
  // useRef não causa re-render — só bloqueia re-entrada
  const submittingRef = useRef(false);

  // ── Código automático — reativo ───────────────────────────────────────────
  const [proximoCodigo, setProximoCodigo] = useState("");

  async function buscarProximoCodigo() {
    if (!navigator.onLine) return;
    try {
      const res  = await fetch(`${API}/clients/proximo-codigo`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      const novo = data.codigo || "";
      setProximoCodigo(novo);
      return novo;
    } catch {
      return "";
    }
  }

  // CORREÇÃO Fix 1: AbortController cancela fetch pendente ao desmontar
  // Evita warning "Can't perform a React state update on an unmounted component"
  useEffect(() => {
    const controller = new AbortController();
    async function buscarInicial() {
      if (!navigator.onLine) return;
      try {
        const res  = await fetch(`${API}/clients/proximo-codigo`, {
          headers: { Authorization: `Bearer ${token()}` },
          signal:  controller.signal,
        });
        const data = await res.json();
        setProximoCodigo(data.codigo || "");
      } catch (e) {
        if (e.name !== "AbortError") console.error("buscarProximoCodigo:", e);
      }
    }
    buscarInicial();
    return () => controller.abort();
  }, []);

  // ── Dados ─────────────────────────────────────────────────────────────────
  async function loadPending() {
    try {
      const muts = await getMutationsByEntity("client");
      setPending(muts.map(m => ({ ...m.payload, id: m.tmp_ref, __pending: true })));
    } catch { setPending([]); }
  }

  async function fetchClients() {
    setLoading(true);
    const snap = await getSnapshot("clients");
    if (snap) { setClients(snap); setLoading(false); }
    await loadPending();
    if (!navigator.onLine) { setLoading(false); return; }
    try {
      const res  = await fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      saveSnapshot("clients", list);
    } catch {}
    finally { setLoading(false); }
  }

  async function fetchDetail(id) {
    if (String(id).startsWith("tmp")) {
      const p = pending.find(x => x.id === id);
      if (p) { setDetailClient({ ...p, quotes: [], orders: [] }); setDetailModal(true); }
      return;
    }
    try {
      const res  = await fetch(`${API}/clients/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setDetailClient(data);
      setDetailTabCartao(false);
      setDetailModal(true);
    } catch { showToast("Erro ao carregar detalhes.", "error"); }
  }

  useEffect(() => {
    fetchClients();
    const onSynced = () => fetchClients();
    window.addEventListener("sv_synced", onSynced);
    return () => window.removeEventListener("sv_synced", onSynced);
  }, []);

  // ── CEP — CORREÇÃO Fix 3: passa numero junto para melhor precisão ─────────
  async function buscarCep(cep) {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    if (!navigator.onLine) { showToast("CEP precisa de internet.", "warn"); return; }
    setCepLoading(true);
    setGeoStatus(null);
    try {
      const res = await fetch(`${API}/clients/geocode-cep`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        // CORREÇÃO: envia numero do formulário junto com o CEP
        // Nominatim usa o número para encontrar o endereço exato (ex: loja 145 vs loja 200)
        body:    JSON.stringify({ cep: limpo, numero: form.numero || "" }),
      });
      if (!res.ok) { showToast("CEP não encontrado.", "warn"); return; }
      const geo = await res.json();
      setForm(f => ({
        ...f,
        cep:       geo.cep,
        logradouro: geo.logradouro || f.logradouro,
        bairro:    geo.bairro     || f.bairro,
        municipio: geo.municipio  || f.municipio,
        uf:        geo.uf         || f.uf,
      }));
      // CORREÇÃO: geoStatus agora reflete a precisão real do geocode
      // 'numero'     → 📍 verde  (endereço completo — confiável)
      // 'logradouro' → amarelo  (aproximado)
      // 'cidade'     → 'warn'   (impreciso — só centróide da cidade)
      // null         → 'warn'   (sem GPS)
      setGeoStatus(geo.precisao || (geo.tem_gps ? "logradouro" : "warn"));
    } catch { showToast("Erro ao buscar CEP.", "error"); }
    finally { setCepLoading(false); }
  }

  // Regeocodifica quando número muda após CEP já preenchido
  async function onNumeroBlur() {
    if (form.cep && form.cep.replace(/\D/g, "").length === 8 && form.numero) {
      await buscarCep(form.cep);
    }
  }

  // ── Helpers de lista (emails / phones) ───────────────────────────────────
  function addEmail()  { setForm(f => ({ ...f, emails: [...f.emails, ""] })); }
  function addPhone()  { setForm(f => ({ ...f, phones: [...f.phones, ""] })); }
  function removeEmail(i) {
    setForm(f => { const e = f.emails.filter((_, idx) => idx !== i); return { ...f, emails: e.length ? e : [""] }; });
  }
  function removePhone(i) {
    setForm(f => { const p = f.phones.filter((_, idx) => idx !== i); return { ...f, phones: p.length ? p : [""] }; });
  }
  function setEmailAt(i, v) {
    setForm(f => { const e = [...f.emails]; e[i] = v; return { ...f, emails: e }; });
  }
  function setPhoneAt(i, v) {
    setForm(f => { const p = [...f.phones]; p[i] = v; return { ...f, phones: p }; });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Modal criar/editar ────────────────────────────────────────────────────
  async function openCreate() {
    setEditing(null);
    const codigo = navigator.onLine ? await buscarProximoCodigo() : proximoCodigo;
    setForm({ ...EMPTY_FORM, codigo: codigo || "", emails: [""], phones: [""] });
    setGeoStatus(null);
    setModalOpen(true);
  }

  function openEdit(c) {
    if (c.__pending) { showToast("Cliente ainda não sincronizado. Edite após conectar.", "warn"); return; }
    setEditing(c);
    setForm({
      codigo:                   c.codigo                   || "",
      name:                     c.name                     || "",
      emails:                   (c.emails && c.emails.length) ? c.emails : [c.email || ""],
      phones:                   (c.phones && c.phones.length) ? c.phones : [c.phone || ""],
      document:                 c.document                 || "",
      cnpj:                     c.cnpj                     || "",
      address:                  c.address                  || "",
      notes:                    c.notes                    || "",
      cep:                      c.cep                      || "",
      logradouro:               c.logradouro               || "",
      numero:                   c.numero                   || "",
      bairro:                   c.bairro                   || "",
      municipio:                c.municipio                || "",
      uf:                       c.uf                       || "",
      contrato_tipo:            c.contrato_tipo            || "avulso",
      contrato_valor:           c.contrato_valor           || "",
      contrato_forma_pagamento: c.contrato_forma_pagamento || "",
      contrato_dia_pagamento:   c.contrato_dia_pagamento   || "",
      contrato_inicio:          c.contrato_inicio          || "",
      contrato_fim:             c.contrato_fim             || "",
      contrato_status:          c.contrato_status          || "ativo",
      contrato_dias_semana:     c.contrato_dias_semana     || "",
      contrato_observacoes:     c.contrato_observacoes     || "",
      contrato_modelo:          c.contrato_modelo          || "",
      recorrencia:              c.recorrencia              || "",
    });
    // Mostra status de GPS existente ao abrir edição
    setGeoStatus(null); // não interferir — geoStatus só muda via buscarCep()
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setGeoStatus(null);
    setCriarCartaoApos(false);
  }

  // ── Submit com tratamento de conflito de código ───────────────────────────
  async function _enviarPayload(payload, url, method, confirmar = false) {
    if (confirmar) payload = { ...payload, confirmar_substituicao_codigo: true };
    return fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body:    JSON.stringify(payload),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }

    // CORREÇÃO Fix 2: bloqueia re-entrada enquanto submit está em andamento
    // Evita duplo disparo ao clicar "Criar Cliente e Cartão" rapidamente
    if (submittingRef.current) return;
    submittingRef.current = true;

    const emailsFiltrados = form.emails.filter(e => e.trim());
    const phonesFiltrados = form.phones.filter(p => p.trim());

    const payload = {
      ...form,
      emails: emailsFiltrados,
      phones: phonesFiltrados,
      email:  emailsFiltrados[0] || "",
      phone:  phonesFiltrados[0] || "",
    };

    if (!navigator.onLine) {
      if (editing) { showToast("Edição precisa de internet.", "warn"); submittingRef.current = false; return; }
      const ref = tmpId("tmpcli");
      await enqueueMutation("client", payload, { tmp_ref: ref });
      showToast("📴 Cliente salvo offline — sincroniza ao reconectar.");
      sessionStorage.removeItem("sv_clients");
      closeModal();
      fetchClients();
      submittingRef.current = false;
      return;
    }

    const url    = editing ? `${API}/clients/${editing.id}` : `${API}/clients`;
    const method = editing ? "PUT" : "POST";

    try {
      const res = await _enviarPayload(payload, url, method);

      if (res.status === 409) {
        const data = await res.json();
        if (data.codigo_conflito) {
          setCodigoConflito({ ...data, payload, url, method });
          return;
        }
        showToast(data.msg || "Erro.", "error");
        return;
      }

      if (res.ok) {
        const data      = await res.json();
        const geoMsg    = data.geo_msg || "";
        const clienteId = data.id || editing?.id;
        const irParaCartao = criarCartaoApos && clienteId;

        sessionStorage.removeItem("sv_clients");
        sessionStorage.removeItem("sv_orders");
        setCriarCartaoApos(false);
        closeModal();

        buscarProximoCodigo();
        fetchClients();

        if (irParaCartao) {
          navigate(`/orders?client_id=${clienteId}&new=1`);
        } else if (!editing && clienteId) {
          setPopupPosCliente({ id: clienteId, name: data.name || form.name });
          showToast(`Cliente criado! ${geoMsg}`);
        } else {
          showToast(`Cliente atualizado! ${geoMsg}`);
        }
      } else {
        const err = await res.json();
        showToast(err.msg || "Erro.", "error");
      }
    } catch {
      if (!editing) {
        const ref = tmpId("tmpcli");
        await enqueueMutation("client", payload, { tmp_ref: ref });
        showToast("📴 Conexão instável — cliente salvo offline.");
        closeModal();
        fetchClients();
      } else {
        showToast("Erro de conexão.", "error");
      }
    } finally {
      // CORREÇÃO Fix 2: libera o guard independente do caminho de execução
      submittingRef.current = false;
    }
  }

  // ── Confirma substituição de código ──────────────────────────────────────
  async function confirmarSubstituicaoCodigo(substituir) {
    if (!codigoConflito) return;
    const { payload, url, method } = codigoConflito;
    setCodigoConflito(null);
    if (!substituir) return;

    try {
      const res = await _enviarPayload(payload, url, method, true);
      if (res.ok) {
        showToast("Cliente atualizado!");
        sessionStorage.removeItem("sv_clients");
        closeModal();
        buscarProximoCodigo();
        fetchClients();
      } else {
        const err = await res.json();
        showToast(err.msg || "Erro.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (String(id).startsWith("tmp")) { showToast("Item offline não sincronizado.", "warn"); setDeleteConfirm(null); return; }
    if (!navigator.onLine) { showToast("Exclusão precisa de internet.", "warn"); setDeleteConfirm(null); return; }
    try {
      const res = await fetch(`${API}/clients/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        showToast("Cliente removido.");
        sessionStorage.removeItem("sv_clients");
        setDeleteConfirm(null);
        buscarProximoCodigo();
        fetchClients();
      } else showToast("Erro ao remover.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  // ── QR Code ───────────────────────────────────────────────────────────────
  function imprimirQr() {
    const janela = window.open("", "_blank");
    janela.document.write(`
      <html><head><title>QR Code SV Finance</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { display:flex; flex-direction:column; align-items:center;
               justify-content:center; min-height:100vh;
               font-family:'DM Sans',Arial,sans-serif; background:#fff; }
        .wrap { text-align:center; padding:32px; border:2px solid #e2e8f0;
                border-radius:20px; max-width:340px; }
        .logo { font-size:13px; font-weight:800; letter-spacing:4px;
                color:#1e3a8a; text-transform:uppercase; margin-bottom:6px; }
        .titulo { font-size:18px; font-weight:700; color:#0f172a; margin-bottom:4px; }
        .sub { font-size:12px; color:#64748b; margin-bottom:20px; }
        img { width:280px; height:280px; display:block; margin:0 auto 20px; }
        .instrucao { font-size:11px; color:#94a3b8; line-height:1.5; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style></head>
      <body>
        <div class="wrap">
          <div class="logo">SV Finance</div>
          <div class="titulo">Registro de Serviço</div>
          <div class="sub">Adesivo Universal — Não retirar</div>
          <img src="${QR_IMG_URL}" alt="QR Code SV Finance" crossorigin="anonymous"/>
          <div class="instrucao">Escaneie este código para registrar<br/>a execução do serviço neste local.</div>
        </div>
        <script>document.querySelector('img').onload = () => window.print();<\/script>
      </body></html>
    `);
    janela.document.close();
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  const allClients = [...pending, ...clients];
  const filtered   = allClients.filter(c => {
    const q           = search.toLowerCase();
    const todosEmails = [c.email || "", ...(c.emails || [])].join(" ").toLowerCase();
    const todosFones  = [c.phone || "", ...(c.phones || [])].join(" ");
    const matchSearch = (
      (c.name        || "").toLowerCase().includes(q) ||
      todosEmails.includes(q) ||
      todosFones.includes(search) ||
      (c.document    || "").includes(search) ||
      (c.municipio   || "").toLowerCase().includes(q) ||
      (c.codigo      || "").toLowerCase().includes(q)
    );

    let matchFreq;
    if (filterFreqCli === "all") {
      matchFreq = true;
    } else if (filterFreqCli === "sem_gps") {
      matchFreq = !c.latitude;
    } else {
      matchFreq = (c.recorrencia || c.contrato_tipo || "avulso") === filterFreqCli;
    }

    return matchSearch && matchFreq;
  });

  // ── Helpers de ícone/texto de precisão GPS ────────────────────────────────
  // Usados no formulário para feedback visual ao admin
  function geoIcone() {
    if (geoStatus === "numero")     return "📍";
    if (geoStatus === "logradouro") return "🟡";
    return "⚠️";
  }
  function geoTexto() {
    if (geoStatus === "numero")     return "📍 Localização salva pelo endereço completo";
    if (geoStatus === "logradouro") return "🟡 Localização aproximada — confirme no local físico";
    if (geoStatus === "cidade")     return "⚠️ Localização pela cidade — salve no local físico";
    if (geoStatus === "warn")       return "⚠️ GPS não encontrado — salve a localização no local";
    return "";
  }
  function geoCorTexto() {
    if (geoStatus === "numero")     return "#22c55e";
    if (geoStatus === "logradouro") return "#f59e0b";
    return "#ef4444";
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  const inputStyle = {
    background:   theme.bgInput,
    border:       `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10,
    padding:      "10px 14px",
    color:        theme.textPrimary,
    fontSize:     "0.9rem",
    outline:      "none",
    width:        "100%",
    boxSizing:    "border-box",
    transition:   "border-color 0.2s",
    colorScheme,
    ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
  };

  const modalBg = isGlass
    ? { backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };

  const STATUS_COLOR = {
    approved:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)"    },
    draft:       { color: "#94a3b8", bg: "rgba(148,163,184,0.12)"  },
    sent:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"   },
    open:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"   },
    in_progress: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)"   },
    done:        { color: "#22c55e", bg: "rgba(34,197,94,0.12)"    },
    cancelled:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)"    },
  };
  const STATUS_LABEL = {
    approved: "Aprovado", draft: "Rascunho", sent: "Enviado",
    open: "Aberta", in_progress: "Em andamento", done: "Concluída", cancelled: "Cancelada",
  };

  function fmt(v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  }
  function labelInput(label, required = false) {
    return (
      <label style={{ color: theme.textSecondary, fontSize: "0.8rem", fontWeight: 600 }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
    );
  }
  function sectionTitle(icon, label) {
    return (
      <div style={{ gridColumn: "1 / -1", color: theme.primary, fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 8, marginBottom: 4, paddingBottom: 6, borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.2)" : theme.borderCard}` }}>
        {icon} {label}
      </div>
    );
  }
  function focusIn(e)  { e.target.style.borderColor = theme.primary; }
  function focusOut(e) { e.target.style.borderColor = isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput; }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <style>{`
        .card3d-cl {
          background:${isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard};
          border-radius:14px; padding:16px 20px;
          display:flex; align-items:center; gap:14px;
          backdrop-filter:${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          -webkit-backdrop-filter:${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          transition:transform 0.35s ease, box-shadow 0.35s ease;
          transform:perspective(700px) rotateX(5deg) rotateY(-3deg);
          box-shadow:${isGlass ? "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)" : "0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"};
          position:relative; overflow:hidden; cursor:default;
        }
        .card3d-cl::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,${isGlass ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)"},transparent);
        }
        .card3d-cl:hover {
          transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px);
          box-shadow:${isGlass ? "0 20px 48px rgba(0,0,0,0.1)" : "0 36px 72px rgba(0,0,0,0.5)"};
          background:${isGlass ? "rgba(255,255,255,0.35)" : theme.bgCardHover};
        }
        .table3d-cl {
          background:${isGlass ? "rgba(255,255,255,0.18)" : theme.bgCard};
          border:1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard};
          border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch;
          box-shadow:${isGlass ? "0 4px 24px rgba(0,0,0,0.07)" : "0 12px 32px rgba(0,0,0,0.3)"};
          ${isGlass ? "backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);" : "backdrop-filter:blur(4px);"}
        }
        .cl-row:hover { background:${isGlass ? "rgba(255,255,255,0.15)" : `${theme.primary}0d`} !important; }
        @media (max-width:768px) {
          .card3d-cl { transform:none !important; }
          .card3d-cl:hover { transform:translateY(-6px) !important; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .multi-field-row { display:flex; gap:6px; align-items:center; }
        .multi-field-row input { flex:1; }
        .btn-add-field {
          background:${isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard};
          border:1px dashed ${theme.primary}; border-radius:8px;
          color:${theme.primary}; font-size:0.8rem; font-weight:700;
          cursor:pointer; padding:6px 12px; font-family:inherit;
          display:flex; align-items:center; gap:4px; margin-top:4px;
        }
        .btn-remove-field {
          background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25);
          color:#ef4444; border-radius:8px; cursor:pointer;
          width:30px; height:30px; display:flex; align-items:center;
          justify-content:center; font-size:0.85rem; flex-shrink:0;
          padding:0; line-height:1;
        }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile ? 44 : 60, height: isMobile ? 44 : 60, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile ? "20px" : "1.75rem", fontWeight: 700, margin: 0, color: theme.textPrimary }}>Clientes</h1>
              <p style={{ color: theme.textMuted, margin: "4px 0 0", fontSize: "0.85rem" }}>Gerencie sua carteira de clientes</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{ background: "rgba(79,142,247,0.12)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 10, padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}
              onClick={() => setQrModal(true)}
            >📲 QR Code Universal</button>
            <button
              style={{ background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: `0 4px 15px ${theme.primary}44`, whiteSpace: "nowrap" }}
              onClick={openCreate}
            >+ Novo Cliente</button>
          </div>
        </div>

        {/* OFFLINE */}
        {!navigator.onLine && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            📴 Você está offline. Novos clientes serão salvos e sincronizados automaticamente ao reconectar.
          </div>
        )}

        {/* CARDS RESUMO */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { icon: "👥", label: "Total de Clientes",   value: allClients.length,                            color: theme.primary, border: isGlass ? "rgba(255,255,255,0.5)" : `${theme.primary}44` },
            { icon: "📍", label: "Com GPS cadastrado",  value: clients.filter(c => c.latitude).length,       color: "#22c55e",     border: isGlass ? "rgba(255,255,255,0.5)" : "rgba(34,197,94,0.3)" },
            { icon: "⏳", label: "Pendentes (offline)", value: pending.length,                               color: "#f59e0b",     border: isGlass ? "rgba(255,255,255,0.5)" : "rgba(245,158,11,0.3)" },
            { icon: "📦", label: "Com Pedidos",         value: clients.filter(c => c.orders?.length > 0).length, color: theme.income, border: isGlass ? "rgba(255,255,255,0.5)" : `${theme.income}44` },
          ].map((c, i) => (
            <div key={i} className="card3d-cl" style={{ border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: "1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color: theme.textMuted, fontSize: "0.75rem", marginBottom: 2 }}>{c.label}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: isMobile ? "1rem" : "1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BUSCA + FILTROS */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            style={{ ...inputStyle, width: isMobile ? "100%" : "400px" }}
            type="text"
            placeholder="🔍 Buscar por nome, email, telefone, código, cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { v: "all",        l: "Todas" },
              { v: "sem_gps",    l: "⚠️ Sem GPS" },
              { v: "semanal",    l: "🔵 Semanal" },
              { v: "quinzenal",  l: "🟢 Quinzenal" },
              { v: "mensal",     l: "🟡 Mensal" },
              { v: "esporadico", l: "🔸 Esporádico" },
              { v: "avulso",     l: "⚪ Avulso" },
              { v: "anual",      l: "🟣 Anual" },
            ].map(({ v, l }) => (
              <button key={v}
                style={{ background: filterFreqCli === v ? "#16a34a" : "#fff", color: filterFreqCli === v ? "#fff" : "#374151", border: `1px solid ${filterFreqCli === v ? "#16a34a" : "rgba(22,163,74,0.25)"}`, borderRadius: 8, padding: "6px 14px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                onClick={() => setFilterFreqCli(v)}>{l}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="table3d-cl">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, color: theme.textMuted }}>
              <span style={{ fontSize: "2rem" }}>👥</span>
              <p>{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: isMobile ? "520px" : "unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Cód", "Nome", "Telefone", "Ações"]
                    : ["Cód", "Nome", "Email", "Telefone", "Cidade/UF", "GPS", "Ações"]
                  ).map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: theme.textMuted, fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: isGlass ? "rgba(255,255,255,0.1)" : theme.bgCard, borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.3)" : theme.borderCard}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="cl-row" onClick={() => fetchDetail(c.id)} style={{ cursor: "pointer", borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.15)" : theme.border}`, transition: "background 0.15s", opacity: c.__pending ? 0.85 : 1 }}>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.textMuted, background: isGlass ? "rgba(255,255,255,0.2)" : `${theme.primary}15`, borderRadius: 6, padding: "2px 7px" }}>
                        {c.codigo || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isGlass ? "rgba(255,255,255,0.4)" : `${theme.primary}22`, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : `${theme.primary}44`}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: theme.primary, flexShrink: 0 }}>
                          {(c.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                            {c.name}
                            {c.__pending && <span style={{ fontSize: 9, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>⏳ PENDENTE</span>}
                            {isMobile && (
                              <span title={c.latitude ? `GPS: ${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}` : "Sem GPS cadastrado"}>
                                {c.latitude ? "📍" : "⚠️"}
                              </span>
                            )}
                          </div>
                          {isMobile && (c.email || c.emails?.[0]) && <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{c.email || c.emails?.[0]}</div>}
                        </div>
                      </div>
                    </td>
                    {!isMobile && <td style={{ padding: "12px 16px", verticalAlign: "middle", color: theme.textSecondary }}>{c.email || c.emails?.[0] || "—"}</td>}
                    <td style={{ padding: "12px 16px", verticalAlign: "middle", color: theme.textSecondary }}>{c.phone || c.phones?.[0] || "—"}</td>
                    {!isMobile && <td style={{ padding: "12px 16px", verticalAlign: "middle", color: theme.textMuted }}>{c.municipio ? `${c.municipio}/${c.uf}` : "—"}</td>}
                    {!isMobile && (
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <span title={c.latitude ? `${c.latitude}, ${c.longitude}` : "Sem GPS"} style={{ fontSize: "1rem" }}>
                          {c.latitude ? "📍" : "⚠️"}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => fetchDetail(c.id)} title="Informações do cliente" style={{ background: "rgba(79,142,247,0.12)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 8, padding: isMobile ? "5px 8px" : "5px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 800, fontFamily: "inherit" }}>!</button>
                        {rg && (
                          <button onClick={() => navigate(`/orders?client_id=${c.id}&new=1`)} title="Criar Nova O.S" style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "5px 8px" : "5px 11px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>📋 {!isMobile && "Novo Cartão"}</button>
                        )}
                        <button style={{ background: isGlass ? "rgba(255,255,255,0.25)" : `${theme.primary}22`, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : `${theme.primary}44`}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => openEdit(c)}>✏️</button>
                        <button style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => setDeleteConfirm(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── POP-UP PÓS-CRIAÇÃO ── */}
      {popupPosCliente && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(6px)", padding: 16 }}>
          <div style={{ background: "#0a0f1e", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 20, padding: isMobile ? "28px 20px" : 36, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.15rem", fontWeight: 700, color: "#e2e8f0" }}>Cliente criado com sucesso!</h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
              Deseja criar um cartão de serviço para <strong style={{ color: "#e2e8f0" }}>{popupPosCliente.name}</strong> agora?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }}
                onClick={() => { const id = popupPosCliente.id; setPopupPosCliente(null); navigate(`/orders?client_id=${id}&new=1`); }}
              >📋 Criar cartão agora</button>
              <button
                style={{ width: "100%", padding: "12px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
                onClick={() => setPopupPosCliente(null)}
              >Não, só salvar cliente</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL QR CODE ── */}
      {qrModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "16px" }} onClick={() => setQrModal(false)}>
          <div style={{ background: "#0a0f1e", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 24, padding: isMobile ? "24px 20px" : 36, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", textAlign: "center", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "4px", color: "#4f8ef7", textTransform: "uppercase" }}>SV Finance</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0" }}>QR Code Universal</div>
              </div>
              <button onClick={() => setQrModal(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, display: "inline-block", marginBottom: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
              <img src={QR_IMG_URL} alt="QR Code" width={240} height={240} style={{ display: "block", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
              <button style={{ flex: 1, padding: "12px 0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }} onClick={() => setQrModal(false)}>Fechar</button>
              <button style={{ flex: 1, padding: "12px 0", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }} onClick={imprimirQr}>🖨️ Imprimir adesivo</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRIAR/EDITAR ── */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: isGlass ? "0 20px 60px rgba(0,0,0,0.15)" : "0 25px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: theme.textPrimary }}>{editing ? "✏️ Editar Cliente" : "➕ Novo Cliente"}</h2>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.4)" : theme.bgCard, border: "none", color: theme.textPrimary, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 }} onClick={closeModal}>✕</button>
            </div>

            {!navigator.onLine && !editing && (
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                📴 Offline — o CEP não será buscado automaticamente.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 8 }}>

                {sectionTitle("👤", "Dados do Cliente")}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Código interno")}
                  <div style={{ position: "relative" }}>
                    <input
                      style={{ ...inputStyle, paddingRight: 80, background: editing ? inputStyle.background : (isGlass ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"), color: theme.textMuted }}
                      placeholder="Gerado automaticamente"
                      value={form.codigo}
                      onChange={e => setForm({ ...form, codigo: e.target.value })}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                    {!editing && form.codigo && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: theme.primary, fontWeight: 700 }}>AUTO</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: theme.textMuted }}>Gerado automaticamente. Edite somente se necessário.</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("CPF / CNPJ")}
                  <input style={inputStyle} placeholder="000.000.000-00" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Nome completo / Razão social", true)}
                  <input style={inputStyle} required placeholder="Nome do cliente" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                {/* Emails múltiplos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Email(s)")}
                  {form.emails.map((em, i) => (
                    <div key={i} className="multi-field-row">
                      <input style={inputStyle} type="email" placeholder={i === 0 ? "email@principal.com" : "email adicional..."} value={em} onChange={e => setEmailAt(i, e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                      {form.emails.length > 1 && <button type="button" className="btn-remove-field" onClick={() => removeEmail(i)} title="Remover email">✕</button>}
                    </div>
                  ))}
                  <button type="button" className="btn-add-field" onClick={addEmail}>+ Adicionar email</button>
                </div>

                {/* Telefones múltiplos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Telefone(s)")}
                  {form.phones.map((ph, i) => (
                    <div key={i} className="multi-field-row">
                      <input style={inputStyle} type="tel" placeholder={i === 0 ? "(44) 99999-9999" : "telefone adicional..."} value={ph} onChange={e => setPhoneAt(i, e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                      {form.phones.length > 1 && <button type="button" className="btn-remove-field" onClick={() => removePhone(i)} title="Remover telefone">✕</button>}
                    </div>
                  ))}
                  <button type="button" className="btn-add-field" onClick={addPhone}>+ Adicionar telefone</button>
                </div>

                {sectionTitle("📍", "Endereço")}

                {/* CEP */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("CEP")}
                  <div style={{ position: "relative" }}>
                    <input style={{ ...inputStyle, paddingRight: 40 }} placeholder="00000-000" value={form.cep}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setForm(f => ({ ...f, cep: v }));
                        // CORREÇÃO Fix 3: passa numero atual junto com o CEP
                        if (v.length === 8) buscarCep(v);
                      }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                    {cepLoading && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, border: "2px solid rgba(79,142,247,0.3)", borderTop: "2px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                    {!cepLoading && geoStatus && geoStatus !== "warn" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{geoIcone()}</span>}
                    {!cepLoading && geoStatus === "warn" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 14 }}>⚠️</span>}
                  </div>
                  {/* CORREÇÃO Fix 3: feedback com nível de precisão */}
                  {geoStatus && (
                    <span style={{ fontSize: 11, color: geoCorTexto() }}>{geoTexto()}</span>
                  )}
                </div>

                {/* Número — CORREÇÃO Fix 3: onBlur regeocodifica quando número muda */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Número")}
                  <input
                    style={inputStyle}
                    placeholder="123"
                    value={form.numero}
                    onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                    onBlur={onNumeroBlur}
                    onFocus={focusIn}
                  />
                  <span style={{ fontSize: 10, color: theme.textMuted }}>Preencha o número para localização mais precisa</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Logradouro")}
                  <input style={inputStyle} placeholder="Rua, Av..." value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Bairro")}
                  <input style={inputStyle} placeholder="Bairro" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Município")}
                  <input style={inputStyle} placeholder="Maringá" value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("UF")}
                  <input style={inputStyle} placeholder="PR" maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                {sectionTitle("📋", "Contrato")}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Tipo de contrato")}
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.contrato_tipo} onChange={e => setForm({ ...form, contrato_tipo: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                    <option value="avulso">Avulso (sem contrato)</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Recorrência")}
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                    <option value="">Selecionar...</option>
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal (2x/mês)</option>
                    <option value="semanal">Semanal</option>
                    <option value="anual">Anual</option>
                    <option value="esporadico">Esporádico</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Status do contrato")}
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.contrato_status} onChange={e => setForm({ ...form, contrato_status: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                    <option value="ativo">✅ Ativo</option>
                    <option value="pausado">⏸️ Pausado</option>
                    <option value="encerrado">❌ Encerrado</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Valor do contrato (R$)")}
                  <input style={inputStyle} type="number" step="0.01" placeholder="0,00" value={form.contrato_valor} onChange={e => setForm({ ...form, contrato_valor: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Forma de pagamento")}
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.contrato_forma_pagamento} onChange={e => setForm({ ...form, contrato_forma_pagamento: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                    <option value="">Selecionar...</option>
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto</option>
                    <option value="deposito">Depósito</option>
                    <option value="carne">Carnê</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Dia de pagamento (dia do mês)")}
                  <input style={inputStyle} type="number" min="1" max="31" placeholder="Ex: 10" value={form.contrato_dia_pagamento} onChange={e => setForm({ ...form, contrato_dia_pagamento: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Início do contrato")}
                  <input style={{ ...inputStyle, colorScheme }} type="date" value={form.contrato_inicio} onChange={e => setForm({ ...form, contrato_inicio: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {labelInput("Fim do contrato")}
                  <input style={{ ...inputStyle, colorScheme }} type="date" value={form.contrato_fim} onChange={e => setForm({ ...form, contrato_fim: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                {form.recorrencia && form.recorrencia !== "esporadico" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: "1 / -1" }}>
                    {labelInput("Dias de atendimento")}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {DIAS_SEMANA.map(d => {
                        const selecionados = (form.contrato_dias_semana || "").split(",").filter(Boolean);
                        const sel = selecionados.includes(d.value);
                        return (
                          <button key={d.value} type="button"
                            style={{ padding: "6px 14px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit",
                              background: sel ? theme.primary : isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard,
                              color:      sel ? "#fff" : theme.textMuted,
                              boxShadow:  sel ? `0 2px 10px ${theme.primary}44` : "none",
                            }}
                            onClick={() => {
                              const lista = (form.contrato_dias_semana || "").split(",").filter(Boolean);
                              const nova  = sel ? lista.filter(x => x !== d.value) : [...lista, d.value];
                              setForm({ ...form, contrato_dias_semana: nova.sort().join(",") });
                            }}
                          >{d.label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Modelo / Texto do contrato")}
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 100, fontFamily: "inherit" }} placeholder="Cole ou escreva o modelo de contrato aqui..." value={form.contrato_modelo} onChange={e => setForm({ ...form, contrato_modelo: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Observações do contrato")}
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="Ex: cliente prefere manhãs..." value={form.contrato_observacoes} onChange={e => setForm({ ...form, contrato_observacoes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  {labelInput("Observações gerais")}
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="Informações adicionais..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                </div>

              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexDirection: isMobile ? "column" : "row", marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" style={{ background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard, color: theme.textSecondary, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={closeModal}>Cancelar</button>
                {rg && (
                  <button type="submit" onClick={() => setCriarCartaoApos(true)}
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16a34a", border: "2px solid #16a34a", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", width: isMobile ? "100%" : "auto", fontFamily: "inherit" }}>
                    {editing ? "💾 Salvar e Criar Cartão" : "📋 Criar Cliente e Cartão"}
                  </button>
                )}
                <button type="submit" style={{ background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 15px ${theme.primary}44`, width: isMobile ? "100%" : "auto" }}>
                  {editing ? "Salvar Alterações" : "Criar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFLITO DE CÓDIGO ── */}
      {codigoConflito && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)", padding: 16 }}>
          <div style={{ ...modalBg, borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", fontWeight: 700, color: "#f59e0b" }}>⚠️ Conflito de código</h2>
            <p style={{ color: theme.textSecondary, marginBottom: 8, lineHeight: 1.6 }}>Este cliente já possui o código <strong style={{ color: theme.textPrimary }}>{codigoConflito.codigo_atual}</strong>.</p>
            <p style={{ color: theme.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>Deseja substituir por <strong style={{ color: theme.primary }}>{codigoConflito.codigo_novo}</strong>?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={{ background: theme.bgCard, color: theme.textSecondary, border: `1px solid ${theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }} onClick={() => confirmarSubstituicaoCodigo(false)}>Manter {codigoConflito.codigo_atual}</button>
              <button style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }} onClick={() => confirmarSubstituicaoCodigo(true)}>Substituir por {codigoConflito.codigo_novo}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALHE (!) ── */}
      {detailModal && detailClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setDetailModal(false)}>
          <div style={{ ...modalBg, borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: isGlass ? "0 20px 60px rgba(0,0,0,0.15)" : "0 25px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: isGlass ? "rgba(255,255,255,0.4)" : `${theme.primary}22`, border: `2px solid ${isGlass ? "rgba(255,255,255,0.6)" : `${theme.primary}44`}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem", color: theme.primary }}>
                  {(detailClient.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: theme.textPrimary }}>{detailClient.name}</h2>
                    {detailClient.codigo && <span style={{ fontSize: "0.75rem", fontWeight: 700, background: isGlass ? "rgba(255,255,255,0.3)" : `${theme.primary}15`, color: theme.primary, borderRadius: 6, padding: "2px 8px" }}>{detailClient.codigo}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: theme.textMuted }}>
                    {detailClient.__pending ? "⏳ Aguardando sincronização" : `Cadastrado em ${detailClient.created_at?.split("-").reverse().join("/") || "—"}`}
                    {!detailClient.__pending && <> · <span style={{ color: detailClient.latitude ? "#22c55e" : "#f59e0b" }}>{detailClient.latitude ? "📍 GPS ativo" : "⚠️ Sem GPS"}</span></>}
                  </p>
                </div>
              </div>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.4)" : theme.bgCard, border: "none", color: theme.textPrimary, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0 }} onClick={() => setDetailModal(false)}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[{ id: false, label: "📋 Dados" }, { id: true, label: "🗂️ Cartões/OS" }].map(tab => (
                <button key={String(tab.id)} style={{ padding: "8px 18px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", border: "none", fontFamily: "inherit", background: detailTabCartao === tab.id ? theme.primary : (isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard), color: detailTabCartao === tab.id ? "#fff" : theme.textMuted }} onClick={() => setDetailTabCartao(tab.id)}>{tab.label}</button>
              ))}
            </div>

            {!detailTabCartao && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 20, background: isGlass ? "rgba(255,255,255,0.15)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.3)" : theme.borderCard}`, borderRadius: 12, padding: "16px 20px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Email(s)</div>
                  {((detailClient.emails?.length ? detailClient.emails : [detailClient.email]).filter(Boolean)).map((em, i) => <div key={i} style={{ fontSize: "0.9rem", color: theme.textPrimary }}>{em}</div>)}
                  {!detailClient.email && !detailClient.emails?.length && <div style={{ fontSize: "0.9rem", color: theme.textMuted }}>—</div>}
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Telefone(s)</div>
                  {((detailClient.phones?.length ? detailClient.phones : [detailClient.phone]).filter(Boolean)).map((ph, i) => <div key={i} style={{ fontSize: "0.9rem", color: theme.textPrimary }}>{ph}</div>)}
                  {!detailClient.phone && !detailClient.phones?.length && <div style={{ fontSize: "0.9rem", color: theme.textMuted }}>—</div>}
                </div>
                {[
                  { label: "CPF/CNPJ",       value: detailClient.document },
                  { label: "CEP",             value: detailClient.cep },
                  { label: "Logradouro",      value: detailClient.logradouro && detailClient.numero ? `${detailClient.logradouro}, ${detailClient.numero}` : detailClient.logradouro },
                  { label: "Cidade/UF",       value: detailClient.municipio && detailClient.uf ? `${detailClient.municipio}/${detailClient.uf}` : null },
                  { label: "GPS",             value: detailClient.latitude ? `${detailClient.latitude.toFixed(6)}, ${detailClient.longitude.toFixed(6)}` : "Não cadastrada" },
                  { label: "Tipo contrato",   value: detailClient.contrato_tipo },
                  { label: "Recorrência",     value: detailClient.recorrencia },
                  { label: "Status contrato", value: detailClient.contrato_status },
                  { label: "Valor contrato",  value: detailClient.contrato_valor ? `R$ ${Number(detailClient.contrato_valor).toFixed(2)}` : null },
                  { label: "Início",          value: detailClient.contrato_inicio?.split("-").reverse().join("/") },
                  { label: "Fim",             value: detailClient.contrato_fim?.split("-").reverse().join("/") },
                ].map((f, i) => f.value ? (
                  <div key={i}>
                    <div style={{ fontSize: "0.72rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: "0.9rem", color: f.label === "GPS" && detailClient.latitude ? "#22c55e" : theme.textPrimary }}>{f.value}</div>
                  </div>
                ) : null)}
                {detailClient.contrato_modelo && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "0.72rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Modelo de contrato</div>
                    <pre style={{ fontSize: "0.82rem", color: theme.textSecondary, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", lineHeight: 1.6 }}>{detailClient.contrato_modelo}</pre>
                  </div>
                )}
                {detailClient.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "0.72rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Observações</div>
                    <div style={{ fontSize: "0.9rem", color: theme.textPrimary }}>{detailClient.notes}</div>
                  </div>
                )}
              </div>
            )}

            {detailTabCartao && !detailClient.__pending && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: theme.textMuted, fontWeight: 600 }}>Filtrar mês/ano:</span>
                  <input type="month" style={{ ...inputStyle, width: "auto", colorScheme }} value={filtroMesCartao} onChange={e => setFiltroMesCartao(e.target.value)} />
                  {filtroMesCartao && <button style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem" }} onClick={() => setFiltroMesCartao("")}>✕ Limpar</button>}
                </div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: theme.textMuted, margin: "0 0 10px 0" }}>📦 Ordens / O.S ({detailClient.orders?.length || 0})</p>
                {detailClient.orders?.length > 0 ? (() => {
                  const ordFiltradas = filtroMesCartao ? detailClient.orders.filter(o => (o.created_at || "").startsWith(filtroMesCartao)) : detailClient.orders;
                  return ordFiltradas.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ordFiltradas.map(o => {
                        const s = STATUS_COLOR[o.status] || STATUS_COLOR.open;
                        return (
                          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isGlass ? "rgba(255,255,255,0.15)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.3)" : theme.borderCard}`, borderRadius: 10, padding: "10px 14px" }}>
                            <div>
                              <span style={{ fontWeight: 600, color: theme.primary, fontSize: "0.88rem" }}>{o.number}</span>
                              <span style={{ marginLeft: 8, fontSize: "0.75rem", color: theme.textMuted }}>{o.created_at?.split("-").reverse().join("/")}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: theme.income }}>{fmt(o.total)}</span>
                              <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>{STATUS_LABEL[o.status] || o.status}</span>
                              {rg && <button style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit" }} onClick={() => { setDetailModal(false); navigate(`/orders?highlight=${o.id}`); }}>Ver</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p style={{ color: theme.textMuted, fontSize: "0.85rem" }}>Nenhuma O.S no período selecionado.</p>;
                })() : <p style={{ color: theme.textMuted, fontSize: "0.85rem" }}>Nenhuma ordem cadastrada.</p>}
                {rg && <button style={{ marginTop: 20, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }} onClick={() => { setDetailModal(false); navigate(`/orders?client_id=${detailClient.id}&new=1`); }}>📋 Gerar novo cartão para este cliente</button>}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, flexDirection: isMobile ? "column" : "row" }}>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard, color: theme.textSecondary, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={() => setDetailModal(false)}>Fechar</button>
              {!detailClient.__pending && (
                <>
                  <button
                    style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: isMobile ? "100%" : "auto" }}
                    onClick={async () => {
                      if (!navigator.geolocation) { showToast("GPS não disponível.", "error"); return; }
                      navigator.geolocation.getCurrentPosition(async pos => {
                        try {
                          const res = await fetch(`${API}/clients/${detailClient.id}/set-location`, {
                            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                          });
                          const data = await res.json();
                          if (res.ok) { showToast("📍 Localização exata salva!"); fetchClients(); setDetailModal(false); }
                          else showToast(data.msg || "Erro.", "error");
                        } catch { showToast("Erro de conexão.", "error"); }
                      }, () => showToast("GPS negado.", "error"), { enableHighAccuracy: true, maximumAge: 0 });
                    }}>
                    📍 Salvar localização exata
                  </button>
                  <button style={{ background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 15px ${theme.primary}44`, width: isMobile ? "100%" : "auto" }} onClick={() => { setDetailModal(false); openEdit(detailClient); }}>✏️ Editar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DELETE ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border: "1px solid rgba(239,68,68,0.3)", borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 400, boxShadow: isGlass ? "0 20px 60px rgba(0,0,0,0.15)" : "0 25px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#ef4444" }}>Excluir Cliente</h2>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.4)" : theme.bgCard, border: "none", color: theme.textPrimary, width: 32, height: 32, borderRadius: 8, cursor: "pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: theme.textSecondary, marginBottom: 24 }}>Excluir <strong style={{ color: theme.textPrimary }}>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row", justifyContent: "flex-end" }}>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard, color: theme.textSecondary, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, right: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", background: toast.type === "error" ? "#ef4444" : toast.type === "warn" ? "#f59e0b" : theme.primaryGrad, textAlign: isMobile ? "center" : "left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}