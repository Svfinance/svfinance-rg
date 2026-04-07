import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "http://localhost:5000/api";
const token = () => localStorage.getItem("token");

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const EMPTY_FORM = {
  name: "", email: "", phone: "", document: "", address: "", notes: "",
};

export default function Clients() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailClient, setDetailClient]   = useState(null);
  const [detailModal, setDetailModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [toast, setToast]             = useState(null);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar clientes.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchDetail(id) {
    try {
      const res = await fetch(`${API}/clients/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setDetailClient(data);
      setDetailModal(true);
    } catch { showToast("Erro ao carregar detalhes.", "error"); }
  }

  useEffect(() => { fetchClients(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name, email: c.email||"", phone: c.phone||"", document: c.document||"", address: c.address||"", notes: c.notes||"" });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nome é obrigatório.", "error"); return; }
    const url    = editing ? `${API}/clients/${editing.id}` : `${API}/clients`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { showToast(editing ? "Cliente atualizado!" : "Cliente criado!"); closeModal(); fetchClients(); }
      else { const err = await res.json(); showToast(err.msg || "Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/clients/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { showToast("Cliente removido."); setDeleteConfirm(null); fetchClients(); }
      else showToast("Erro ao remover.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.document || "").includes(search)
  );

  // ── estilos ──
  const inputStyle = {
    background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10, padding: "10px 14px", color: theme.textPrimary,
    fontSize: "0.9rem", outline: "none", width: "100%",
    boxSizing: "border-box", transition: "border-color 0.2s", colorScheme,
    ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
  };

  const modalBg = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };

  const STATUS_COLOR = {
    approved:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
    draft:       { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    sent:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
    open:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
    in_progress: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    done:        { color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
    cancelled:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  };

  const STATUS_LABEL = {
    approved: "Aprovado", draft: "Rascunho", sent: "Enviado",
    open: "Aberta", in_progress: "Em andamento", done: "Concluída", cancelled: "Cancelada",
  };

  function fmt(v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  }

  return (
    <PageLayout>

      <style>{`
        .card3d-cl {
          background: ${isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard};
          border-radius: 14px; padding: 16px 20px;
          display: flex; align-items: center; gap: 14px;
          backdrop-filter: ${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          -webkit-backdrop-filter: ${isGlass ? "blur(18px) saturate(180%)" : "blur(6px)"};
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          transform: perspective(700px) rotateX(5deg) rotateY(-3deg);
          box-shadow: ${isGlass
            ? "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)"
            : "0 20px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"};
          position: relative; overflow: hidden; cursor: default;
        }
        .card3d-cl::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,${isGlass ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)"},transparent);
        }
        .card3d-cl:hover {
          transform: perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px);
          box-shadow: ${isGlass ? "0 20px 48px rgba(0,0,0,0.1)" : "0 36px 72px rgba(0,0,0,0.5)"};
          background: ${isGlass ? "rgba(255,255,255,0.35)" : theme.bgCardHover};
        }
        .table3d-cl {
          background: ${isGlass ? "rgba(255,255,255,0.18)" : theme.bgCard};
          border: 1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard};
          border-radius: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;
          box-shadow: ${isGlass ? "0 4px 24px rgba(0,0,0,0.07)" : "0 12px 32px rgba(0,0,0,0.3)"};
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);" : "backdrop-filter: blur(4px);"}
        }
        .cl-row:hover { background: ${isGlass ? "rgba(255,255,255,0.15)" : `${theme.primary}0d`} !important; }
        @media (max-width: 768px) {
          .card3d-cl { transform: none !important; }
          .card3d-cl:hover { transform: translateY(-6px) !important; }
        }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Clientes</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie sua carteira de clientes</p>
            </div>
          </div>
          <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }} onClick={openCreate}>
            + Novo Cliente
          </button>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"👥", label:"Total de Clientes", value: clients.length,                                    color: theme.primary,  border: isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`  },
            { icon:"📋", label:"Com Orçamentos",    value: clients.filter(c=>c.quotes?.length>0).length,     color: theme.warning,  border: isGlass?"rgba(255,255,255,0.5)":`${theme.warning}44`  },
            { icon:"📦", label:"Com Pedidos",       value: clients.filter(c=>c.orders?.length>0).length,     color: theme.income,   border: isGlass?"rgba(255,255,255,0.5)":`${theme.income}44`   },
          ].map((c,i) => (
            <div key={i} className="card3d-cl" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize: isMobile?"1rem":"1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BUSCA */}
        <div style={{ marginBottom:20 }}>
          <input style={{ ...inputStyle, width: isMobile?"100%":"360px" }}
            type="text" placeholder="🔍 Buscar por nome, email, telefone ou documento..."
            value={search} onChange={e => setSearch(e.target.value)} />
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
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth: isMobile?"520px":"unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Nome","Telefone","Ações"]
                    : ["Nome","Email","Telefone","Documento","Cadastrado em","Ações"]
                  ).map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background: isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="cl-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, transition:"background 0.15s", cursor:"pointer" }}
                    onClick={() => fetchDetail(c.id)}>
                    <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {/* Avatar inicial */}
                        <div style={{ width:36, height:36, borderRadius:"50%", background: isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.85rem", color:theme.primary, flexShrink:0 }}>
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
                    {!isMobile && <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted }}>{c.document || "—"}</td>}
                    {!isMobile && <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted }}>{c.created_at ? c.created_at.split("-").reverse().join("/") : "—"}</td>}
                    <td style={{ padding:"12px 16px", verticalAlign:"middle" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button style={{ background: isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(c)}>✏️</button>
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

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editing?"✏️ Editar Cliente":"➕ Novo Cliente"}</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Nome *</label>
                  <input style={inputStyle} required placeholder="Nome completo ou razão social" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Email</label>
                  <input style={inputStyle} type="email" placeholder="cliente@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Telefone</label>
                  <input style={inputStyle} placeholder="(44) 99999-9999" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>CPF / CNPJ</label>
                  <input style={inputStyle} placeholder="000.000.000-00" value={form.document} onChange={e=>setForm({...form,document:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Endereço</label>
                  <input style={inputStyle} placeholder="Rua, número, cidade - UF" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={{ color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>Observações</label>
                  <textarea style={{ ...inputStyle, resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} onFocus={e=>e.target.style.borderColor=theme.primary} onBlur={e=>e.target.style.borderColor=isGlass?"rgba(255,255,255,0.4)":theme.borderInput} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection: isMobile?"column":"row" }}>
                <button type="button" style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width: isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar Cliente"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DO CLIENTE */}
      {detailModal && detailClient && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDetailModal(false)}>
          <div style={{ ...modalBg, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background: isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`, border:`2px solid ${isGlass?"rgba(255,255,255,0.6)":`${theme.primary}44`}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1.2rem", color:theme.primary }}>
                  {detailClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{detailClient.name}</h2>
                  <p style={{ margin:0, fontSize:"0.8rem", color:theme.textMuted }}>Cadastrado em {detailClient.created_at?.split("-").reverse().join("/") || "—"}</p>
                </div>
              </div>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={() => setDetailModal(false)}>✕</button>
            </div>

            {/* DADOS */}
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:24, background: isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:12, padding:"16px 20px" }}>
              {[
                { label:"Email",    value: detailClient.email    },
                { label:"Telefone", value: detailClient.phone    },
                { label:"CPF/CNPJ", value: detailClient.document },
                { label:"Endereço", value: detailClient.address  },
              ].map((f,i) => (
                <div key={i}>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:"0.9rem", color:theme.textPrimary }}>{f.value || "—"}</div>
                </div>
              ))}
              {detailClient.notes && (
                <div style={{ gridColumn:"1 / -1" }}>
                  <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Observações</div>
                  <div style={{ fontSize:"0.9rem", color:theme.textPrimary }}>{detailClient.notes}</div>
                </div>
              )}
            </div>

            {/* ORÇAMENTOS */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 10px 0" }}>📋 Orçamentos ({detailClient.quotes?.length || 0})</p>
              {detailClient.quotes?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {detailClient.quotes.map(q => {
                    const s = STATUS_COLOR[q.status] || STATUS_COLOR.draft;
                    return (
                      <div key={q.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background: isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:10, padding:"10px 14px" }}>
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
              ) : (
                <p style={{ color:theme.textMuted, fontSize:"0.85rem" }}>Nenhum orçamento encontrado.</p>
              )}
            </div>

            {/* PEDIDOS */}
            <div>
              <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 10px 0" }}>📦 Pedidos / O.S ({detailClient.orders?.length || 0})</p>
              {detailClient.orders?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {detailClient.orders.map(o => {
                    const s = STATUS_COLOR[o.status] || STATUS_COLOR.open;
                    return (
                      <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background: isGlass?"rgba(255,255,255,0.15)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, borderRadius:10, padding:"10px 14px" }}>
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
              ) : (
                <p style={{ color:theme.textMuted, fontSize:"0.85rem" }}>Nenhum pedido encontrado.</p>
              )}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:24, flexDirection: isMobile?"column":"row" }}>
              <button style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={() => setDetailModal(false)}>Fechar</button>
              <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width: isMobile?"100%":"auto" }} onClick={() => { setDetailModal(false); openEdit(detailClient); }}>✏️ Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border: isGlass?"1px solid rgba(239,68,68,0.3)":`1px solid rgba(239,68,68,0.3)`, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:400, boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Cliente</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Excluir <strong style={{ color:theme.textPrimary }}>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display:"flex", gap:12, flexDirection: isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
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