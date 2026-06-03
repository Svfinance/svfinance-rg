// src/pages/Login.jsx
import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { loginUser, registerUser, registerPersonalUser } from "../services/api"
import { useNicho, NICHOS } from "../contexts/NichoContext"
import logoImg from "../assets/logo.gif"

const API = "https://api.svfinance.com.br/api"

// ─────────────────────────────────────────────────────────────
// CANVAS — NÚMEROS FLUTUANDO
// ─────────────────────────────────────────────────────────────
function FloatingNumbers() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: false })
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)
    const symbols = ["+2.4%","R$","↑","▲","1.847","%","+R$320","▲12%","€","$","+4.1%","3.500","↗","R$1k","▼","+18%"]
    const layers = [
      { count:8,  speedMin:0.6, speedMax:1.0, sizeMin:9,  sizeMax:12, opacityMax:0.12 },
      { count:6,  speedMin:1.0, speedMax:1.6, sizeMin:12, sizeMax:16, opacityMax:0.18 },
      { count:5,  speedMin:1.6, speedMax:2.4, sizeMin:16, sizeMax:24, opacityMax:0.30 },
    ]
    const particles = []
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)]
        particles.push({ x:Math.random()*canvas.width, y:canvas.height+Math.random()*300, speed:layer.speedMin+Math.random()*(layer.speedMax-layer.speedMin), opacity:0, maxOpacity:0.04+Math.random()*layer.opacityMax, size:layer.sizeMin+Math.random()*(layer.sizeMax-layer.sizeMin), symbol:sym, drift:(Math.random()-0.5)*0.2, layer:li, positive:/[+▲↑↗]/.test(sym) })
      }
    })
    let animId, lastTime = 0
    const animate = (timestamp) => {
      if (timestamp - lastTime < 33) { animId = requestAnimationFrame(animate); return }
      lastTime = timestamp
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.y -= p.speed; p.x += p.drift
        if (p.opacity < p.maxOpacity) p.opacity += 0.003
        if (p.y < canvas.height * 0.2) p.opacity -= 0.006
        if (p.y < -40 || p.opacity <= 0) {
          p.y = canvas.height + Math.random() * 150; p.x = Math.random() * canvas.width; p.opacity = 0
          const s = symbols[Math.floor(Math.random() * symbols.length)]
          p.symbol = s; p.positive = /[+▲↑↗]/.test(s)
          p.speed = layers[p.layer].speedMin + Math.random() * (layers[p.layer].speedMax - layers[p.layer].speedMin)
        }
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.positive ? "#22c55e" : "#818cf8"
        ctx.font = `${Math.round(p.size)}px monospace`
        ctx.fillText(p.symbol, p.x, p.y)
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }} />
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: Seletor de Nicho
// ─────────────────────────────────────────────────────────────
function NichoSelector({ selected, onSelect }) {
  const nichos = Object.values(NICHOS)
  return (
    <div>
      <label style={fieldLabel}>Tipo de negócio</label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
        {nichos.map(n => {
          const isSelected = selected === n.key
          return (
            <button key={n.key} type="button" onClick={() => onSelect(n.key)} style={{
              padding:"12px 10px", borderRadius:12, cursor:"pointer",
              border: isSelected ? `1.5px solid ${n.color}` : "1px solid rgba(255,255,255,0.1)",
              background: isSelected ? `linear-gradient(135deg, ${n.color}22, ${n.color}11)` : "rgba(255,255,255,0.04)",
              backdropFilter:"blur(8px)", textAlign:"center", transition:"all 0.2s",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
            }}>
              <span style={{ fontSize:"1.4rem" }}>{n.icon}</span>
              <span style={{ fontSize:"11px", fontWeight:600, color: isSelected ? n.color : "rgba(255,255,255,0.6)", lineHeight:1.3 }}>{n.label}</span>
            </button>
          )
        })}
      </div>
      {selected && (
        <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:`rgba(255,255,255,0.04)`, border:"1px solid rgba(255,255,255,0.08)", fontSize:12, color:"rgba(255,255,255,0.45)", textAlign:"center" }}>
          {NICHOS[selected]?.icon} {NICHOS[selected]?.desc}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LOGIN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Login() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const { updateNicho } = useNicho()

  const [screen, setScreen]                     = useState("choose")
  const [name, setName]                         = useState("")
  const [companyName, setCompanyName]           = useState("")
  const [email, setEmail]                       = useState("")
  const [password, setPassword]                 = useState("")
  const [confirmPassword, setConfirmPassword]   = useState("")
  const [unverifiedEmail, setUnverifiedEmail]   = useState("")
  const [selectedNicho, setSelectedNicho]       = useState("generic")
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState("")
  const [success, setSuccess]                   = useState("")

  useEffect(() => {
    if (localStorage.getItem("token")) { navigate("/dashboard"); return }
    const token    = searchParams.get("token")
    const pathname = window.location.pathname
    if (token && pathname.includes("verify-email")) {
      handleVerifyEmail(token)
    } else if (token && pathname.includes("reset-password")) {
      setScreen("reset-password")
    }
  }, [])

  async function handleVerifyEmail(token) {
    setScreen("verifying")
    try {
      const res = await fetch(`${API}/verify-email?token=${encodeURIComponent(token)}`)
      if (res.ok) setScreen("verify-success")
      else        setScreen("verify-error")
    } catch {
      setScreen("verify-error")
    }
  }

  function resetForm() {
    setName(""); setCompanyName(""); setEmail("")
    setPassword(""); setConfirmPassword("")
    setError(""); setSuccess("")
    setSelectedNicho("generic")
  }

  function goTo(s) { resetForm(); setScreen(s) }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const { ok, data } = await loginUser(email, password)
      if (ok) {
        if (data?.nicho) updateNicho(data.nicho)
        // ← Dispara evento para forçar tema correto (ex: clean para Restaura Glass)
        window.dispatchEvent(new Event("sv_login"))
        navigate("/dashboard")
      } else if (data.email_unverified) {
        setUnverifiedEmail(data.email || email)
        setScreen("verify-pending")
      } else {
        setError(data.msg || "Email ou senha inválidos")
      }
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  // ── CADASTRO PJ ──
  const handleRegisterBusiness = async (e) => {
    e.preventDefault()
    if (!name.trim())        { setError("Nome é obrigatório"); return }
    if (!companyName.trim()) { setError("Nome da empresa é obrigatório"); return }
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return }
    if (password.length < 6) { setError("Senha mínimo 6 caracteres"); return }
    setLoading(true); setError("")
    try {
      const res  = await registerUser(email, password, name, companyName, selectedNicho)
      const data = await res.json()
      if (res.ok) {
        updateNicho(selectedNicho)
        setUnverifiedEmail(email)
        setScreen("verify-pending")
      } else {
        setError(data.msg || "Erro ao criar conta")
      }
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  // ── CADASTRO PF ──
  const handleRegisterPersonal = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError("Nome é obrigatório"); return }
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return }
    if (password.length < 6) { setError("Senha mínimo 6 caracteres"); return }
    setLoading(true); setError("")
    try {
      const res  = await registerPersonalUser(email, password, name)
      const data = await res.json()
      if (res.ok) {
        updateNicho("generic")
        setUnverifiedEmail(email)
        setScreen("verify-pending")
      } else {
        setError(data.msg || "Erro ao criar conta")
      }
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  // ── REENVIAR VERIFICAÇÃO ──
  async function handleResendVerification() {
    setLoading(true); setError(""); setSuccess("")
    try {
      const res  = await fetch(`${API}/resend-verification`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      })
      const data = await res.json()
      if (res.ok) setSuccess(data.msg || "Email reenviado!")
      else        setError(data.msg   || "Erro ao reenviar")
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  // ── ESQUECEU SENHA ──
  async function handleForgotPassword(e) {
    e.preventDefault()
    setLoading(true); setError(""); setSuccess("")
    try {
      const res  = await fetch(`${API}/forgot-password`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) setSuccess(data.msg)
      else        setError(data.msg || "Erro ao enviar email")
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  // ── REDEFINIR SENHA ──
  async function handleResetPassword(e) {
    e.preventDefault()
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return }
    if (password.length < 6) { setError("Senha mínimo 6 caracteres"); return }
    setLoading(true); setError("")
    const resetToken = searchParams.get("token")
    if (!resetToken) {
      setError("Token inválido. Solicite um novo link de recuperação.")
      setLoading(false)
      return
    }
    try {
      const res  = await fetch(`${API}/reset-password`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      })
      const data = await res.json()
      if (res.ok) setScreen("reset-success")
      else        setError(data.msg || "Token inválido ou expirado")
    } catch { setError("Erro ao conectar com o servidor") }
    finally  { setLoading(false) }
  }

  const focus = (e) => { e.target.style.borderColor="rgba(99,102,241,0.6)"; e.target.style.background="rgba(255,255,255,0.1)" }
  const blur  = (e) => { e.target.style.borderColor="rgba(255,255,255,0.15)"; e.target.style.background="rgba(255,255,255,0.06)" }

  return (
    <div style={wrapper}>
      <div style={cityBg} />
      <div style={overlay} />
      <FloatingNumbers />

      <div style={centerLayout}>

        {/* BRANDING */}
        <div style={branding}>
          <img src={logoImg} alt="Finance Control" style={logoStyle} />
          <h1 style={brandTitle}>SV FINANCE</h1>
          <p style={brandSubtitle}>Gerencie suas finanças com inteligência e clareza.</p>
        </div>

        {/* ══ ESCOLHA PF vs PJ ══ */}
        {screen === "choose" && (
          <div style={card}>
            <Corners />
            <div style={cardHeader}>
              <h2 style={cardTitle}>Bem-vindo!</h2>
              <p style={cardSub}>Como você deseja usar o Finance Control?</p>
            </div>
            <div style={divider} />
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <button onClick={() => goTo("register-personal")} style={choiceBtn("#22c55e")}>
                <div style={{ fontSize:"2rem", marginBottom:8 }}>👤</div>
                <div style={{ fontWeight:700, fontSize:"1.1rem", color:"#fff", marginBottom:4 }}>Uso Pessoal</div>
                <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>Controle financeiro pessoal — gastos, receitas, contas e análises</div>
                <div style={{ marginTop:10, display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
                  {["💸 Transações","📄 Contas","📊 Analytics"].map(t=>(
                    <span key={t} style={{ background:"rgba(34,197,94,0.2)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"3px 10px", fontSize:"0.72rem", color:"#86efac" }}>{t}</span>
                  ))}
                </div>
              </button>
              <button onClick={() => goTo("register-business")} style={choiceBtn("#6366f1")}>
                <div style={{ fontSize:"2rem", marginBottom:8 }}>🏢</div>
                <div style={{ fontWeight:700, fontSize:"1.1rem", color:"#fff", marginBottom:4 }}>Uso Empresarial</div>
                <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>Gestão completa — vendas, estoque, equipe, orçamentos e clientes</div>
                <div style={{ marginTop:10, display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
                  {["🛒 Vendas","📦 Estoque","👥 Equipe","🧾 Orçamentos"].map(t=>(
                    <span key={t} style={{ background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:20, padding:"3px 10px", fontSize:"0.72rem", color:"#a5b4fc" }}>{t}</span>
                  ))}
                </div>
              </button>
            </div>
            <div style={toggleRow}>
              <span style={toggleText}>Já tem uma conta?</span>
              <button onClick={() => goTo("login")} style={{ ...toggleBtn, color:"#818cf8" }}>Fazer login</button>
            </div>
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {screen === "login" && (
          <div style={card}>
            <Corners />
            <div style={cardHeader}>
              <h2 style={cardTitle}>Acessar conta</h2>
              <p style={cardSub}>Insira suas credenciais</p>
            </div>
            <div style={divider} />
            {error   && <div style={alertError}>⚠️ {error}</div>}
            {success && <div style={alertSuccess}>✅ {success}</div>}
            <form onSubmit={handleLogin} style={formBody}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Email</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={{ textAlign:"right", marginTop:-8 }}>
                <button type="button" onClick={() => goTo("forgot-password")} style={{ background:"none", border:"none", color:"rgba(129,140,248,0.7)", fontSize:"12px", cursor:"pointer", padding:0 }}>
                  Esqueceu a senha?
                </button>
              </div>
              <button type="submit" disabled={loading} style={{ ...submitBtn, opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
                <span style={{ color:"#1e1b4b", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                  {loading ? "Aguarde..." : "ENTRAR"}
                </span>
              </button>
            </form>
            <div style={toggleRow}>
              <span style={toggleText}>Não tem uma conta?</span>
              <button onClick={() => goTo("choose")} style={{ ...toggleBtn, color:"#22c55e" }}>Criar conta</button>
            </div>
          </div>
        )}

        {/* ══ CADASTRO PF ══ */}
        {screen === "register-personal" && (
          <div style={card}>
            <Corners color="#22c55e" />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => goTo("choose")} style={backBtn}>← Voltar</button>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:"1.3rem" }}>👤</span>
                  <h2 style={{ ...cardTitle, margin:0, fontSize:"1.3rem" }}>Conta Pessoal</h2>
                </div>
                <p style={{ ...cardSub, margin:0 }}>Controle financeiro pessoal · Sempre gratuito</p>
              </div>
            </div>
            <div style={{ ...divider, background:"linear-gradient(90deg,transparent,rgba(34,197,94,0.4),transparent)" }} />
            {error && <div style={alertError}>⚠️ {error}</div>}
            <form onSubmit={handleRegisterPersonal} style={formBody}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nome completo</label>
                <input type="text" placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Email</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Confirmar senha</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:10, padding:"12px 16px", fontSize:"0.8rem", color:"rgba(255,255,255,0.5)" }}>
                ✅ Inclui: Dashboard · Transações · Contas · Analytics · Metas
              </div>
              <button type="submit" disabled={loading} style={{ ...submitBtn, background:"linear-gradient(135deg,#22c55e,#16a34a)", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                  {loading ? "Aguarde..." : "CRIAR CONTA PESSOAL"}
                </span>
              </button>
            </form>
            <div style={toggleRow}>
              <span style={toggleText}>Já tem uma conta?</span>
              <button onClick={() => goTo("login")} style={{ ...toggleBtn, color:"#818cf8" }}>Fazer login</button>
            </div>
          </div>
        )}

        {/* ══ CADASTRO PJ ══ */}
        {screen === "register-business" && (
          <div style={card}>
            <Corners color="#6366f1" />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => goTo("choose")} style={backBtn}>← Voltar</button>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:"1.3rem" }}>🏢</span>
                  <h2 style={{ ...cardTitle, margin:0, fontSize:"1.3rem" }}>Conta Empresarial</h2>
                </div>
                <p style={{ ...cardSub, margin:0 }}>Gestão completa para sua empresa</p>
              </div>
            </div>
            <div style={{ ...divider, background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)" }} />
            {error && <div style={alertError}>⚠️ {error}</div>}
            <form onSubmit={handleRegisterBusiness} style={formBody}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nome completo</label>
                <input type="text" placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nome da empresa</label>
                <input type="text" placeholder="Ex: Minha Empresa LTDA" value={companyName} onChange={e=>setCompanyName(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:2, paddingLeft:8 }}>Você poderá adicionar funcionários depois</span>
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Email</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Confirmar senha</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <NichoSelector selected={selectedNicho} onSelect={setSelectedNicho} />
              <div style={{ background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:10, padding:"12px 16px", fontSize:"0.8rem", color:"rgba(255,255,255,0.5)" }}>
                ✅ Inclui: Vendas · Estoque · Equipe · Orçamentos · Clientes · Financeiro
              </div>
              <button type="submit" disabled={loading} style={{ ...submitBtn, background:"linear-gradient(135deg,#6366f1,#4f46e5)", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                  {loading ? "Aguarde..." : "CRIAR EMPRESA"}
                </span>
              </button>
            </form>
            <div style={toggleRow}>
              <span style={toggleText}>Já tem uma conta?</span>
              <button onClick={() => goTo("login")} style={{ ...toggleBtn, color:"#22c55e" }}>Fazer login</button>
            </div>
          </div>
        )}

        {/* ══ AGUARDANDO VERIFICAÇÃO ══ */}
        {screen === "verify-pending" && (
          <div style={card}>
            <Corners color="#f59e0b" />
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:"3.5rem", marginBottom:16 }}>📧</div>
              <h2 style={{ ...cardTitle, marginBottom:8 }}>Verifique seu email</h2>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.88rem", lineHeight:1.6, marginBottom:20 }}>
                Enviamos um link de confirmação para:<br/>
                <strong style={{ color:"#f59e0b" }}>{unverifiedEmail || "seu email"}</strong>
              </p>
              <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:"16px", marginBottom:24, fontSize:"0.82rem", color:"rgba(255,255,255,0.45)", lineHeight:1.7 }}>
                📌 Clique no link do email para ativar sua conta.<br/>
                Verifique também a pasta de <strong style={{ color:"rgba(255,255,255,0.6)" }}>spam</strong>.
              </div>
              {error   && <div style={{ ...alertError,   marginBottom:12 }}>⚠️ {error}</div>}
              {success && <div style={{ ...alertSuccess, marginBottom:12 }}>✅ {success}</div>}
              <button onClick={handleResendVerification} disabled={loading}
                style={{ width:"100%", padding:"12px", borderRadius:50, border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.08)", color:"#f59e0b", fontWeight:600, cursor:loading?"not-allowed":"pointer", fontSize:"0.9rem", marginBottom:12, opacity:loading?0.6:1 }}>
                {loading ? "Reenviando..." : "📨 Reenviar email"}
              </button>
              <button onClick={() => goTo("login")}
                style={{ width:"100%", padding:"12px", borderRadius:50, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"rgba(255,255,255,0.4)", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" }}>
                ← Voltar ao login
              </button>
            </div>
          </div>
        )}

        {/* ══ VERIFICANDO ══ */}
        {screen === "verifying" && (
          <div style={card}>
            <Corners color="#6366f1" />
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:"3rem", marginBottom:16 }}>⏳</div>
              <h2 style={{ ...cardTitle, marginBottom:8 }}>Verificando...</h2>
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.88rem" }}>Aguarde um momento</p>
            </div>
          </div>
        )}

        {/* ══ VERIFICAÇÃO OK ══ */}
        {screen === "verify-success" && (
          <div style={card}>
            <Corners color="#22c55e" />
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:"3.5rem", marginBottom:16 }}>🎉</div>
              <h2 style={{ ...cardTitle, marginBottom:8, color:"#22c55e" }}>Email verificado!</h2>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.88rem", lineHeight:1.6, marginBottom:28 }}>
                Sua conta foi ativada com sucesso.<br/>Agora você pode fazer login.
              </p>
              <button onClick={() => goTo("login")} style={{ ...submitBtn, background:"linear-gradient(135deg,#22c55e,#16a34a)" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>FAZER LOGIN</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ VERIFICAÇÃO ERRO ══ */}
        {screen === "verify-error" && (
          <div style={card}>
            <Corners color="#ef4444" />
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:"3.5rem", marginBottom:16 }}>❌</div>
              <h2 style={{ ...cardTitle, marginBottom:8, color:"#ef4444" }}>Link inválido</h2>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.88rem", lineHeight:1.6, marginBottom:28 }}>
                Este link já foi usado ou expirou.<br/>Solicite um novo link de verificação.
              </p>
              <button onClick={() => goTo("login")} style={{ ...submitBtn, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px" }}>← Voltar ao login</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ ESQUECEU SENHA ══ */}
        {screen === "forgot-password" && (
          <div style={card}>
            <Corners color="#818cf8" />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => goTo("login")} style={backBtn}>← Voltar</button>
              <div style={{ flex:1 }}>
                <h2 style={{ ...cardTitle, margin:0, fontSize:"1.3rem" }}>🔑 Esqueceu a senha?</h2>
                <p style={{ ...cardSub, margin:0 }}>Enviaremos um link para redefinir</p>
              </div>
            </div>
            <div style={divider} />
            {error   && <div style={alertError}>⚠️ {error}</div>}
            {success && <div style={alertSuccess}>✅ {success}</div>}
            {!success && (
              <form onSubmit={handleForgotPassword} style={formBody}>
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Email da conta</label>
                  <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
                </div>
                <button type="submit" disabled={loading} style={{ ...submitBtn, background:"linear-gradient(135deg,#6366f1,#4f46e5)", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
                  <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                    {loading ? "Enviando..." : "ENVIAR LINK"}
                  </span>
                </button>
              </form>
            )}
            {success && (
              <button onClick={() => goTo("login")} style={{ ...submitBtn, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", marginTop:8 }}>
                <span style={{ color:"rgba(255,255,255,0.7)", fontWeight:"700", fontSize:"15px" }}>← Voltar ao login</span>
              </button>
            )}
          </div>
        )}

        {/* ══ REDEFINIR SENHA ══ */}
        {screen === "reset-password" && (
          <div style={card}>
            <Corners color="#f59e0b" />
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>🔐</div>
              <h2 style={{ ...cardTitle, marginBottom:4 }}>Nova senha</h2>
              <p style={{ ...cardSub }}>Digite sua nova senha abaixo</p>
            </div>
            <div style={divider} />
            {error && <div style={alertError}>⚠️ {error}</div>}
            <form onSubmit={handleResetPassword} style={formBody}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nova senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Confirmar nova senha</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <button type="submit" disabled={loading} style={{ ...submitBtn, background:"linear-gradient(135deg,#f59e0b,#d97706)", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                  {loading ? "Salvando..." : "REDEFINIR SENHA"}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* ══ RESET OK ══ */}
        {screen === "reset-success" && (
          <div style={card}>
            <Corners color="#22c55e" />
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:"3.5rem", marginBottom:16 }}>✅</div>
              <h2 style={{ ...cardTitle, marginBottom:8, color:"#22c55e" }}>Senha redefinida!</h2>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.88rem", lineHeight:1.6, marginBottom:28 }}>
                Sua senha foi atualizada com sucesso.<br/>Faça login com a nova senha.
              </p>
              <button onClick={() => goTo("login")} style={{ ...submitBtn, background:"linear-gradient(135deg,#22c55e,#16a34a)" }}>
                <span style={{ color:"#fff", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>FAZER LOGIN</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helpers ──
function Corners({ color = "rgba(99,102,241,0.7)" }) {
  const base = { position:"absolute", width:"20px", height:"20px" }
  return (
    <>
      <div style={{ ...base, top:0,    left:0,  borderTop:`2px solid ${color}`,    borderLeft:`2px solid ${color}` }} />
      <div style={{ ...base, top:0,    right:0, borderTop:`2px solid ${color}`,    borderRight:`2px solid ${color}` }} />
      <div style={{ ...base, bottom:0, left:0,  borderBottom:`2px solid ${color}`, borderLeft:`2px solid ${color}` }} />
      <div style={{ ...base, bottom:0, right:0, borderBottom:`2px solid ${color}`, borderRight:`2px solid ${color}` }} />
    </>
  )
}
function choiceBtn(color) {
  return { width:"100%", padding:"20px", borderRadius:14, cursor:"pointer", border:`1px solid ${color}33`, background:`linear-gradient(135deg, ${color}11, ${color}08)`, backdropFilter:"blur(8px)", textAlign:"center", transition:"all 0.2s" }
}

// ── Estilos ──
const wrapper       = { position:"relative", minHeight:"100vh", overflow:"hidden", fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }
const cityBg        = { position:"fixed", inset:0, backgroundImage:`url("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80")`, backgroundSize:"cover", backgroundPosition:"center", filter:"blur(3px) brightness(0.5)", transform:"scale(1.05)", zIndex:0 }
const overlay       = { position:"fixed", inset:0, background:`linear-gradient(180deg,rgba(2,6,23,0.7) 0%,rgba(2,6,23,0.4) 50%,rgba(2,6,23,0.8) 100%),radial-gradient(ellipse at 50% 50%,rgba(99,102,241,0.12) 0%,transparent 70%)`, zIndex:1 }
const centerLayout  = { position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", gap:"28px", width:"100%", maxWidth:"520px", padding:"40px 20px" }
const branding      = { textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center" }
const logoStyle     = { width:"300px", height:"300px", objectFit:"contain" }
const brandTitle    = { fontSize:"32px", fontWeight:"400", color:"white", margin:"0 0 8px 0", letterSpacing:"8px", fontFamily:"'Bodoni Moda','Bodoni MT',Georgia,serif" }
const brandSubtitle = { fontSize:"13px", color:"rgba(255,255,255,0.45)", margin:0, letterSpacing:"1px", fontFamily:"'Times New Roman',Times,serif" }
const card          = { width:"100%", position:"relative", background:"rgba(15,20,40,0.0)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.08)", borderTop:"1px solid rgba(210,210,255,0.55)", borderLeft:"1px solid rgba(180,180,240,0.35)", padding:"40px", clipPath:"polygon(24px 0%,100% 0%,100% calc(100% - 24px),calc(100% - 24px) 100%,0% 100%,0% 24px)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15),inset 1px 0 0 rgba(255,255,255,0.08),0 20px 60px rgba(0,0,0,0.5)" }
const cardHeader    = { marginBottom:"20px", textAlign:"center" }
const cardTitle     = { fontSize:"26px", fontWeight:"700", color:"white", margin:"0 0 6px 0", letterSpacing:"-0.5px" }
const cardSub       = { fontSize:"13px", color:"rgba(255,255,255,0.4)", margin:0 }
const divider       = { height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", marginBottom:"28px" }
const alertError    = { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", padding:"11px 14px", borderRadius:"8px", fontSize:"13px", marginBottom:"18px" }
const alertSuccess  = { background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", color:"#34d399", padding:"11px 14px", borderRadius:"8px", fontSize:"13px", marginBottom:"18px" }
const formBody      = { display:"flex", flexDirection:"column", gap:"16px" }
const fieldGroup    = { display:"flex", flexDirection:"column", gap:"7px" }
const fieldLabel    = { fontSize:"12px", fontWeight:"500", color:"rgba(255,255,255,0.6)", letterSpacing:"0.5px" }
const inputStyle    = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"50px", padding:"13px 20px", color:"white", fontSize:"14px", outline:"none", transition:"all 0.2s", width:"100%", boxSizing:"border-box", colorScheme:"dark" }
const submitBtn     = { width:"100%", padding:"14px", borderRadius:"50px", border:"none", background:"white", marginTop:"8px", transition:"all 0.2s", boxShadow:"0 4px 20px rgba(255,255,255,0.15)", cursor:"pointer" }
const toggleRow     = { display:"flex", justifyContent:"center", alignItems:"center", gap:"8px", marginTop:"20px" }
const toggleText    = { fontSize:"13px", color:"rgba(255,255,255,0.4)" }
const toggleBtn     = { background:"none", border:"none", fontSize:"13px", fontWeight:"600", cursor:"pointer", padding:0 }
const backBtn       = { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"rgba(255,255,255,0.6)", padding:"6px 12px", cursor:"pointer", fontSize:13, flexShrink:0 }