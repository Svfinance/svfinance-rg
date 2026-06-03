import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

// ── Restaura Glass — tema e identidade ───────────────────────────────────────
const RG = {
  verde:    "#16a34a",
  verdeClr: "rgba(22,163,74,0.12)",
  verdeBd:  "rgba(22,163,74,0.22)",
  bg:       "#f4fbf6",
  cardBg:   "rgba(255,255,255,0.92)",
  text:     "#111827",
  textSub:  "#374151",
  textMut:  "#9ca3af",
};

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// Roles disponíveis para a Restaura Glass
const ROLES = [
  { value: "admin",       label: "Administrador", desc: "Acesso total ao sistema",                  color: "#ef4444" },
  { value: "encarregado", label: "Encarregado",   desc: "Supervisiona equipe em campo + gera PIN",  color: "#a78bfa" },
  { value: "seller",      label: "Técnico",        desc: "Executa serviços, acessa cartões e O.S.",  color: "#22c55e" },
  { value: "viewer",      label: "Visualizador",  desc: "Somente leitura — relatórios",              color: "#9ca3af" },
];

const EMPTY_FORM = { name: "", email: "", role: "seller", password: "" };

export default function Team() {
  const { theme } = useTheme();
  const isMobile  = useIsMobile();
  const navigate  = useNavigate();

  const myUserId = parseInt(localStorage.getItem("user_id") || "0");

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterRole,    setFilterRole]    = useState("all");

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
    finally   { setLoading(false); }
  }

  useEffect(() => { fetchTeam(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }

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
        showToast(editing ? "Colaborador atualizado!" : "Colaborador criado! Email de acesso enviado.");
        setModalOpen(false); fetchTeam();
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
      if (res.ok) { showToast("Colaborador removido."); setDeleteConfirm(null); fetchTeam(); }
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
    const searchOk = (m.name  || "").toLowerCase().includes(search.toLowerCase()) ||
                     (m.email || "").toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  });

  const roleInfo = (role) => ROLES.find(r => r.value === role) || { label: role, color: RG.textMut };
  const admins   = members.filter(m => m.role === "admin").length;
  const ativos   = members.filter(m => m.active !== false).length;
  const campo    = members.filter(m => m.role === "encarregado" || m.role === "seller").length;

  // ── Estilos ──────────────────────────────────────────────────────────────────
  const inp = {
    border: `1px solid ${RG.verdeBd}`, borderRadius: 8, padding: "10px 14px",
    background: "#fff", color: RG.text, fontSize: "0.9rem",
    outline: "none", width: "100%", boxSizing: "border-box", colorScheme: "light",
  };
  const sel  = { ...inp, cursor: "pointer" };
  const lbl  = { color: RG.textSub, fontSize: "0.8rem", fontWeight: 600, marginBottom: 4, display: "block" };
  const fld  = { display: "flex", flexDirection: "column", gap: 4 };
  const btnV = { background: RG.verde, color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" };
  const btnB = { background: "#fff", color: RG.verde, border: `2px solid ${RG.verde}`, borderRadius: 9, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" };
  const th   = { textAlign: "left", padding: "12px 16px", color: RG.textMut, fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(22,163,74,0.04)", borderBottom: `1px solid ${RG.verdeBd}`, whiteSpace: "nowrap" };
  const td   = { padding: "12px 16px", verticalAlign: "middle" };

  return (
    <PageLayout>
      <style>{`
        .rg-team-table { background:${RG.cardBg}; border:1px solid ${RG.verdeBd}; border-radius:16px; overflow-x:auto; box-shadow:0 4px 20px rgba(22,163,74,0.07); }
        .rg-team-row { transition:background 0.15s; }
        .rg-team-row:hover { background:rgba(22,163,74,0.04) !important; }
        .rg-card { background:${RG.cardBg}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; border:1px solid ${RG.verdeBd}; box-shadow:0 2px 12px rgba(22,163,74,0.06); }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, padding: isMobile ? "72px 16px 40px" : "32px 36px", overflowY: "auto", position: "relative", zIndex: 1, background: RG.bg, minHeight: "100vh" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 8, background: RG.verde, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: "1.1rem", flexShrink: 0 }}>RG</div>
            <div>
              <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.6rem", fontWeight: 700, margin: 0, color: RG.verde }}>Equipe</h1>
              <p style={{ color: RG.textMut, margin: "3px 0 0", fontSize: "0.82rem" }}>Restaura Glass · Gerencie colaboradores e acessos</p>
            </div>
          </div>
          <button style={{ ...btnV, whiteSpace: "nowrap" }} onClick={openCreate}>+ Novo Colaborador</button>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "👥", label: "Total",       value: members.length, color: RG.verde,   border: RG.verdeBd },
            { icon: "✅", label: "Ativos",      value: ativos,         color: "#22c55e",  border: "rgba(34,197,94,0.25)"  },
            { icon: "🔧", label: "Em campo",    value: campo,          color: "#a78bfa",  border: "rgba(167,139,250,0.25)" },
            { icon: "👑", label: "Admins",      value: admins,         color: "#f59e0b",  border: "rgba(245,158,11,0.25)" },
          ].map((c, i) => (
            <div key={i} className="rg-card" style={{ border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: "1.4rem" }}>{c.icon}</div>
              <div>
                <div style={{ color: RG.textMut, fontSize: "0.72rem", marginBottom: 2 }}>{c.label}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: isMobile ? "1rem" : "1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
          <input style={{ ...inp, width: isMobile ? "100%" : "280px" }} type="text"
            placeholder="🔍 Buscar por nome ou email..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", ...ROLES.map(r => r.value)].map(r => (
              <button key={r}
                style={{ background: filterRole === r ? RG.verde : "#fff", color: filterRole === r ? "#fff" : RG.textSub, border: `1px solid ${filterRole === r ? RG.verde : RG.verdeBd}`, borderRadius: 8, padding: "7px 14px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                onClick={() => setFilterRole(r)}>
                {r === "all" ? "Todos" : ROLES.find(x => x.value === r)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="rg-team-table">
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: RG.textMut }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: RG.textMut }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>👤</div>
              <p>{search ? "Nenhum colaborador encontrado" : "Nenhum colaborador cadastrado"}</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: isMobile ? "520px" : "unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Colaborador", "Perfil", "Status", "Ações"]
                    : ["Colaborador", "Email", "Perfil", "Verificado", "Status", "Ações"]
                  ).map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const ri    = roleInfo(m.role);
                  const isMe  = m.id === myUserId;
                  const ativo = m.active !== false;
                  return (
                    <tr key={m.id} className="rg-team-row" style={{ borderBottom: `1px solid ${RG.verdeBd}` }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: RG.verdeClr, border: `2px solid ${RG.verdeBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: RG.verde, flexShrink: 0 }}>
                            {(m.name || m.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: RG.text, display: "flex", alignItems: "center", gap: 6 }}>
                              {m.name || "—"}
                              {isMe && <span style={{ fontSize: "0.7rem", color: RG.verde, fontWeight: 700 }}>(você)</span>}
                            </div>
                            {isMobile && <div style={{ fontSize: "0.72rem", color: RG.textMut }}>{m.email}</div>}
                          </div>
                        </div>
                      </td>
                      {!isMobile && <td style={{ ...td, color: RG.textSub, fontSize: "0.84rem" }}>{m.email}</td>}
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: `${ri.color}18`, color: ri.color, border: `1px solid ${ri.color}33` }}>
                          {ri.label}
                        </span>
                      </td>
                      {!isMobile && (
                        <td style={td}>
                          <span style={{ fontSize: "0.82rem", color: m.email_verified ? "#22c55e" : "#f59e0b" }}>
                            {m.email_verified ? "✅ Sim" : "⏳ Pendente"}
                          </span>
                        </td>
                      )}
                      <td style={td}>
                        {isMe ? (
                          <span style={{ fontSize: "0.78rem", color: RG.textMut }}>—</span>
                        ) : (
                          <button
                            style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${ativo ? "#22c55e" : "#ef4444"}44`, background: ativo ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", color: ativo ? "#22c55e" : "#ef4444", fontFamily: "inherit" }}
                            onClick={() => handleToggleActive(m)}>
                            {ativo ? "Ativo" : "Inativo"}
                          </button>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ background: RG.verdeClr, border: `1px solid ${RG.verdeBd}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => openEdit(m)}>✏️</button>
                          {!isMe && (
                            <button style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => setDeleteConfirm(m)}>🗑️</button>
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
        <div style={{ marginTop: 24, padding: "16px 20px", background: RG.cardBg, border: `1px solid ${RG.verdeBd}`, borderRadius: 14 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: RG.textMut, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Perfis de Acesso — Restaura Glass</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
            {ROLES.map(r => (
              <div key={r.value} style={{ padding: "10px 14px", borderRadius: 10, background: `${r.color}10`, border: `1px solid ${r.color}30` }}>
                <div style={{ fontWeight: 700, color: r.color, fontSize: "0.85rem", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: "0.75rem", color: RG.textSub }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "#fff", border: `1px solid ${RG.verdeBd}`, borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(22,163,74,0.12)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: RG.verde }}>{editing ? "✏️ Editar Colaborador" : "➕ Novo Colaborador"}</h2>
              <button style={{ background: RG.verdeClr, border: "none", color: RG.verde, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "1rem" }} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            {!editing && (
              <div style={{ background: "rgba(22,163,74,0.06)", border: `1px solid ${RG.verdeBd}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: "0.82rem", color: RG.textSub }}>
                📧 Será enviado um email com as credenciais de acesso para o colaborador.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div style={fld}>
                  <label style={lbl}>Nome completo *</label>
                  <input style={inp} required placeholder="Ex: João da Silva" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={fld}>
                  <label style={lbl}>Email *</label>
                  <input style={{ ...inp, opacity: editing ? 0.6 : 1, cursor: editing ? "default" : "text" }} required type="email" placeholder="colaborador@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
                  {editing && <span style={{ fontSize: "0.72rem", color: RG.textMut }}>Email não pode ser alterado</span>}
                </div>
                <div style={fld}>
                  <label style={lbl}>Perfil de acesso *</label>
                  <select style={sel} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>{editing ? "Nova senha (deixe vazio para manter)" : "Senha inicial *"}</label>
                  <input style={inp} type="password" placeholder={editing ? "Deixe vazio para manter" : "Mínimo 6 caracteres"} required={!editing} minLength={editing ? 0 : 6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                <button type="button" style={{ ...btnB, width: isMobile ? "100%" : "auto" }} onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" style={{ ...btnV, width: isMobile ? "100%" : "auto" }}>{editing ? "💾 Salvar" : "✅ Criar Colaborador"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "#fff", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 18, padding: isMobile ? "24px 20px" : 32, width: isMobile ? "92%" : "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", fontWeight: 700, color: "#ef4444" }}>Remover Colaborador</h2>
            <p style={{ color: RG.textSub, marginBottom: 24 }}>
              Remover <strong style={{ color: RG.text }}>{deleteConfirm.name}</strong> da equipe?<br/>
              <span style={{ fontSize: "0.82rem", color: RG.textMut }}>O acesso será revogado imediatamente.</span>
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: isMobile ? "column" : "row" }}>
              <button style={{ ...btnB, width: isMobile ? "100%" : "auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, cursor: "pointer", width: isMobile ? "100%" : "auto", fontFamily: "inherit" }} onClick={() => handleDelete(deleteConfirm.id)}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, right: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.9rem", zIndex: 9999, background: toast.type === "error" ? "#ef4444" : RG.verde }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}