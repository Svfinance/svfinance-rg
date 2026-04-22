import { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { getSidebarStyle, setSidebarStyleLS } from "../components/layout/Sidebar";

const API   = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

const ROLE_LABELS = { admin:"Administrador", seller:"Vendedor", financial:"Financeiro", stock:"Estoque", viewer:"Visualizador" };
const PLAN_LABELS = { free:"🆓 Free", pro:"⚡ Pro", business:"🏢 Business" };

export default function Settings() {
  const { theme, themeId, changeTheme, themes } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray";
  const isMobile = useIsMobile();
  const role     = localStorage.getItem("role") || "viewer";
  const isAdmin  = role === "admin";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("empresa");
  const [sidebarStyle, setSidebarStyleState] = useState(getSidebarStyle());
  const [toast, setToast] = useState(null);

  // ── empresa ──
  const [company, setCompany]   = useState({ company_name:"", company_cnpj:"", company_address:"", company_logo:"", plan:"free" });
  const [savingCo, setSavingCo] = useState(false);

  // ── perfil ──
  const [me, setMe]             = useState({ name:"", email:"", role:"" });
  const [oldPass, setOldPass]   = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confPass, setConfPass] = useState("");
  const [savingMe, setSavingMe] = useState(false);
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);

  // ── temas ──
  const [themeSaved, setThemeSaved] = useState(false);

  const logoRef = useRef();

  // ── carrega dados ──
  useEffect(() => {
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setMe(d)).catch(() => {});
    if (isAdmin) {
      fetch(`${API}/company`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json()).then(d => { if (d.id) setCompany(d); }).catch(() => {});
    }
  }, []);

  function handleSidebarStyle(s) {
    setSidebarStyleLS(s);
    setSidebarStyleState(s);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
    showToast("Estilo de sidebar aplicado!");
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // ── salvar empresa ──
  async function handleSaveCompany(e) {
    e.preventDefault();
    setSavingCo(true);
    try {
      const res = await fetch(`${API}/company`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(company),
      });
      const data = await res.json();
      if (res.ok) showToast("Dados da empresa salvos!");
      else showToast(data.msg || "Erro ao salvar.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
    setSavingCo(false);
  }

  // ── salvar perfil ──
  async function handleSaveMe(e) {
    e.preventDefault();
    if (newPass && newPass !== confPass) { showToast("As senhas não coincidem.", "error"); return; }
    setSavingMe(true);
    try {
      const payload = { name: me.name };
      if (newPass) { payload.old_password = oldPass; payload.new_password = newPass; }
      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Perfil atualizado!");
        localStorage.setItem("name", me.name);
        setOldPass(""); setNewPass(""); setConfPass("");
      } else showToast(data.msg || "Erro ao salvar.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
    setSavingMe(false);
  }

  // ── upload logo (base64) ──
  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Imagem muito grande. Máximo 2MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = ev => setCompany(c => ({ ...c, company_logo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  // ── tema ──
  function handleChangeTheme(id) {
    changeTheme(id);
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  }

  // ── estilos ──
  const card = {
    background:     isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard,
    border:         `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius:   20,
    padding:        isMobile ? "24px 20px" : "32px",
    marginBottom:   28,
    backdropFilter: isGlass ? "blur(18px)" : undefined,
  };
  const inp = {
    background:   isGlass ? "rgba(255,255,255,0.4)" : theme.bgInput,
    border:       `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderInput}`,
    borderRadius: 10, padding: "10px 14px",
    color: theme.textPrimary, fontSize: "0.9rem", outline: "none",
    width: "100%", boxSizing: "border-box",
    colorScheme: isGlass ? "light" : "dark",
  };
  const lbl   = { color: theme.textSecondary, fontSize: "0.8rem", fontWeight: 600, marginBottom: 6, display: "block" };
  const field = { display: "flex", flexDirection: "column", gap: 4 };
  const btnPrimary = {
    background: theme.primaryGrad, color: "#fff", border: "none",
    borderRadius: 10, padding: "11px 28px", fontWeight: 700,
    cursor: "pointer", fontSize: "0.9rem",
    boxShadow: `0 4px 15px ${theme.primary}44`,
  };
  const navBtn = (active) => ({
    padding: "9px 18px", borderRadius: 10, fontSize: "0.88rem", fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    background: active ? theme.primaryGrad : (isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard),
    color: active ? "#fff" : theme.textMuted,
    boxShadow: active ? `0 4px 14px ${theme.primary}44` : "none",
  });

  const SECTIONS = [
    ...(isAdmin ? [{ id: "empresa", label: "🏢 Empresa" }] : []),
    { id: "perfil",  label: "👤 Meu Perfil" },
    { id: "temas",   label: "🎨 Temas" },
  ];

  // Se não é admin e tava na seção empresa, move para perfil
  useEffect(() => {
    if (!isAdmin && activeSection === "empresa") setActiveSection("perfil");
  }, [isAdmin]);

  return (
    <PageLayout>
      <style>{`
        .theme-card { border-radius:16px; padding:22px; cursor:pointer; transition:transform 0.3s,box-shadow 0.3s; position:relative; overflow:hidden; }
        .theme-card:hover { transform:translateY(-5px); }
        .settings-inp:focus { border-color: ${theme.primary} !important; }
        .logo-drop { transition: border-color 0.2s, background 0.2s; }
        .logo-drop:hover { border-color: ${theme.primary} !important; background: ${theme.primary}11 !important; }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 40px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28 }}>
          <img src={logoGif} alt="logo" style={{ width:isMobile?44:56, height:isMobile?44:56, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }}/>
          <div>
            <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Configurações</h1>
            <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie sua empresa, perfil e aparência</p>
          </div>
        </div>

        {/* NAV */}
        <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
          {SECTIONS.map(s => (
            <button key={s.id} style={navBtn(activeSection===s.id)} onClick={() => setActiveSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ══ SEÇÃO EMPRESA ══ */}
        {activeSection === "empresa" && isAdmin && (
          <div style={card}>
            <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>🏢 Dados da Empresa</h2>
            <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 28px" }}>Essas informações aparecem nos relatórios e PDFs gerados.</p>

            <form onSubmit={handleSaveCompany}>
              {/* LOGO */}
              <div style={{ marginBottom:28 }}>
                <label style={lbl}>Logo da Empresa</label>
                <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                  {/* Preview */}
                  <div style={{ width:100, height:100, borderRadius:16, overflow:"hidden", border:`2px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, background:isGlass?"rgba(255,255,255,0.3)":theme.bgPrimary, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {company.company_logo
                      ? <img src={company.company_logo} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                      : <span style={{ fontSize:"2rem" }}>🏢</span>
                    }
                  </div>
                  {/* Botões */}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoChange}/>
                    <button type="button" onClick={() => logoRef.current?.click()}
                      style={{ ...btnPrimary, padding:"9px 20px", fontSize:"0.85rem" }}>
                      📁 Selecionar Imagem
                    </button>
                    {company.company_logo && (
                      <button type="button" onClick={() => setCompany(c => ({ ...c, company_logo:"" }))}
                        style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"9px 20px", color:"#ef4444", fontWeight:600, cursor:"pointer", fontSize:"0.85rem" }}>
                        🗑️ Remover Logo
                      </button>
                    )}
                    <span style={{ fontSize:"0.72rem", color:theme.textMuted }}>PNG, JPG ou SVG · máx. 2MB</span>
                  </div>
                </div>
              </div>

              {/* CAMPOS */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:18, marginBottom:28 }}>
                <div style={{ ...field, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Nome da Empresa *</label>
                  <input className="settings-inp" style={inp} required
                    placeholder="Ex: Minha Empresa Ltda"
                    value={company.company_name}
                    onChange={e => setCompany(c => ({ ...c, company_name:e.target.value }))}/>
                </div>
                <div style={field}>
                  <label style={lbl}>CNPJ</label>
                  <input className="settings-inp" style={inp}
                    placeholder="00.000.000/0000-00"
                    value={company.company_cnpj || ""}
                    onChange={e => setCompany(c => ({ ...c, company_cnpj:e.target.value }))}/>
                </div>
                <div style={field}>
                  <label style={lbl}>Plano Atual</label>
                  <div style={{ ...inp, background:isGlass?"rgba(255,255,255,0.2)":theme.bgPrimary, color:theme.textMuted, cursor:"default" }}>
                    {PLAN_LABELS[company.plan] || company.plan || "—"}
                  </div>
                </div>
                <div style={{ ...field, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Endereço</label>
                  <input className="settings-inp" style={inp}
                    placeholder="Rua, número, cidade, estado"
                    value={company.company_address || ""}
                    onChange={e => setCompany(c => ({ ...c, company_address:e.target.value }))}/>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <button type="submit" disabled={savingCo} style={{ ...btnPrimary, opacity:savingCo?0.7:1, cursor:savingCo?"not-allowed":"pointer" }}>
                  {savingCo ? "Salvando..." : "💾 Salvar Empresa"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ SEÇÃO PERFIL ══ */}
        {activeSection === "perfil" && (
          <>
            {/* Info do usuário */}
            <div style={{ ...card, padding:"20px 24px", display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:theme.primaryGrad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0, boxShadow:`0 4px 16px ${theme.primary}44` }}>
                {(me.name||"U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:"1rem", color:theme.textPrimary }}>{me.name || "—"}</div>
                <div style={{ fontSize:"0.82rem", color:theme.textMuted, marginTop:2 }}>{me.email}</div>
                <div style={{ marginTop:6, display:"inline-block", background:`${theme.primary}22`, border:`1px solid ${theme.primary}44`, borderRadius:20, padding:"2px 10px", fontSize:"0.72rem", fontWeight:700, color:theme.primary }}>
                  {ROLE_LABELS[me.role] || me.role}
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>👤 Editar Perfil</h2>
              <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 28px" }}>Atualize seu nome e senha de acesso.</p>

              <form onSubmit={handleSaveMe}>
                <div style={{ display:"flex", flexDirection:"column", gap:18, marginBottom:28 }}>
                  <div style={field}>
                    <label style={lbl}>Nome</label>
                    <input className="settings-inp" style={inp}
                      placeholder="Seu nome"
                      value={me.name}
                      onChange={e => setMe(m => ({ ...m, name:e.target.value }))}/>
                  </div>
                  <div style={field}>
                    <label style={lbl}>E-mail</label>
                    <input style={{ ...inp, opacity:0.6, cursor:"default" }} disabled value={me.email}/>
                    <span style={{ fontSize:"0.72rem", color:theme.textMuted }}>O e-mail não pode ser alterado</span>
                  </div>

                  {/* Divisor senha */}
                  <div style={{ borderTop:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, paddingTop:20, marginTop:4 }}>
                    <div style={{ fontWeight:600, color:theme.textPrimary, fontSize:"0.88rem", marginBottom:16 }}>🔑 Alterar Senha <span style={{ fontWeight:400, color:theme.textMuted, fontSize:"0.78rem" }}>(opcional)</span></div>
                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
                      <div style={{ ...field, gridColumn:"1 / -1" }}>
                        <label style={lbl}>Senha Atual</label>
                        <div style={{ position:"relative" }}>
                          <input className="settings-inp" style={{ ...inp, paddingRight:44 }}
                            type={showOld?"text":"password"}
                            placeholder="••••••••"
                            value={oldPass}
                            onChange={e => setOldPass(e.target.value)}/>
                          <button type="button" onClick={() => setShowOld(v => !v)}
                            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:theme.textMuted, fontSize:16 }}>
                            {showOld ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </div>
                      <div style={field}>
                        <label style={lbl}>Nova Senha</label>
                        <div style={{ position:"relative" }}>
                          <input className="settings-inp" style={{ ...inp, paddingRight:44 }}
                            type={showNew?"text":"password"}
                            placeholder="••••••••"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}/>
                          <button type="button" onClick={() => setShowNew(v => !v)}
                            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:theme.textMuted, fontSize:16 }}>
                            {showNew ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </div>
                      <div style={field}>
                        <label style={lbl}>Confirmar Nova Senha</label>
                        <input className="settings-inp"
                          style={{ ...inp, borderColor: confPass && confPass !== newPass ? "#ef4444" : undefined }}
                          type="password" placeholder="••••••••"
                          value={confPass}
                          onChange={e => setConfPass(e.target.value)}/>
                        {confPass && confPass !== newPass && (
                          <span style={{ fontSize:"0.72rem", color:"#ef4444" }}>As senhas não coincidem</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button type="submit" disabled={savingMe} style={{ ...btnPrimary, opacity:savingMe?0.7:1, cursor:savingMe?"not-allowed":"pointer" }}>
                    {savingMe ? "Salvando..." : "💾 Salvar Perfil"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ══ SEÇÃO TEMAS ══ */}
        {activeSection === "temas" && (
          <>
            {/* Seletor de estilo do sidebar */}
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>🗂️ Estilo do Sidebar</h2>
              <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 24px" }}>Escolha como o menu de navegação é exibido. A preferência é salva automaticamente.</p>

              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:16 }}>
                {[
                  {
                    id:"vertical",
                    icon:"▐",
                    name:"Vertical",
                    desc:"Sidebar lateral retrátil que expande ao passar o mouse",
                    preview:(
                      <div style={{ display:"flex", gap:6, height:60, alignItems:"stretch" }}>
                        <div style={{ width:10, background:theme.primary, borderRadius:4, opacity:0.8 }}/>
                        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4, justifyContent:"center" }}>
                          {[1,2,3].map(i=><div key={i} style={{ height:6, background:isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)", borderRadius:3 }}/>)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    id:"horizontal",
                    icon:"▬",
                    name:"Horizontal",
                    desc:"Barra de navegação fixada no topo da página",
                    preview:(
                      <div style={{ display:"flex", flexDirection:"column", gap:6, height:60 }}>
                        <div style={{ height:10, background:theme.primary, borderRadius:4, opacity:0.8, width:"100%" }}/>
                        <div style={{ flex:1, display:"flex", gap:4, alignItems:"center" }}>
                          {[1,2,3,4].map(i=><div key={i} style={{ height:6, flex:1, background:isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)", borderRadius:3 }}/>)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    id:"dock",
                    icon:"⬤",
                    name:"Dock",
                    desc:"Bolinhas flutuantes na lateral — hover revela o nome",
                    preview:(
                      <div style={{ display:"flex", gap:8, height:60, alignItems:"center" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"center" }}>
                          {[1,2,3,4].map(i=>(
                            <div key={i} style={{ width:i===2?18:14, height:i===2?18:14, borderRadius:"50%",
                              background:i===2?theme.primary:isGlass?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.1)",
                              border:`1px solid ${i===2?theme.primary:"rgba(255,255,255,0.15)"}` }}/>
                          ))}
                        </div>
                        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                          {[1,2].map(i=><div key={i} style={{ height:6, background:isGlass?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)", borderRadius:3 }}/>)}
                        </div>
                      </div>
                    ),
                  },
                ].map(s => {
                  const isActive = sidebarStyle === s.id;
                  return (
                    <div key={s.id} onClick={() => handleSidebarStyle(s.id)}
                      style={{ borderRadius:16, padding:20, cursor:"pointer", transition:"all 0.2s",
                        background:isActive?(isGlass?"rgba(255,255,255,0.3)":`${theme.primary}18`):(isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)"),
                        border:`2px solid ${isActive?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
                        boxShadow:isActive?`0 0 20px ${theme.primary}33`:"none",
                        position:"relative" }}>
                      {isActive && (
                        <div style={{ position:"absolute", top:10, right:10, background:theme.primaryGrad,
                          color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>ATIVO</div>
                      )}
                      {/* Preview visual */}
                      <div style={{ background:isGlass?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.2)",
                        borderRadius:10, padding:12, marginBottom:14, border:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}` }}>
                        {s.preview}
                      </div>
                      <div style={{ fontWeight:700, fontSize:"0.95rem", color:isActive?theme.primary:theme.textPrimary, marginBottom:4 }}>{s.name}</div>
                      <div style={{ fontSize:"0.75rem", color:theme.textMuted, lineHeight:1.4 }}>{s.desc}</div>
                      <button onClick={e=>{e.stopPropagation();handleSidebarStyle(s.id);}}
                        style={{ marginTop:14, width:"100%", padding:"8px", borderRadius:10, border:"none",
                          cursor:"pointer", fontWeight:600, fontSize:"0.82rem",
                          background:isActive?theme.primaryGrad:`${theme.primary}22`,
                          color:isActive?"#fff":theme.primary, transition:"all 0.2s" }}>
                        {isActive?"✓ Ativo":"Aplicar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 28px" }}>Salvo automaticamente e aplicado em todas as páginas.</p>

            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16 }}>
              {Object.values(themes).map(t => {
                const isActive   = themeId === t.id;
                const isThisGlass = t.id === "glass" || t.id === "gray";
                return (
                  <div key={t.id} className="theme-card" onClick={() => handleChangeTheme(t.id)} style={{
                    background: isThisGlass
                      ? "linear-gradient(135deg,rgba(200,215,235,0.6),rgba(220,230,245,0.4))"
                      : t.bgCard,
                    border: isActive ? `2px solid ${t.primary}` : isThisGlass ? "1px solid rgba(255,255,255,0.6)" : `1px solid ${t.borderCard}`,
                    boxShadow: isActive ? `0 0 24px ${t.primary}33,0 8px 32px rgba(0,0,0,0.3)` : "0 8px 24px rgba(0,0,0,0.2)",
                    ...(isThisGlass && { backdropFilter:"blur(8px)" }),
                  }}>
                    {isActive && (
                      <div style={{ position:"absolute", top:10, right:10, background:t.primaryGrad, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20 }}>ATIVO</div>
                    )}
                    <div style={{ fontSize:"1.8rem", marginBottom:8 }}>{t.emoji}</div>
                    <div style={{ fontWeight:700, fontSize:"0.9rem", color:isActive?t.primary:(isThisGlass?"#1e2d4a":"#e2e8f0"), marginBottom:4 }}>{t.name}</div>
                    <div style={{ fontSize:"0.72rem", color:isThisGlass?"#4a607d":"#64748b", marginBottom:14 }}>{t.description}</div>
                    <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                      {[t.primary, t.accent, t.income, t.expense].map((c,i) => (
                        <div key={i} style={{ width:24, height:24, borderRadius:"50%", background:c }}/>
                      ))}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleChangeTheme(t.id); }} style={{
                      width:"100%", padding:"8px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.8rem",
                      background: isActive ? t.primaryGrad : isThisGlass ? "rgba(255,255,255,0.4)" : `${t.primary}22`,
                      color: isActive ? "#fff" : (isThisGlass ? "#1d4ed8" : t.primary),
                    }}>
                      {isActive ? "✓ Ativo" : "Aplicar"}
                    </button>
                  </div>
                );
              })}
            </div>

            {themeSaved && (
              <div style={{ marginTop:20, background:`${theme.income}22`, border:`1px solid ${theme.income}44`, borderRadius:12, padding:"12px 18px", color:theme.income, fontWeight:600, fontSize:"0.88rem" }}>
                ✅ Tema aplicado com sucesso!
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}