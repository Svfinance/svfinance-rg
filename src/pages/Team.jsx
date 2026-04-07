import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API   = "http://localhost:5000/api";
const token = () => localStorage.getItem("token");

const ROLES = [
  { value: "admin",     label: "👑 Admin",        desc: "Acesso total" },
  { value: "financial", label: "💰 Financeiro",   desc: "Transações, contas e analytics" },
  { value: "seller",    label: "🛒 Vendedor",     desc: "Clientes, orçamentos e vendas" },
  { value: "stock",     label: "📦 Estoque",      desc: "Produtos e movimentações" },
  { value: "viewer",    label: "👁️ Visualizador", desc: "Somente leitura" },
];

const EMPTY_FORM = { name: "", email: "", password: "", role: "seller" };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function Team() {
  const { theme, themeId } = useTheme();
  const isGlass     = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile    = useIsMobile();
  const navigate    = useNavigate();

  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [users, setUsers]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [modalOpen, setModalOpen]             = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm]     = useState(null);
  const [toast, setToast]                     = useState(null);
  const [plan, setPlan]                       = useState("free");

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/users`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      if (res.status === 403) { navigate("/dashboard"); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar usuários.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchCompany() {
    try {
      const res  = await fetch(`${API}/company`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setPlan(data.plan || "free");
    } catch {}
  }

  useEffect(() => { fetchUsers(); fetchCompany(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(u) {
    setEditing(u);
    // ✅ separa corretamente nome e email
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(e) {
    e.preventDefault();

    // validação extra no create
    if (!editing && !form.name.trim()) {
      showToast("Nome é obrigatório.", "error"); return;
    }
    if (!editing && !form.email.trim()) {
      showToast("Email é obrigatório.", "error"); return;
    }

    const url    = editing ? `${API}/company/users/${editing.id}` : `${API}/company/users`;
    const method = editing ? "PUT" : "POST";
    const payload = editing
      ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
      : { name: form.name, email: form.email, password: form.password, role: form.role };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editing ? "Usuário atualizado!" : "Usuário criado!");
        closeModal(); fetchUsers();
      } else {
        showToast(data.msg || "Erro.", "error");
      }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function handleToggle(u) {
    try {
      await fetch(`${API}/company/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ active: !u.active }),
      });
      fetchUsers();
    } catch { showToast("Erro ao atualizar.", "error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/company/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) { showToast("Usuário desativado."); setDeleteConfirm(null); fetchUsers(); }
      else showToast(data.msg || "Erro.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  const activeUsers   = users.filter(u => u.active).length;
  const inactiveUsers = users.filter(u => !u.active).length;
  const isPro         = plan !== "free";

  const inputStyle = {
    background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10, padding: "10px 14px", color: theme.textPrimary,
    fontSize: "0.9rem", outline: "none", width: "100%",
    boxSizing: "border-box", transition: "border-color 0.2s", colorScheme,
    ...(isGlass && { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
  };
  const inputDisabled = {
    ...inputStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };
  const selectStyle  = { ...inputStyle, cursor: "pointer" };
  const modalBg      = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background: theme.bgModal, border: `1px solid ${theme.borderCard}` };
  const btnPrimary   = { background: theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}33` };
  const btnSecondary = { background: isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" };
  const labelStyle   = { color: theme.textSecondary, fontSize: "0.8rem", fontWeight: 600 };
  const fieldStyle   = { display: "flex", flexDirection: "column", gap: 6 };
  const roleInfo     = (role) => ROLES.find(r => r.value === role) || { label: role, desc: "" };

  return (
    <PageLayout>

      <style>{`
        .card3d-tm {
          background: ${isGlass ? "rgba(255,255,255,0.25)" : theme.bgCard};
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
        .card3d-tm::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,${isGlass ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)"},transparent);
        }
        .card3d-tm:hover {
          transform: perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px);
          box-shadow: ${isGlass ? "0 20px 48px rgba(0,0,0,0.1)" : "0 36px 72px rgba(0,0,0,0.5)"};
        }
        .table3d-tm {
          background: ${theme.bgCard}; border: 1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard};
          border-radius: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;
          box-shadow: ${isGlass ? "0 4px 24px rgba(0,0,0,0.07)" : "0 12px 32px rgba(0,0,0,0.3)"};
          ${isGlass ? "backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);" : "backdrop-filter: blur(4px);"}
        }
        .tm-row { transition: background 0.15s; }
        .tm-row:hover { background: ${isGlass ? "rgba(255,255,255,0.15)" : `${theme.primary}0d`} !important; }
        @media (max-width: 768px) {
          .card3d-tm { transform: none !important; }
          .card3d-tm:hover { transform: translateY(-6px) !important; }
        }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding: isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width: isMobile?44:60, height: isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize: isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Gestão de Equipe</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie usuários e permissões da sua empresa</p>
            </div>
          </div>
          <button
            style={{ ...btnPrimary, whiteSpace:"nowrap", opacity: !isPro && users.length >= 10 ? 0.5 : 1, cursor: !isPro && users.length >= 10 ? "not-allowed" : "pointer" }}
            onClick={() => { if (!isPro && users.length >= 10) { showToast("Limite atingido para desenvolvimento.", "error"); return; } openCreate(); }}
          >
            + Novo Usuário
          </button>
        </div>

        {/* CARDS */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"👥", label:"Total de Usuários", value: users.length,  color:theme.primary, border: isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44` },
            { icon:"✅", label:"Ativos",            value: activeUsers,   color:theme.income,  border: isGlass?"rgba(255,255,255,0.5)":`${theme.income}44`  },
            { icon:"⛔", label:"Inativos",          value: inactiveUsers, color: inactiveUsers > 0 ? "#ef4444" : theme.textMuted, border: isGlass?"rgba(255,255,255,0.5)": inactiveUsers > 0?"rgba(239,68,68,0.3)":theme.borderCard },
          ].map((c, i) => (
            <div key={i} className="card3d-tm" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize: isMobile?"1rem":"1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TABELA */}
        <div className="table3d-tm">
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
          ) : users.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>👤</span>
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth: isMobile?"480px":"unset" }}>
              <thead>
                <tr>
                  {(isMobile
                    ? ["Usuário", "Role", "Status", "Ações"]
                    : ["Usuário", "Email", "Role", "Permissões", "Status", "Ações"]
                  ).map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background: isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const ri = roleInfo(u.role);
                  return (
                    <tr key={u.id} className="tm-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}` }}>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background: isGlass?"rgba(255,255,255,0.3)":theme.primaryGrad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem", fontWeight:700, color:"#fff", flexShrink:0 }}>
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:theme.textPrimary }}>{u.name || "—"}</div>
                            {isMobile && <div style={{ fontSize:"0.72rem", color:theme.textMuted }}>{u.email}</div>}
                          </div>
                        </div>
                      </td>
                      {!isMobile && <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textSecondary, fontSize:"0.85rem" }}>{u.email}</td>}
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, background:`${theme.primary}22`, color:theme.primary }}>
                          {ri.label}
                        </span>
                      </td>
                      {!isMobile && (
                        <td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted, fontSize:"0.8rem" }}>{ri.desc}</td>
                      )}
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <button
                          style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, cursor:"pointer", border:`1px solid ${u.active?theme.income:theme.textMuted}44`, background: u.active?`${theme.income}22`:"rgba(100,116,139,0.12)", color: u.active?theme.income:theme.textMuted }}
                          onClick={() => handleToggle(u)}
                        >
                          {u.active ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button style={{ background:`${theme.primary}22`, border:`1px solid ${theme.primary}44`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(u)}>✏️</button>
                          <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => setDeleteConfirm(u)}>🗑️</button>
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
          <div style={{ ...modalBg, borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editing ? "✏️ Editar Usuário" : "➕ Novo Usuário"}</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>

                {/* NOME */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Nome completo *</label>
                  <input
                    style={inputStyle}
                    required
                    placeholder="Ex: João Silva"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>

                {/* EMAIL — editável no create, somente leitura no edit */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email {editing ? "(não editável)" : "*"}</label>
                  <input
                    style={editing ? inputDisabled : inputStyle}
                    required={!editing}
                    type="email"
                    placeholder="email@empresa.com"
                    value={form.email}
                    disabled={!!editing}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                  {editing && (
                    <span style={{ fontSize:"0.75rem", color:theme.textMuted, paddingLeft:4 }}>
                      O email de acesso não pode ser alterado.
                    </span>
                  )}
                </div>

                {/* SENHA */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>{editing ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="••••••••"
                    required={!editing}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                  />
                </div>

                {/* ROLE */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Role (Permissão) *</label>
                  <select style={selectStyle} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>

                {/* PREVIEW ROLE */}
                <div style={{ background: isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}22`}`, borderRadius:10, padding:"10px 16px", fontSize:"0.85rem", color:theme.textSecondary }}>
                  {form.role === "admin"     && "👑 Acesso total ao sistema"}
                  {form.role === "financial" && "💰 Acessa transações, contas, analytics, clientes, produtos e orçamentos"}
                  {form.role === "seller"    && "🛒 Acessa clientes, orçamentos, vendas e produtos"}
                  {form.role === "stock"     && "📦 Acessa produtos, estoque e movimentações"}
                  {form.role === "viewer"    && "👁️ Visualiza dashboard, clientes e produtos sem editar"}
                </div>

              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection: isMobile?"column":"row" }}>
                <button type="button" style={{ ...btnSecondary, width: isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ ...btnPrimary, width: isMobile?"100%":"auto" }}>{editing ? "Salvar" : "Criar Usuário"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding: isMobile?"24px 20px":32, width: isMobile?"92%":"100%", maxWidth:400, boxShadow: isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Desativar Usuário</h2>
              <button style={{ background: isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Desativar <strong style={{ color:theme.textPrimary }}>"{deleteConfirm.name}"</strong>? O usuário perderá acesso ao sistema.
            </p>
            <div style={{ display:"flex", gap:12, flexDirection: isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ ...btnSecondary, width: isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width: isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Desativar</button>
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