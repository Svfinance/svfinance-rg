import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

// Token universal gravado no QR Code — mesmo valor do checkin_service.py
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
  { value:"0", label:"Dom" }, { value:"1", label:"Seg" },
  { value:"2", label:"Ter" }, { value:"3", label:"Qua" },
  { value:"4", label:"Qui" }, { value:"5", label:"Sex" },
  { value:"6", label:"Sáb" },
];

const EMPTY_FORM = {
  codigo:"", name:"", email:"", phone:"", document:"", cnpj:"",
  address:"", notes:"",
  cep:"", logradouro:"", numero:"", bairro:"", municipio:"", uf:"",
  contrato_tipo:"avulso", contrato_valor:"", contrato_forma_pagamento:"",
  contrato_dia_pagamento:"", contrato_inicio:"", contrato_fim:"",
  contrato_status:"ativo", contrato_dias_semana:"", contrato_observacoes:"",
};

export default function Clients() {
  const { theme, themeId } = useTheme();
  const isGlass    = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile   = useIsMobile();
  const navigate   = useNavigate();
  const qrCanvasRef = useRef(null);

  // URL da imagem QR via quickchart.io (gratuito, sem instalação)
  const QR_IMG_URL = `https://quickchart.io/qr?text=${encodeURIComponent(QR_UNIVERSAL_TOKEN)}&size=280&margin=2&ecLevel=H&dark=0a0f1e&light=ffffff`;

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [clients,        setClients]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [detailClient,   setDetailClient]   = useState(null);
  const [detailModal,    setDetailModal]    = useState(false);
  const [qrModal,        setQrModal]        = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [toast,          setToast]          = useState(null);
  const [cepLoading,     setCepLoading]     = useState(false);
  const [geoStatus,      setGeoStatus]      = useState(null); // "ok" | "warn" | null

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const CACHE_KEY = "sv_clients";
  const CACHE_TTL = 60000;

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null; }
      return data;
    } catch { return null; }
  }

  function cacheSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
  }

  async function fetchClients() {
    setLoading(true);

    // Mostra cache imediatamente
    const cached = cacheGet(CACHE_KEY);
    if (cached) { setClients(cached); setLoading(false); }

    try {
      const res = await fetch(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      cacheSet(CACHE_KEY, list);
    } catch { if (!cached) showToast("Erro ao carregar clientes.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchDetail(id) {
    try {
      const res  = await fetch(`${API}/clients/${id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setDetailClient(data);
      setDetailModal(true);
    } catch { showToast("Erro ao carregar detalhes.", "error"); }
  }

  useEffect(() => { fetchClients(); }, []);

  // ── CEP automático ─────────────────────────────────────────────────────────

  async function buscarCep(cep) {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;

    setCepLoading(true);
    setGeoStatus(null);
    try {
      const res  = await fetch(`${API}/clients/geocode-cep`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ cep: limpo }),
      });
      if (!res.ok) { showToast("CEP não encontrado.", "warn"); return; }
      const geo = await res.json();
      setForm(f => ({
        ...f,
        cep:        geo.cep,
        logradouro: geo.logradouro || f.logradouro,
        bairro:     geo.bairro    || f.bairro,
        municipio:  geo.municipio || f.municipio,
        uf:         geo.uf        || f.uf,
      }));
      setGeoStatus(geo.tem_gps ? "ok" : "warn");
    } catch { showToast("Erro ao buscar CEP.", "error"); }
    finally { setCepLoading(false); }
  }

  // ── QR Code universal ──────────────────────────────────────────────────────

  async function abrirQrModal() {
    setQrModal(true);
  }

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
        @media print {
          body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      </style></head>
      <body>
        <div class="wrap">
          <div class="logo">SV Finance</div>
          <div class="titulo">Registro de Serviço</div>
          <div class="sub">Adesivo Universal — Não retirar</div>
          <img src="${QR_IMG_URL}" alt="QR Code SV Finance" crossorigin="anonymous"/>
          <div class="instrucao">
            Escaneie este código para registrar<br/>
            a execução do serviço neste local.
          </div>
        </div>
        <script>
          document.querySelector('img').onload = () => window.print();
        <\/script>
      </body></html>
    `);
    janela.document.close();
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Modal abrir/fechar ─────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setGeoStatus(null);
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      codigo:      c.codigo      || "",
      name:        c.name        || "",
      email:       c.email       || "",
      phone:       c.phone       || "",
      document:    c.document    || "",
      cnpj:        c.cnpj        || "",
      address:     c.address     || "",
      notes:       c.notes       || "",
      cep:         c.cep         || "",
      logradouro:  c.logradouro  || "",
      numero:      c.numero      || "",
      bairro:      c.bairro      || "",
      municipio:   c.municipio   || "",
      uf:          c.uf          || "",
      contrato_tipo:            c.contrato_tipo            || "avulso",
      contrato_valor:           c.contrato_valor           || "",
      contrato_forma_pagamento: c.contrato_forma_pagamento || "",
      contrato_dia_pagamento:   c.contrato_dia_pagamento   || "",
      contrato_inicio:          c.contrato_inicio          || "",
      contrato_fim:             c.contrato_fim             || "",
      contrato_status:          c.contrato_status          || "ativo",
      contrato_dias_semana:     c.contrato_dias_semana     || "",
      contrato_observacoes:     c.contrato_observacoes     || "",
    });
    setGeoStatus(c.latitude ? "ok" : null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); setGeoStatus(null); }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }

    const url    = editing ? `${API}/clients/${editing.id}` : `${API}/clients`;
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify(form),
      });
      if (res.ok) {
        const geoMsg = data.geo_msg || "";
        showToast(`${editing ? "Cliente atualizado!" : "Cliente criado!"} ${geoMsg}`);
        sessionStorage.removeItem("sv_clients");
        sessionStorage.removeItem("sv_orders"); // OS tem nome do cliente
        closeModal();
        fetchClients();
      } else {
        const err = await res.json();
        showToast(err.msg || "Erro.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        showToast("Cliente removido.");
        sessionStorage.removeItem("sv_clients");
        setDeleteConfirm(null);
        fetchClients();
      }
      else showToast("Erro ao remover.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email    || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone    || "").includes(search) ||
    (c.document || "").includes(search) ||
    (c.municipio|| "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Estilos ────────────────────────────────────────────────────────────────

  const inputStyle = {
    background:  theme.bgInput,
    border:      `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10,
    padding:     "10px 14px",
    color:        theme.textPrimary,
    fontSize:    "0.9rem",
    outline:     "none",
    width:       "100%",
    boxSizing:   "border-box",
    transition:  "border-color 0.2s",
    colorScheme,
    ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
  };

  const modalBg = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };

  const STATUS_COLOR = {
    approved:    { color:"#22c55e", bg:"rgba(34,197,94,0.12)"   },
    draft:       { color:"#94a3b8", bg:"rgba(148,163,184,0.12)" },
    sent:        { color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
    open:        { color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
    in_progress: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
    done:        { color:"#22c55e", bg:"rgba(34,197,94,0.12)"   },
    cancelled:   { color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
  };

  const STATUS_LABEL = {
    approved:"Aprovado", draft:"Rascunho", sent:"Enviado",
    open:"Aberta", in_progress:"Em andamento", done:"Concluída", cancelled:"Cancelada",
  };

  function fmt(v) {
    return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v || 0);
  }

  function labelInput(label, required = false) {
    return (
      <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>
        {label}{required && <span style={{ color:"#ef4444" }}> *</span>}
      </label>
    );
  }

  function focusIn(e)  { e.target.style.borderColor = theme.primary; }
  function focusOut(e) { e.target.style.borderColor = isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput; }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <PageLayout>
      <style>{`
        .card3d-cl {
          background: ${isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard};
          border-radius:14px; padding:16px 20px;
          display:flex; align-items:center; gap:14px;
          backdrop-filter:${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          -webkit-backdrop-filter:${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          transition:transform 0.35s ease, box-shadow 0.35s ease;
          transform:perspective(700px) rotateX(5deg) rotateY(-3deg);
          box-shadow:${isGlass
            ? "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)"
            : "0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"};
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
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }}/>
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Clientes</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie sua carteira de clientes</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {/* Botão QR Code Universal */}
            <button
              style={{ background:"rgba(79,142,247,0.12)", color:"#4f8ef7", border:"1px solid rgba(79,142,247,0.3)", borderRadius:10, padding:"10px 16px", fontWeight:600, cursor:"pointer", fontSize:"0.85rem", whiteSpace:"nowrap" }}
              onClick={abrirQrModal}
            >
              📲 QR Code Universal
            </button>
            <button
              style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}
              onClick={openCreate}
            >
              + Novo Cliente
            </button>
          </div>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"👥", label:"Total de Clientes",  value:clients.length,                                color:theme.primary, border:isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44` },
            { icon:"📍", label:"Com GPS cadastrado", value:clients.filter(c=>c.latitude).length,          color:"#22c55e",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.3)" },
            { icon:"📋", label:"Com Orçamentos",     value:clients.filter(c=>c.quotes?.length>0).length,  color:theme.warning, border:isGlass?"rgba(255,255,255,0.5)":`${theme.warning}44` },
            { icon:"📦", label:"Com Pedidos",        value:clients.filter(c=>c.orders?.length>0).length,  color:theme.income,  border:isGlass?"rgba(255,255,255,0.5)":`${theme.income}44`  },
          ].map((c,i) => (
            <div key={i} className="card3d-cl" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"1rem":"1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BUSCA */}
        <div style={{ marginBottom:20 }}>
          <input
            style={{ ...inputStyle, width:isMobile?"100%":"360px" }}
            type="text"
            placeholder="🔍 Buscar por nome, email, telefone, documento ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* TABELA */}
        <div className="table3d-cl">
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>👥</span>
              <p>{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth:isMobile?"520px":"unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Nome","Telefone","GPS","Ações"]
                    : ["Nome","Email","Telefone","Cidade/UF","GPS","Ações"]
                  ).map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="cl-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, transition:"background 0.15s", cursor:"pointer" }} onClick={() => fetchDetail(c.id)}>
                    <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.85rem", color:theme.primary, flexShrink:0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:theme.textPrimary }}>{c.name}</div>
                          {isMobile && c.email && <div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    {!isMobile && <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textSecondary }}>{c.email || "—"}</td>}
                    <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textSecondary }}>{c.phone || "—"}</td>
                    {!isMobile && <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted }}>{c.municipio ? `${c.municipio}/${c.uf}` : "—"}</td>}
                    <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                      <span title={c.latitude ? `${c.latitude}, ${c.longitude}` : "Sem GPS"} style={{ fontSize:"1rem" }}>
                        {c.latitude ? "📍" : "⚠️"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", verticalAlign:"middle" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(c)}>✏️</button>
                        <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => setDeleteConfirm(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL QR CODE UNIVERSAL ── */}
      {qrModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)", padding:"16px" }} onClick={() => setQrModal(false)}>
          <div style={{ background:"#0a0f1e", border:"1px solid rgba(79,142,247,0.2)", borderRadius:24, padding:isMobile?"24px 20px":36, width:"100%", maxWidth:400, boxShadow:"0 24px 80px rgba(0,0,0,0.7)", textAlign:"center", maxHeight:"92vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>

            {/* Header com X */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"4px", color:"#4f8ef7", textTransform:"uppercase" }}>SV Finance</div>
                <div style={{ fontSize:"1rem", fontWeight:700, color:"#e2e8f0" }}>QR Code Universal</div>
              </div>
              <button
                onClick={() => setQrModal(false)}
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"#94a3b8", width:36, height:36, borderRadius:10, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
              >✕</button>
            </div>

            <div style={{ fontSize:12, color:"#475569", marginBottom:16 }}>
              1 adesivo para todos os clientes — identificação por GPS + O.S
            </div>

            {/* QR Code via quickchart.io */}
            <div style={{ background:"#fff", borderRadius:16, padding:16, display:"inline-block", marginBottom:16, boxShadow:"0 8px 30px rgba(0,0,0,0.3)" }}>
              <img
                src={QR_IMG_URL}
                alt="QR Code Universal SV Finance"
                width={240}
                height={240}
                style={{ display:"block", borderRadius:8 }}
              />
            </div>

            <div style={{ background:"rgba(79,142,247,0.08)", border:"1px solid rgba(79,142,247,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:20, fontSize:12, color:"#64748b", lineHeight:1.6, textAlign:"left" }}>
              <div style={{ color:"#4f8ef7", fontWeight:700, marginBottom:4 }}>Como funciona:</div>
              <div>1. Imprima este QR Code e cole na vitrine do cliente</div>
              <div>2. Colaborador seleciona a O.S no app e toca Check-in</div>
              <div>3. Sistema valida GPS automaticamente</div>
              <div>4. Mesmo adesivo funciona para todos os clientes</div>
            </div>

            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row" }}>
              <button style={{ flex:1, padding:"12px 0", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#64748b", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13 }} onClick={() => setQrModal(false)}>
                Fechar
              </button>
              <button style={{ flex:1, padding:"12px 0", background:"linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13, boxShadow:"0 4px 20px rgba(79,142,247,0.3)" }} onClick={imprimirQr}>
                🖨️ Imprimir adesivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRIAR/EDITAR ── */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:620, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editing?"✏️ Editar Cliente":"➕ Novo Cliente"}</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:8 }}>

                {/* ── DADOS BÁSICOS ── */}
                <div style={{ gridColumn:"1 / -1", color:theme.primary, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:4, paddingBottom:6, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}` }}>
                  👤 Dados do Cliente
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Código interno")}
                  <input style={inputStyle} placeholder="Ex: RG-001" value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("CPF / CNPJ")}
                  <input style={inputStyle} placeholder="000.000.000-00" value={form.document} onChange={e=>setForm({...form,document:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  {labelInput("Nome completo / Razão social", true)}
                  <input style={inputStyle} required placeholder="Nome do cliente" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Email")}
                  <input style={inputStyle} type="email" placeholder="cliente@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Telefone")}
                  <input style={inputStyle} placeholder="(44) 99999-9999" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                {/* ── ENDEREÇO ── */}
                <div style={{ gridColumn:"1 / -1", color:theme.primary, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1.5px", marginTop:8, marginBottom:4, paddingBottom:6, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}` }}>
                  📍 Endereço
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("CEP")}
                  <div style={{ position:"relative" }}>
                    <input style={{ ...inputStyle, paddingRight:40 }} placeholder="00000-000" value={form.cep}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,"").slice(0,8);
                        setForm({...form,cep:v});
                        if (v.length === 8) buscarCep(v);
                      }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                    {cepLoading && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, border:"2px solid rgba(79,142,247,0.3)", borderTop:"2px solid #4f8ef7", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>}
                    {!cepLoading && geoStatus==="ok"   && <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#22c55e", fontSize:14 }}>📍</span>}
                    {!cepLoading && geoStatus==="warn" && <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#f59e0b", fontSize:14 }}>⚠️</span>}
                  </div>
                  {geoStatus==="ok"   && <span style={{ fontSize:11, color:"#22c55e" }}>📍 Localização salva automaticamente</span>}
                  {geoStatus==="warn" && <span style={{ fontSize:11, color:"#f59e0b" }}>⚠️ CEP encontrado mas sem coordenadas GPS</span>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Número")}
                  <input style={inputStyle} placeholder="123" value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Logradouro")}
                  <input style={inputStyle} placeholder="Rua, Av..." value={form.logradouro} onChange={e=>setForm({...form,logradouro:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Bairro")}
                  <input style={inputStyle} placeholder="Bairro" value={form.bairro} onChange={e=>setForm({...form,bairro:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Município")}
                  <input style={inputStyle} placeholder="Maringá" value={form.municipio} onChange={e=>setForm({...form,municipio:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("UF")}
                  <input style={inputStyle} placeholder="PR" maxLength={2} value={form.uf} onChange={e=>setForm({...form,uf:e.target.value.toUpperCase()})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                {/* ── CONTRATO ── */}
                <div style={{ gridColumn:"1 / -1", color:theme.primary, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1.5px", marginTop:8, marginBottom:4, paddingBottom:6, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}` }}>
                  📋 Contrato
                </div>

                {/* Tipo + Status */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Tipo de contrato")}
                  <select style={{ ...inputStyle, cursor:"pointer" }} value={form.contrato_tipo} onChange={e=>setForm({...form,contrato_tipo:e.target.value})} onFocus={focusIn} onBlur={focusOut}>
                    <option value="avulso">Avulso (sem contrato)</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal (2x/mês)</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Status do contrato")}
                  <select style={{ ...inputStyle, cursor:"pointer" }} value={form.contrato_status} onChange={e=>setForm({...form,contrato_status:e.target.value})} onFocus={focusIn} onBlur={focusOut}>
                    <option value="ativo">✅ Ativo</option>
                    <option value="pausado">⏸️ Pausado</option>
                    <option value="encerrado">❌ Encerrado</option>
                  </select>
                </div>

                {/* Valor + Forma de pagamento */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Valor do contrato (R$)")}
                  <input style={inputStyle} type="number" step="0.01" placeholder="0,00" value={form.contrato_valor} onChange={e=>setForm({...form,contrato_valor:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Forma de pagamento")}
                  <select style={{ ...inputStyle, cursor:"pointer" }} value={form.contrato_forma_pagamento} onChange={e=>setForm({...form,contrato_forma_pagamento:e.target.value})} onFocus={focusIn} onBlur={focusOut}>
                    <option value="">Selecionar...</option>
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto</option>
                    <option value="deposito">Depósito</option>
                    <option value="carne">Carnê</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                {/* Dia de pagamento + Dias da semana de execução */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Dia de pagamento (dia do mês)")}
                  <input style={inputStyle} type="number" min="1" max="31" placeholder="Ex: 10" value={form.contrato_dia_pagamento} onChange={e=>setForm({...form,contrato_dia_pagamento:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                {/* Dias da semana */}
                {form.contrato_tipo !== "avulso" && form.contrato_tipo !== "mensal" && form.contrato_tipo !== "anual" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8, gridColumn:"1 / -1" }}>
                    {labelInput("Dias de execução")}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {DIAS_SEMANA.map(d => {
                        const selecionados = (form.contrato_dias_semana || "").split(",").filter(Boolean);
                        const sel = selecionados.includes(d.value);
                        return (
                          <button key={d.value} type="button"
                            style={{ padding:"6px 14px", borderRadius:20, fontSize:"0.8rem", fontWeight:700, cursor:"pointer", border:"none", fontFamily:"inherit",
                              background: sel ? theme.primary : isGlass?"rgba(255,255,255,0.2)":theme.bgCard,
                              color:      sel ? "#fff" : theme.textMuted,
                              boxShadow:  sel ? `0 2px 10px ${theme.primary}44` : "none",
                            }}
                            onClick={() => {
                              const lista = (form.contrato_dias_semana || "").split(",").filter(Boolean);
                              const nova  = sel ? lista.filter(x=>x!==d.value) : [...lista, d.value];
                              setForm({...form, contrato_dias_semana: nova.sort().join(",")});
                            }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize:11, color:theme.textMuted }}>
                      {form.contrato_tipo === "quinzenal" ? "Selecione 2 dias por semana" : "Selecione 1 dia por semana"}
                    </span>
                  </div>
                )}

                {/* Início + Fim */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Início do contrato")}
                  <input style={{ ...inputStyle, colorScheme }} type="date" value={form.contrato_inicio} onChange={e=>setForm({...form,contrato_inicio:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {labelInput("Fim do contrato")}
                  <input style={{ ...inputStyle, colorScheme }} type="date" value={form.contrato_fim} onChange={e=>setForm({...form,contrato_fim:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                {/* Observações do contrato */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  {labelInput("Observações do contrato")}
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:60 }} placeholder="Ex: cliente prefere manhãs, acesso pelo portão lateral..." value={form.contrato_observacoes} onChange={e=>setForm({...form,contrato_observacoes:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

                {/* ── OBSERVAÇÕES GERAIS ── */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  {labelInput("Observações gerais")}
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:60 }} placeholder="Informações adicionais..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} onFocus={focusIn} onBlur={focusOut}/>
                </div>

              </div>

              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row", marginTop:16 }}>
                <button type="button" style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width:isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar Cliente"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETALHE ── */}
      {detailModal && detailClient && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDetailModal(false)}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`, border:`2px solid ${isGlass?"rgba(255,255,255,0.6)":`${theme.primary}44`}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1.2rem", color:theme.primary }}>
                  {detailClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{detailClient.name}</h2>
                  <p style={{ margin:0, fontSize:"0.8rem", color:theme.textMuted }}>
                    Cadastrado em {detailClient.created_at?.split("-").reverse().join("/") || "—"}
                    {" · "}
                    <span style={{ color: detailClient.latitude ? "#22c55e" : "#f59e0b" }}>
                      {detailClient.latitude ? "📍 GPS ativo" : "⚠️ Sem GPS"}
                    </span>
                  </p>
                </div>
              </div>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={() => setDetailModal(false)}>✕</button>
            </div>

            {/* Dados */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:20, background:isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:12, padding:"16px 20px" }}>
              {[
                { label:"Email",     value:detailClient.email    },
                { label:"Telefone",  value:detailClient.phone    },
                { label:"CPF/CNPJ", value:detailClient.document  },
                { label:"CEP",       value:detailClient.cep      },
                { label:"Logradouro",value:detailClient.logradouro && detailClient.numero ? `${detailClient.logradouro}, ${detailClient.numero}` : detailClient.logradouro },
                { label:"Cidade/UF", value:detailClient.municipio && detailClient.uf ? `${detailClient.municipio}/${detailClient.uf}` : null },
                { label:"Localização GPS", value:detailClient.latitude ? `${detailClient.latitude.toFixed(6)}, ${detailClient.longitude.toFixed(6)}` : "Não cadastrada" },
              ].map((f,i) => (
                <div key={i}>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:"0.9rem", color: f.label === "Localização GPS" && detailClient.latitude ? "#22c55e" : theme.textPrimary }}>{f.value || "—"}</div>
                </div>
              ))}
              {detailClient.notes && (
                <div style={{ gridColumn:"1 / -1" }}>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Observações</div>
                  <div style={{ fontSize:"0.9rem", color:theme.textPrimary }}>{detailClient.notes}</div>
                </div>
              )}
            </div>

            {/* Orçamentos */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 10px 0" }}>📋 Orçamentos ({detailClient.quotes?.length || 0})</p>
              {detailClient.quotes?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {detailClient.quotes.map(q => {
                    const s = STATUS_COLOR[q.status] || STATUS_COLOR.draft;
                    return (
                      <div key={q.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:10, padding:"10px 14px" }}>
                        <div>
                          <span style={{ fontWeight:600, color:theme.primary, fontSize:"0.88rem" }}>{q.number}</span>
                          <span style={{ marginLeft:8, fontSize:"0.75rem", color:theme.textMuted }}>{q.created_at?.split("-").reverse().join("/")}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:"0.88rem", fontWeight:600, color:theme.income }}>{fmt(q.total)}</span>
                          <span style={{ fontSize:"0.72rem", fontWeight:600, padding:"2px 8px", borderRadius:20, background:s.bg, color:s.color }}>{STATUS_LABEL[q.status] || q.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color:theme.textMuted, fontSize:"0.85rem" }}>Nenhum orçamento.</p>}
            </div>

            {/* Pedidos */}
            <div>
              <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 10px 0" }}>📦 Pedidos / O.S ({detailClient.orders?.length || 0})</p>
              {detailClient.orders?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {detailClient.orders.map(o => {
                    const s = STATUS_COLOR[o.status] || STATUS_COLOR.open;
                    return (
                      <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:10, padding:"10px 14px" }}>
                        <div>
                          <span style={{ fontWeight:600, color:theme.primary, fontSize:"0.88rem" }}>{o.number}</span>
                          <span style={{ marginLeft:8, fontSize:"0.75rem", color:theme.textMuted }}>{o.created_at?.split("-").reverse().join("/")}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:"0.88rem", fontWeight:600, color:theme.income }}>{fmt(o.total)}</span>
                          <span style={{ fontSize:"0.72rem", fontWeight:600, padding:"2px 8px", borderRadius:20, background:s.bg, color:s.color }}>{STATUS_LABEL[o.status] || o.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color:theme.textMuted, fontSize:"0.85rem" }}>Nenhum pedido.</p>}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:24, flexDirection:isMobile?"column":"row" }}>
              <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => setDetailModal(false)}>Fechar</button>
              {/* Botão para salvar GPS exato no local */}
              <button style={{ background:"rgba(34,197,94,0.12)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.3)", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }}
                onClick={async () => {
                  if (!navigator.geolocation) { showToast("GPS não disponível.", "error"); return; }
                  navigator.geolocation.getCurrentPosition(async pos => {
                    try {
                      const res = await fetch(`${API}/clients/${detailClient.id}/set-location`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                        body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                      });
                      const data = await res.json();
                      if (res.ok) { showToast("📍 Localização exata salva!"); fetchClients(); setDetailModal(false); }
                      else showToast(data.msg || "Erro.", "error");
                    } catch { showToast("Erro de conexão.", "error"); }
                  }, () => showToast("GPS negado ou indisponível.", "error"), { enableHighAccuracy: true, maximumAge: 0 });
                }}>
                📍 Salvar localização exata aqui
              </button>
              <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width:isMobile?"100%":"auto" }} onClick={() => { setDetailModal(false); openEdit(detailClient); }}>✏️ Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DELETE ── */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Cliente</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Excluir <strong style={{ color:theme.textPrimary }}>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
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
