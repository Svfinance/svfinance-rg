import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

const ROLES = [
  { value: "admin",       label: "Admin",       desc: "Acesso total"                   },
  { value: "encarregado", label: "Encarregado", desc: "Supervisiona equipe + gera PIN" },
  { value: "financial",   label: "Financeiro",  desc: "Transações e relatórios"        },
  { value: "seller",      label: "Vendedor",    desc: "Orçamentos e vendas"            },
  { value: "stock",       label: "Estoque",     desc: "Produtos e movimentações"       },
  { value: "viewer",      label: "Visualizar",  desc: "Somente leitura"                },
];

const EMPTY_FORM = { name: "", email: "", role: "seller", password: "" };

export default function Team() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();

  const myUserId = parseInt(localStorage.getItem("user_id") || "0");

  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [members, setMembers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editing, setEditing]             = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast]                 = useState(null);
  const [search, setSearch]               = useState("");
  const [filterRole, setFilterRole]       = useState("all");

  async function fetchTeam() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/users`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      if (res.status === 403) { navigate("/dashboard"); return; }
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar equipe.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchTeam(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setModalOpen(true);
  }

  function openEdit(m) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, role: m.role, password: "" });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;

    const url    = editing ? `${API}/company/users/${editing.id}` : `${API}/company/users`;
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(editing ? "Membro atualizado!" : "Membro convidado! Email de acesso enviado.");
        setModalOpen(false);
        fetchTeam();
      } else {
        const err = await res.json();
        showToast(err.msg || "Erro.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/company/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) { showToast("Membro removido."); setDeleteConfirm(null); fetchTeam(); }
      else { const err = await res.json(); showToast(err.msg || "Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleToggleActive(m) {
    try {
      await fetch(`${API}/company/users/${m.id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchTeam();
    } catch { showToast("Erro.", "error"); }
  }

  const filtered = members.filter(m => {
    const roleOk   = filterRole === "all" || m.role === filterRole;
    const searchOk = m.name?.toLowerCase().includes(search.toLowerCase()) ||
                     m.email?.toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  });

  const roleColor = (role) => ({
    admin:       { color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
    encarregado: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    financial:   { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
    seller:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
    stock:       { color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    viewer:      { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  }[role] || { color: theme.textMuted, bg: "transparent" });

  const roleLabel = (role) => ROLES.find(r => r.value === role)?.label || role;

  // estilos
  const inputStyle   = { background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`, borderRadius: 10, padding: "10px 14px", color: theme.textPrimary, fontSize: "0.9rem", outline: "none", width: "100%", boxSizing: "border-box", colorScheme, ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }) };
  const selectStyle  = { ...inputStyle, cursor: "pointer" };
  const modalBg      = isGlass ? { backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)" } : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };
  const btnPrimary   = { background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: `0 4px 15px ${theme.primary}33` };
  const btnSecondary = { background: isGlass ? "rgba(255,255,255,0.3)" : theme.bgCard, color: theme.textSecondary, border: `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderCard}`, borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" };
  const fieldStyle   = { display: "flex", flexDirection: "column", gap: 6 };
  const labelStyle   = { color: theme.textSecondary, fontSize: "0.8rem", fontWeight: 600 };
  const th           = { textAlign: "left", padding: "12px 16px", color: theme.textMuted, fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: isGlass ? "rgba(255,255,255,0.1)" : theme.bgCard, borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.3)" : theme.borderCard}`, whiteSpace: "nowrap" };
  const td           = { padding: "12px 16px", verticalAlign: "middle" };

  const admins    = members.filter(m => m.role === "admin").length;
  const ativos    = members.filter(m => m.active !== false).length;
  const inativos  = members.length - ativos;

  return (
    <PageLayout>
      <style>{`
        .table3d-team { background:${isGlass ? "rgba(255,255,255,0.18)" : theme.bgCard}; border:1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}; border-radius:16px; overflow-x:auto; box-shadow:${isGlass ? "0 4px 24px rgba(0,0,0,0.07)" : "0 12px 32px rgba(0,0,0,0.3)"}; ${isGlass ? "backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);" : ""} }
        .team-row { transition:background 0.15s; }
        .team-row:hover { background:${isGlass ? "rgba(255,255,255,0.15)" : `${theme.primary}0d`} !important; }
        .card3d-team { background:${isGlass ? "rgba(255,255,255,0.25)" : theme.bgCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass ? "blur(18px)" : "blur(6px)"}; -webkit-backdrop-filter:${isGlass ? "blur(18px)" : "blur(6px)"}; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass ? "0 4px 20px rgba(0,0,0,0.07)" : "0 20px 48px rgba(0,0,0,0.3)"}; }
        .card3d-team:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px); }
        @media (max-width:768px) { .card3d-team { transform:none !important; } .card3d-team:hover { transform:translateY(-6px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile ? 44 : 60, height: isMobile ? 44 : 60, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile ? "20px" : "1.75rem", fontWeight: 700, margin: 0, color: theme.textPrimary }}>Equipe</h1>
              <p style={{ color: theme.textMuted, margin: "4px 0 0", fontSize: "0.85rem" }}>Gerencie os membros e permissões da sua empresa</p>
            </div>
          </div>
          <button style={{ ...btnPrimary, whiteSpace: "nowrap" }} onClick={openCreate}>+ Convidar Membro</button>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { icon: "👥", label: "Total",    value: members.length, color: theme.primary, border: isGlass ? "rgba(255,255,255,0.5)" : `${theme.primary}44` },
            { icon: "✅", label: "Ativos",   value: ativos,         color: "#22c55e",     border: isGlass ? "rgba(255,255,255,0.5)" : "rgba(34,197,94,0.3)"  },
            { icon: "🔴", label: "Inativos", value: inativos,       color: "#ef4444",     border: isGlass ? "rgba(255,255,255,0.5)" : "rgba(239,68,68,0.3)"  },
            { icon: "👑", label: "Admins",   value: admins,         color: "#f59e0b",     border: isGlass ? "rgba(255,255,255,0.5)" : "rgba(245,158,11,0.3)" },
          ].map((c, i) => (
            <div key={i} className="card3d-team" style={{ border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: "1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color: theme.textMuted, fontSize: "0.75rem", marginBottom: 2 }}>{c.label}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: isMobile ? "1rem" : "1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <input style={{ ...inputStyle, width: isMobile ? "100%" : "260px" }} type="text" placeholder="🔍 Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", ...ROLES.map(r => r.value)].map(r => (
              <button key={r} style={{ background: filterRole === r ? `${theme.primary}33` : (isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard), color: filterRole === r ? theme.textActive : theme.textMuted, border: filterRole === r ? `1px solid ${theme.primary}66` : `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`, borderRadius: 8, padding: "6px 14px", fontSize: "0.82rem", cursor: "pointer" }} onClick={() => setFilterRole(r)}>
                {r === "all" ? "Todos" : ROLES.find(x => x.value === r)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="table3d-team">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, color: theme.textMuted }}>
              <span style={{ fontSize: "2rem" }}>👤</span>
              <p>{search ? "Nenhum membro encontrado" : "Nenhum membro cadastrado"}</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: isMobile ? "520px" : "unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Membro", "Perfil", "Status", "Ações"]
                    : ["Membro", "Email", "Perfil", "Email Verificado", "Status", "Ações"]
                  ).map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const rc      = roleColor(m.role);
                  const isMe    = m.id === myUserId;
                  const isAtivo = m.active !== false;
                  return (
                    <tr key={m.id} className="team-row" style={{ borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.15)" : theme.border}` }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${theme.primary}22`, border: `2px solid ${theme.primary}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, fontWeight: 700, color: theme.primary }}>
                            {(m.name || m.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: theme.textPrimary, fontSize: "0.9rem" }}>
                              {m.name || "—"} {isMe && <span style={{ fontSize: "0.7rem", color: theme.primary, fontWeight: 700 }}>(você)</span>}
                            </div>
                            {isMobile && <div style={{ fontSize: "0.72rem", color: theme.textMuted }}>{m.email}</div>}
                          </div>
                        </div>
                      </td>
                      {!isMobile && <td style={{ ...td, color: theme.textMuted, fontSize: "0.85rem" }}>{m.email}</td>}
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: rc.bg, color: rc.color }}>
                          {roleLabel(m.role)}
                        </span>
                      </td>
                      {!isMobile && (
                        <td style={td}>
                          <span style={{ fontSize: "0.82rem", color: m.email_verified ? "#22c55e" : "#f59e0b" }}>
                            {m.email_verified ? "✅ Verificado" : "⏳ Pendente"}
                          </span>
                        </td>
                      )}
                      <td style={td}>
                        {isMe ? (
                          <span style={{ fontSize: "0.78rem", color: theme.textMuted }}>—</span>
                        ) : (
                          <button style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${isAtivo ? "#22c55e" : "#ef4444"}44`, background: isAtivo ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: isAtivo ? "#22c55e" : "#ef4444" }} onClick={() => handleToggleActive(m)}>
                            {isAtivo ? "Ativo" : "Inativo"}
                          </button>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ background: `${theme.primary}22`, border: `1px solid ${theme.primary}44`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => openEdit(m)}>✏️</button>
                          {!isMe && (
                            <button style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => setDeleteConfirm(m)}>🗑️</button>
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

        {/* LEGENDA DE PERFIS */}
        <div style={{ marginTop: 24, padding: "16px 20px", background: isGlass ? "rgba(255,255,255,0.12)" : theme.bgCard, border: `1px solid ${isGlass ? "rgba(255,255,255,0.25)" : theme.borderCard}`, borderRadius: 14 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Perfis de Acesso</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
            {ROLES.map(r => {
              const rc = roleColor(r.value);
              return (
                <div key={r.value} style={{ padding: "8px 12px", borderRadius: 10, background: rc.bg, border: `1px solid ${rc.color}33` }}>
                  <div style={{ fontWeight: 700, color: rc.color, fontSize: "0.82rem", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: "0.72rem", color: theme.textMuted }}>{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
          <div style={{ ...modalBg, borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 500, boxShadow: isGlass ? "0 20px 60px rgba(0,0,0,0.15)" : "0 25px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: theme.textPrimary }}>{editing ? "✏️ Editar Membro" : "➕ Convidar Membro"}</h2>
              <button style={{ background: isGlass ? "rgba(255,255,255,0.4)" : theme.bgCard, border: "none", color: theme.textPrimary, width: 32, height: 32, borderRadius: 8, cursor: "pointer" }} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Nome *</label>
                  <input style={inputStyle} required placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} required type="email" placeholder="email@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
                  {editing && <span style={{ fontSize: "0.72rem", color: theme.textMuted, paddingLeft: 4 }}>Email não pode ser alterado</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Perfil de Acesso *</label>
                  <select style={selectStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{editing ? "Nova Senha (deixe vazio para manter)" : "Senha inicial *"}</label>
                  <input style={inputStyle} type="password" placeholder={editing ? "••••••••" : "Mínimo 6 caracteres"} required={!editing} minLength={editing ? 0 : 6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                <button type="button" style={{ ...btnSecondary, width: isMobile ? "100%" : "auto" }} onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, width: isMobile ? "100%" : "auto" }}>{editing ? "Salvar" : "Convidar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border: "1px solid rgba(239,68,68,0.3)", borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 400, boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "#ef4444" }}>Remover Membro</h2>
            <p style={{ color: theme.textSecondary, marginBottom: 24 }}>
              Remover <strong style={{ color: theme.textPrimary }}>{deleteConfirm.name}</strong> da equipe? O usuário perderá acesso imediatamente.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: isMobile ? "column" : "row" }}>
              <button style={{ ...btnSecondary, width: isMobile ? "100%" : "auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", width: isMobile ? "100%" : "auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, right: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", background: toast.type === "error" ? "#ef4444" : theme.primaryGrad }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}