import { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { getSidebarStyle, setSidebarStyleLS } from "../components/layout/Sidebar";
import { RG_COMPANY_ID, RG_THEMES } from "../themes/themes";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => { const h = () => setM(window.innerWidth <= 768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); }, []);
  return m;
}

const isRGUser = () => String(localStorage.getItem("company_id") || "") === RG_COMPANY_ID;

const ROLE_LABELS = { admin:"Administrador", seller:"Vendedor", financial:"Financeiro", stock:"Estoque", viewer:"Visualizador" };
const PLAN_LABELS = { free:"🆓 Free", pro:"⚡ Pro", business:"🏢 Business" };
const REGIME_OPTIONS = [
  { value:"1", label:"Simples Nacional" },
  { value:"2", label:"Simples Nacional — Excesso de sublimite" },
  { value:"3", label:"Regime Normal" },
  { value:"4", label:"MEI — Microempreendedor Individual" },
];

export default function Settings() {
  const { theme, themeId, changeTheme, themes } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray" || themeId === "clean" || themeId === "rg_dark";
  const isMobile = useIsMobile();
  const role     = localStorage.getItem("role") || "viewer";
  const isAdmin  = role === "admin";
  const isRG     = isRGUser();

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [activeSection, setActiveSection]   = useState("empresa");
  const [sidebarStyle, setSidebarStyleState]= useState(getSidebarStyle());
  const [toast, setToast]                   = useState(null);

  // empresa
  const [company, setCompany]   = useState({ company_name:"", company_cnpj:"", company_address:"", company_logo:"", plan:"free" });
  const [savingCo, setSavingCo] = useState(false);

  // fiscal
  const [fiscal, setFiscal] = useState({ cnpj:"", inscricao_estadual:"", inscricao_municipal:"", regime_tributario:"1", cep:"", logradouro:"", numero:"", complemento:"", bairro:"", municipio:"", uf:"", codigo_municipio:"", telefone:"", token_focusnfe:"" });
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [showToken, setShowToken]       = useState(false);
  const [loadingCep, setLoadingCep]     = useState(false);

  // perfil
  const [me, setMe]            = useState({ name:"", email:"", role:"" });
  const [oldPass, setOldPass]  = useState("");
  const [newPass, setNewPass]  = useState("");
  const [confPass, setConfPass]= useState("");
  const [savingMe, setSavingMe]= useState(false);
  const [showOld, setShowOld]  = useState(false);
  const [showNew, setShowNew]  = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  const logoRef = useRef();

  // Filtra temas visíveis: RG vê só rg_light/rg_dark; outros vêm os demais
  const visibleThemes = Object.values(themes).filter(t =>
    isRG ? RG_THEMES.includes(t.id) : !t.isRGTheme
  );

  useEffect(() => {
    fetch(`${API}/me`, { headers:{ Authorization:`Bearer ${token()}` } })
      .then(r=>r.json()).then(d=>setMe(d)).catch(()=>{});
    if (isAdmin) {
      fetch(`${API}/company`, { headers:{ Authorization:`Bearer ${token()}` } })
        .then(r=>r.json()).then(d => {
          if (d.id) {
            setCompany(d);
            setFiscal({ cnpj:d.cnpj||"", inscricao_estadual:d.inscricao_estadual||"", inscricao_municipal:d.inscricao_municipal||"", regime_tributario:d.regime_tributario||"1", cep:d.cep||"", logradouro:d.logradouro||"", numero:d.numero||"", complemento:d.complemento||"", bairro:d.bairro||"", municipio:d.municipio||"", uf:d.uf||"", codigo_municipio:d.codigo_municipio||"", telefone:d.telefone||"", token_focusnfe:d.token_focusnfe||"" });
          }
        }).catch(()=>{});
    }
  }, []);

  function handleSidebarStyle(s) {
    setSidebarStyleLS(s); setSidebarStyleState(s);
    window.dispatchEvent(new Event("sv_sidebar_style_changed"));
    showToast("Estilo de sidebar aplicado!");
  }

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3200); }

  async function handleSaveCompany(e) {
    e.preventDefault(); setSavingCo(true);
    try {
      const res = await fetch(`${API}/company`, { method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify(company) });
      const data = await res.json();
      if (res.ok) showToast("Dados da empresa salvos!"); else showToast(data.msg||"Erro ao salvar.","error");
    } catch { showToast("Erro de conexão.","error"); }
    setSavingCo(false);
  }

  async function handleSaveFiscal(e) {
    e.preventDefault(); setSavingFiscal(true);
    try {
      const res = await fetch(`${API}/company`, { method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify({...company,...fiscal}) });
      const data = await res.json();
      if (res.ok) showToast("Dados fiscais salvos!"); else showToast(data.msg||"Erro.","error");
    } catch { showToast("Erro de conexão.","error"); }
    setSavingFiscal(false);
  }

  async function handleBuscarCep() {
    const cep = fiscal.cep.replace(/\D/g,"");
    if (cep.length !== 8) { showToast("CEP inválido.","error"); return; }
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { showToast("CEP não encontrado.","error"); return; }
      setFiscal(f => ({...f, logradouro:data.logradouro||"", bairro:data.bairro||"", municipio:data.localidade||"", uf:data.uf||"", codigo_municipio:data.ibge||""}));
      showToast("Endereço preenchido!");
    } catch { showToast("Erro ao buscar CEP.","error"); }
    setLoadingCep(false);
  }

  async function handleSaveMe(e) {
    e.preventDefault();
    if (newPass && newPass !== confPass) { showToast("As senhas não coincidem.","error"); return; }
    setSavingMe(true);
    try {
      const payload = { name: me.name };
      if (newPass) { payload.old_password = oldPass; payload.new_password = newPass; }
      const res = await fetch(`${API}/me`, { method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { showToast("Perfil atualizado!"); localStorage.setItem("name",me.name); setOldPass(""); setNewPass(""); setConfPass(""); }
      else showToast(data.msg||"Erro.","error");
    } catch { showToast("Erro de conexão.","error"); }
    setSavingMe(false);
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { showToast("Imagem muito grande. Máximo 2MB.","error"); return; }
    const reader = new FileReader();
    reader.onload = ev => setCompany(c => ({...c, company_logo:ev.target.result}));
    reader.readAsDataURL(file);
  }

  function handleChangeTheme(id) { changeTheme(id); setThemeSaved(true); setTimeout(()=>setThemeSaved(false),2000); }

  // ── estilos ──
  const card = { background:isGlass?"rgba(255,255,255,0.2)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:20, padding:isMobile?"24px 20px":"32px", marginBottom:28, backdropFilter:isGlass?"blur(18px)":undefined };
  const inp  = { background:isGlass?"rgba(255,255,255,0.4)":theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderInput}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", colorScheme:isGlass?"light":"dark" };
  const sel  = { ...inp, cursor:"pointer" };
  const lbl  = { color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600, marginBottom:6, display:"block" };
  const field= { display:"flex", flexDirection:"column", gap:4 };
  const btnPrimary = { background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"11px 28px", fontWeight:700, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44` };
  const navBtn = (active) => ({ padding:"9px 18px", borderRadius:10, fontSize:"0.88rem", fontWeight:600, cursor:"pointer", border:"none", transition:"all 0.2s", background:active?theme.primaryGrad:(isGlass?"rgba(255,255,255,0.2)":theme.bgCard), color:active?"#fff":theme.textMuted, boxShadow:active?`0 4px 14px ${theme.primary}44`:"none" });

  const SECTIONS = [
    ...(isAdmin?[{id:"empresa",label:"🏢 Empresa"}]:[]),
    ...(isAdmin?[{id:"fiscal", label:"🧾 Fiscal NF-e"}]:[]),
    {id:"perfil",label:"👤 Meu Perfil"},
    {id:"temas", label:"🎨 Temas"},
  ];

  useEffect(() => { if (!isAdmin && activeSection==="empresa") setActiveSection("perfil"); }, [isAdmin]);

  return (
    <PageLayout>
      <style>{`
        .theme-card { border-radius:16px; padding:22px; cursor:pointer; transition:transform 0.3s,box-shadow 0.3s; position:relative; overflow:hidden; }
        .theme-card:hover { transform:translateY(-5px); }
        .settings-inp:focus { border-color:${theme.primary}!important; }
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
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
          {SECTIONS.map(s => <button key={s.id} style={navBtn(activeSection===s.id)} onClick={()=>setActiveSection(s.id)}>{s.label}</button>)}
        </div>

        {/* EMPRESA */}
        {activeSection==="empresa" && isAdmin && (
          <div style={card}>
            <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>🏢 Dados da Empresa</h2>
            <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 28px" }}>Essas informações aparecem nos relatórios e PDFs.</p>
            <form onSubmit={handleSaveCompany}>
              <div style={{ marginBottom:28 }}>
                <label style={lbl}>Logo da Empresa</label>
                <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                  <div style={{ width:100, height:100, borderRadius:16, overflow:"hidden", border:`2px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, background:isGlass?"rgba(255,255,255,0.3)":theme.bgPrimary, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {company.company_logo ? <img src={company.company_logo} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/> : <span style={{ fontSize:"2rem" }}>🏢</span>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoChange}/>
                    <button type="button" onClick={()=>logoRef.current?.click()} style={{ ...btnPrimary, padding:"9px 20px", fontSize:"0.85rem" }}>📁 Selecionar Imagem</button>
                    {company.company_logo && <button type="button" onClick={()=>setCompany(c=>({...c,company_logo:""}))} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"9px 20px", color:"#ef4444", fontWeight:600, cursor:"pointer", fontSize:"0.85rem" }}>🗑️ Remover Logo</button>}
                    <span style={{ fontSize:"0.72rem", color:theme.textMuted }}>PNG, JPG ou SVG · máx. 2MB</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:18, marginBottom:28 }}>
                <div style={{ ...field, gridColumn:"1 / -1" }}><label style={lbl}>Nome da Empresa *</label><input className="settings-inp" style={inp} required value={company.company_name} onChange={e=>setCompany(c=>({...c,company_name:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>CNPJ</label><input className="settings-inp" style={inp} placeholder="00.000.000/0000-00" value={company.company_cnpj||""} onChange={e=>setCompany(c=>({...c,company_cnpj:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Plano Atual</label><div style={{ ...inp, opacity:0.6, cursor:"default" }}>{PLAN_LABELS[company.plan]||company.plan||"—"}</div></div>
                <div style={{ ...field, gridColumn:"1 / -1" }}><label style={lbl}>Endereço</label><input className="settings-inp" style={inp} value={company.company_address||""} onChange={e=>setCompany(c=>({...c,company_address:e.target.value}))}/></div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end" }}><button type="submit" disabled={savingCo} style={{ ...btnPrimary, opacity:savingCo?0.7:1 }}>{savingCo?"Salvando...":"💾 Salvar Empresa"}</button></div>
            </form>
          </div>
        )}

        {/* FISCAL */}
        {activeSection==="fiscal" && isAdmin && (
          <form onSubmit={handleSaveFiscal}>
            <div style={{ background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:14, padding:"14px 18px", marginBottom:24, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:"1.2rem" }}>🧾</span>
              <div>
                <div style={{ fontWeight:700, color:"#7c3aed", fontSize:"0.9rem", marginBottom:4 }}>Dados para Emissão de NF-e</div>
                <div style={{ fontSize:"0.82rem", color:theme.textMuted, lineHeight:1.6 }}>Preencha os dados fiscais para habilitar a emissão de notas fiscais eletrônicas.</div>
              </div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 24px", color:theme.textPrimary }}>🏛️ Identificação Fiscal</h2>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:18 }}>
                <div style={field}><label style={lbl}>CNPJ *</label><input className="settings-inp" style={inp} placeholder="00.000.000/0000-00" value={fiscal.cnpj} onChange={e=>setFiscal(f=>({...f,cnpj:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Regime Tributário *</label><select className="settings-inp" style={sel} value={fiscal.regime_tributario} onChange={e=>setFiscal(f=>({...f,regime_tributario:e.target.value}))}>{REGIME_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div style={field}><label style={lbl}>Inscrição Estadual</label><input className="settings-inp" style={inp} value={fiscal.inscricao_estadual} onChange={e=>setFiscal(f=>({...f,inscricao_estadual:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Inscrição Municipal</label><input className="settings-inp" style={inp} value={fiscal.inscricao_municipal} onChange={e=>setFiscal(f=>({...f,inscricao_municipal:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Telefone</label><input className="settings-inp" style={inp} placeholder="(00) 00000-0000" value={fiscal.telefone} onChange={e=>setFiscal(f=>({...f,telefone:e.target.value}))}/></div>
              </div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 24px", color:theme.textPrimary }}>📍 Endereço Fiscal</h2>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:18 }}>
                <div style={field}>
                  <label style={lbl}>CEP *</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="settings-inp" style={{ ...inp, flex:1 }} placeholder="00000-000" value={fiscal.cep} onChange={e=>setFiscal(f=>({...f,cep:e.target.value}))} onBlur={handleBuscarCep}/>
                    <button type="button" onClick={handleBuscarCep} disabled={loadingCep} style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 14px", fontWeight:700, cursor:"pointer", fontSize:"0.82rem", flexShrink:0 }}>{loadingCep?"...":"🔍"}</button>
                  </div>
                </div>
                <div style={{ ...field, gridColumn:isMobile?"1":"2 / -1" }}><label style={lbl}>Logradouro</label><input className="settings-inp" style={inp} value={fiscal.logradouro} onChange={e=>setFiscal(f=>({...f,logradouro:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Número</label><input className="settings-inp" style={inp} value={fiscal.numero} onChange={e=>setFiscal(f=>({...f,numero:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Complemento</label><input className="settings-inp" style={inp} value={fiscal.complemento} onChange={e=>setFiscal(f=>({...f,complemento:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Bairro</label><input className="settings-inp" style={inp} value={fiscal.bairro} onChange={e=>setFiscal(f=>({...f,bairro:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>Município</label><input className="settings-inp" style={inp} value={fiscal.municipio} onChange={e=>setFiscal(f=>({...f,municipio:e.target.value}))}/></div>
                <div style={field}><label style={lbl}>UF</label><input className="settings-inp" style={{ ...inp, textTransform:"uppercase" }} maxLength={2} value={fiscal.uf} onChange={e=>setFiscal(f=>({...f,uf:e.target.value.toUpperCase()}))}/></div>
                <div style={field}><label style={lbl}>Código IBGE</label><input className="settings-inp" style={inp} value={fiscal.codigo_municipio} onChange={e=>setFiscal(f=>({...f,codigo_municipio:e.target.value}))}/><span style={{ fontSize:"0.7rem", color:theme.textMuted }}>Preenchido via CEP</span></div>
              </div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 24px", color:theme.textPrimary }}>🔑 Token Focus NF-e</h2>
              <div style={field}>
                <label style={lbl}>Token de Acesso</label>
                <div style={{ position:"relative" }}>
                  <input className="settings-inp" style={{ ...inp, paddingRight:48, fontFamily:"monospace", fontSize:"0.82rem" }} type={showToken?"text":"password"} placeholder="Cole o token sandbox ou produção" value={fiscal.token_focusnfe} onChange={e=>setFiscal(f=>({...f,token_focusnfe:e.target.value}))}/>
                  <button type="button" onClick={()=>setShowToken(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:theme.textMuted, fontSize:16 }}>{showToken?"🙈":"👁️"}</button>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:40 }}>
              <button type="submit" disabled={savingFiscal} style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", border:"none", borderRadius:10, padding:"11px 32px", fontWeight:700, cursor:"pointer", fontSize:"0.95rem", boxShadow:"0 4px 15px rgba(124,58,237,0.4)" }}>{savingFiscal?"Salvando...":"💾 Salvar Dados Fiscais"}</button>
            </div>
          </form>
        )}

        {/* PERFIL */}
        {activeSection==="perfil" && (
          <>
            <div style={{ ...card, padding:"20px 24px", display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:theme.primaryGrad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0, boxShadow:`0 4px 16px ${theme.primary}44` }}>
                {(me.name||"U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:"1rem", color:theme.textPrimary }}>{me.name||"—"}</div>
                <div style={{ fontSize:"0.82rem", color:theme.textMuted, marginTop:2 }}>{me.email}</div>
                <div style={{ marginTop:6, display:"inline-block", background:`${theme.primary}22`, border:`1px solid ${theme.primary}44`, borderRadius:20, padding:"2px 10px", fontSize:"0.72rem", fontWeight:700, color:theme.primary }}>{ROLE_LABELS[me.role]||me.role}</div>
              </div>
            </div>
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 28px", color:theme.textPrimary }}>👤 Editar Perfil</h2>
              <form onSubmit={handleSaveMe}>
                <div style={{ display:"flex", flexDirection:"column", gap:18, marginBottom:28 }}>
                  <div style={field}><label style={lbl}>Nome</label><input className="settings-inp" style={inp} value={me.name} onChange={e=>setMe(m=>({...m,name:e.target.value}))}/></div>
                  <div style={field}><label style={lbl}>E-mail</label><input style={{ ...inp, opacity:0.6, cursor:"default" }} disabled value={me.email}/><span style={{ fontSize:"0.72rem", color:theme.textMuted }}>O e-mail não pode ser alterado</span></div>
                  <div style={{ borderTop:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.border}`, paddingTop:20, marginTop:4 }}>
                    <div style={{ fontWeight:600, color:theme.textPrimary, fontSize:"0.88rem", marginBottom:16 }}>🔑 Alterar Senha <span style={{ fontWeight:400, color:theme.textMuted, fontSize:"0.78rem" }}>(opcional)</span></div>
                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
                      <div style={{ ...field, gridColumn:"1 / -1" }}>
                        <label style={lbl}>Senha Atual</label>
                        <div style={{ position:"relative" }}>
                          <input className="settings-inp" style={{ ...inp, paddingRight:44 }} type={showOld?"text":"password"} placeholder="••••••••" value={oldPass} onChange={e=>setOldPass(e.target.value)}/>
                          <button type="button" onClick={()=>setShowOld(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:theme.textMuted, fontSize:16 }}>{showOld?"🙈":"👁️"}</button>
                        </div>
                      </div>
                      <div style={field}>
                        <label style={lbl}>Nova Senha</label>
                        <div style={{ position:"relative" }}>
                          <input className="settings-inp" style={{ ...inp, paddingRight:44 }} type={showNew?"text":"password"} placeholder="••••••••" value={newPass} onChange={e=>setNewPass(e.target.value)}/>
                          <button type="button" onClick={()=>setShowNew(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:theme.textMuted, fontSize:16 }}>{showNew?"🙈":"👁️"}</button>
                        </div>
                      </div>
                      <div style={field}>
                        <label style={lbl}>Confirmar Nova Senha</label>
                        <input className="settings-inp" style={{ ...inp, borderColor:confPass&&confPass!==newPass?"#ef4444":undefined }} type="password" placeholder="••••••••" value={confPass} onChange={e=>setConfPass(e.target.value)}/>
                        {confPass&&confPass!==newPass&&<span style={{ fontSize:"0.72rem", color:"#ef4444" }}>As senhas não coincidem</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end" }}><button type="submit" disabled={savingMe} style={{ ...btnPrimary, opacity:savingMe?0.7:1 }}>{savingMe?"Salvando...":"💾 Salvar Perfil"}</button></div>
              </form>
            </div>
          </>
        )}

        {/* TEMAS */}
        {activeSection==="temas" && (
          <>
            {/* Sidebar styles — só para não-RG */}
            {!isRG && (
              <div style={card}>
                <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>🗂️ Estilo do Sidebar</h2>
                <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 24px" }}>Salvo automaticamente.</p>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16 }}>
                  {[
                    {id:"vertical",label:"Vertical",desc:"Sidebar lateral retrátil"},
                    {id:"horizontal",label:"Horizontal",desc:"Barra no topo com dropdown"},
                    {id:"dock",label:"Dock Convexo",desc:"Bolinhas em arco projetando"},
                    {id:"dock_concave",label:"Dock Côncavo",desc:"Bolinhas em arco recuado"},
                  ].map(s => {
                    const isAct = sidebarStyle === s.id;
                    return (
                      <div key={s.id} onClick={()=>handleSidebarStyle(s.id)} style={{ borderRadius:16, padding:20, cursor:"pointer", transition:"all 0.2s", background:isAct?(isGlass?"rgba(255,255,255,0.3)":`${theme.primary}18`):(isGlass?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)"), border:`2px solid ${isAct?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, boxShadow:isAct?`0 0 20px ${theme.primary}33`:"none", position:"relative" }}>
                        {isAct && <div style={{ position:"absolute", top:10, right:10, background:theme.primaryGrad, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>ATIVO</div>}
                        <div style={{ fontSize:"2rem", marginBottom:10 }}>{s.id==="vertical"?"▐":s.id==="horizontal"?"▬":"⬤"}</div>
                        <div style={{ fontWeight:700, fontSize:"0.92rem", color:isAct?theme.primary:theme.textPrimary, marginBottom:4 }}>{s.label}</div>
                        <div style={{ fontSize:"0.75rem", color:theme.textMuted, lineHeight:1.4, marginBottom:12 }}>{s.desc}</div>
                        <button onClick={e=>{e.stopPropagation();handleSidebarStyle(s.id);}} style={{ width:"100%", padding:"8px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.82rem", background:isAct?theme.primaryGrad:`${theme.primary}22`, color:isAct?"#fff":theme.primary }}>{isAct?"✓ Ativo":"Aplicar"}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Temas */}
            <div style={card}>
              <h2 style={{ fontSize:"1rem", fontWeight:700, margin:"0 0 6px", color:theme.textPrimary }}>🎨 Tema do Sistema</h2>
              {isRG && <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 20px" }}>Escolha entre os temas exclusivos Restaura Glass.</p>}
              {!isRG && <p style={{ color:theme.textMuted, fontSize:"0.82rem", margin:"0 0 28px" }}>Salvo automaticamente e aplicado em todas as páginas.</p>}

              {/* Banner RG exclusivo */}
              {isRG && (
                <div style={{ background:"rgba(22,163,74,0.08)", border:"1px solid rgba(22,163,74,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:"1.1rem" }}>🧼</span>
                  <span style={{ fontSize:"0.83rem", color:theme.textMuted }}>Temas exclusivos <strong style={{ color:theme.primary }}>Restaura Glass</strong> — identidade visual da marca</span>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20 }}>
                {visibleThemes.map(t => {
                  const isActive    = themeId === t.id;
                  const isThisGlass = t.isGlassTheme;
                  const isDark      = !t.isLight;
                  return (
                    <div key={t.id} className="theme-card" onClick={()=>handleChangeTheme(t.id)} style={{
                      background: t.id==="rg_dark"
                        ? "linear-gradient(135deg,rgba(4,18,8,0.95),rgba(12,40,20,0.9))"
                        : t.id==="clean"
                          ? "linear-gradient(135deg,rgba(240,250,244,0.95),rgba(255,255,255,0.9))"
                          : isThisGlass ? "linear-gradient(135deg,rgba(200,215,235,0.6),rgba(220,230,245,0.4))" : t.bgCard,
                      border: isActive ? `2px solid ${t.primary}` : `1px solid ${isThisGlass?"rgba(255,255,255,0.4)":t.borderCard}`,
                      boxShadow: isActive ? `0 0 28px ${t.primary}44, 0 8px 32px rgba(0,0,0,0.25)` : "0 4px 16px rgba(0,0,0,0.15)",
                      ...(isThisGlass && { backdropFilter:"blur(8px)" }),
                    }}>
                      {isActive && <div style={{ position:"absolute", top:12, right:12, background:t.primaryGrad, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>ATIVO</div>}
                      <div style={{ fontSize:"2rem", marginBottom:10 }}>{t.emoji}</div>
                      <div style={{ fontWeight:800, fontSize:"1rem", color:isActive?t.primary:(isDark?"#e8faf0":"#0f1a0f"), marginBottom:4 }}>{t.name}</div>
                      <div style={{ fontSize:"0.75rem", color:isDark?"#5a8a70":"#4a7a50", marginBottom:16, lineHeight:1.4 }}>{t.description}</div>
                      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                        {[t.primary,t.accent,t.income,t.expense].map((c,i) => (
                          <div key={i} style={{ width:28, height:28, borderRadius:"50%", background:c, boxShadow:`0 2px 8px ${c}66` }}/>
                        ))}
                      </div>
                      <button onClick={e=>{e.stopPropagation();handleChangeTheme(t.id);}} style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.85rem", background:isActive?t.primaryGrad:`${t.primary}22`, color:isActive?"#fff":t.primary }}>
                        {isActive ? "✓ Tema Ativo" : "Aplicar Tema"}
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

      {toast && <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>{toast.msg}</div>}
    </PageLayout>
  );
}