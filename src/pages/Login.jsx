import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { loginUser, registerUser } from "../services/api"
import logoImg from "../assets/logo.gif"

// =========================
// CANVAS — NÚMEROS FLUTUANDO
// =========================

function FloatingNumbers() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: false })

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const symbols = [
      "+2.4%", "R$", "↑", "▲", "1.847", "%",
      "+R$320", "▲12%", "€", "$", "+4.1%",
      "3.500", "↗", "R$1k", "▼", "+18%"
    ]

    const layers = [
      { count: 8,  speedMin: 0.6, speedMax: 1.0, sizeMin: 9,  sizeMax: 12, opacityMax: 0.12 },
      { count: 6,  speedMin: 1.0, speedMax: 1.6, sizeMin: 12, sizeMax: 16, opacityMax: 0.18 },
      { count: 5,  speedMin: 1.6, speedMax: 2.4, sizeMin: 16, sizeMax: 24, opacityMax: 0.30 },
    ]

    const particles = []
    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 300,
          speed: layer.speedMin + Math.random() * (layer.speedMax - layer.speedMin),
          opacity: 0,
          maxOpacity: 0.04 + Math.random() * layer.opacityMax,
          size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          drift: (Math.random() - 0.5) * 0.2,
          layer: layerIndex,
          positive: null
        })
      }
    })

    particles.forEach(p => {
      p.positive = /[+▲↑↗]/.test(p.symbol)
    })

    let animId
    let lastTime = 0

    const animate = (timestamp) => {
      if (timestamp - lastTime < 33) { animId = requestAnimationFrame(animate); return }
      lastTime = timestamp
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.y -= p.speed
        p.x += p.drift
        if (p.opacity < p.maxOpacity) p.opacity += 0.003
        if (p.y < canvas.height * 0.2) p.opacity -= 0.006
        if (p.y < -40 || p.opacity <= 0) {
          p.y = canvas.height + Math.random() * 150
          p.x = Math.random() * canvas.width
          p.opacity = 0
          const newSymbol = symbols[Math.floor(Math.random() * symbols.length)]
          p.symbol = newSymbol
          p.positive = /[+▲↑↗]/.test(newSymbol)
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

  return (
    <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }} />
  )
}


// =========================
// LOGIN / REGISTRO
// =========================

function Login() {
  const [isRegister, setIsRegister]           = useState(false)
  const [name, setName]                       = useState("")
  const [companyName, setCompanyName]         = useState("")
  const [email, setEmail]                     = useState("")
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")
  const [success, setSuccess]                 = useState("")

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) navigate("/dashboard")
  }, [])

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setName(""); setCompanyName(""); setEmail("")
    setPassword(""); setConfirmPassword("")
    setError(""); setSuccess("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (isRegister && !name.trim()) {
      setError("Nome é obrigatório"); setLoading(false); return
    }
    if (isRegister && !companyName.trim()) {
      setError("Nome da empresa é obrigatório"); setLoading(false); return
    }
    if (isRegister && password !== confirmPassword) {
      setError("As senhas não coincidem"); setLoading(false); return
    }
    if (isRegister && password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres"); setLoading(false); return
    }

    try {
      if (isRegister) {
        const response = await registerUser(email, password, name, companyName)
        const data = await response.json()
        if (response.ok) {
          setSuccess("Empresa criada com sucesso! Faça login.")
          setIsRegister(false)
          setName(""); setCompanyName(""); setEmail("")
          setPassword(""); setConfirmPassword("")
        } else {
          setError(data.msg || "Erro ao criar conta")
        }
      } else {
        // loginUser agora retorna { ok, data } — já salva no localStorage internamente
        const { ok, data } = await loginUser(email, password)
        if (ok) {
          navigate("/dashboard")
        } else {
          setError(data.msg || "Email ou senha inválidos")
        }
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const focusStyle = (e) => {
    e.target.style.borderColor = "rgba(99,102,241,0.6)"
    e.target.style.background  = "rgba(255,255,255,0.1)"
  }
  const blurStyle = (e) => {
    e.target.style.borderColor = "rgba(255,255,255,0.15)"
    e.target.style.background  = "rgba(255,255,255,0.06)"
  }

  return (
    <div style={wrapper}>
      <div style={cityBg} />
      <div style={overlay} />
      <FloatingNumbers />

      <div style={centerLayout}>

        {/* BRANDING */}
        <div style={branding}>
          <img src={logoImg} alt="Finance Control Logo" style={logoStyle} />
          <h1 style={brandTitle}>FINANCE CONTROL</h1>
          <p style={brandSubtitle}>Gerencie suas finanças com inteligência e clareza.</p>
        </div>

        {/* CARD */}
        <div style={inteachCard}>
          <div style={cornerTL} /><div style={cornerTR} />
          <div style={cornerBL} /><div style={cornerBR} />

          <div style={cardHeader}>
            <h2 style={cardTitle}>{isRegister ? "Criar conta" : "Acessar conta"}</h2>
            <p style={cardSub}>{isRegister ? "Preencha os dados abaixo" : "Insira suas credenciais"}</p>
          </div>

          <div style={divider} />

          {error   && <div style={alertError}>⚠️ {error}</div>}
          {success && <div style={alertSuccess}>✅ {success}</div>}

          <form onSubmit={handleSubmit} style={formBody}>

            {isRegister && (
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nome completo</label>
                <input type="text" placeholder="Seu nome" value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
              </div>
            )}

            {isRegister && (
              <div style={fieldGroup}>
                <label style={fieldLabel}>Nome da empresa</label>
                <input type="text" placeholder="Ex: Minha Empresa LTDA" value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:2, paddingLeft:8 }}>
                  Você poderá adicionar funcionários depois
                </span>
              </div>
            )}

            <div style={fieldGroup}>
              <label style={fieldLabel}>Email</label>
              <input type="email" placeholder="seu@email.com" value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
            </div>

            <div style={fieldGroup}>
              <label style={fieldLabel}>Senha</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
            </div>

            {isRegister && (
              <div style={fieldGroup}>
                <label style={fieldLabel}>Confirmar senha</label>
                <input type="password" placeholder="••••••••" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ ...submitBtn, opacity: loading?0.6:1, cursor: loading?"not-allowed":"pointer" }}>
              <span style={{ color: isRegister?"#059669":"#1e1b4b", fontWeight:"700", fontSize:"15px", letterSpacing:"1px" }}>
                {loading ? "Aguarde..." : isRegister ? "CRIAR EMPRESA" : "ENTRAR"}
              </span>
            </button>

          </form>

          <div style={toggleRow}>
            <span style={toggleText}>{isRegister ? "Já tem uma conta?" : "Não tem uma conta?"}</span>
            <button type="button" onClick={toggleMode}
              style={{ ...toggleBtn, color: isRegister?"#818cf8":"#22c55e" }}>
              {isRegister ? "Fazer login" : "Cadastre-se"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// =========================
// ESTILOS
// =========================

const wrapper       = { position:"relative", minHeight:"100vh", overflow:"hidden", fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }
const cityBg        = { position:"fixed", inset:0, backgroundImage:`url("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80")`, backgroundSize:"cover", backgroundPosition:"center", filter:"blur(3px) brightness(0.5)", transform:"scale(1.05)", zIndex:0 }
const overlay       = { position:"fixed", inset:0, background:`linear-gradient(180deg,rgba(2,6,23,0.7) 0%,rgba(2,6,23,0.4) 50%,rgba(2,6,23,0.8) 100%),radial-gradient(ellipse at 50% 50%,rgba(99,102,241,0.12) 0%,transparent 70%)`, zIndex:1 }
const centerLayout  = { position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", gap:"28px", width:"100%", maxWidth:"520px", padding:"40px 20px" }
const branding      = { textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:"0px" }
const logoStyle     = { width:"300px", height:"300px", objectFit:"contain", marginBottom:"0px" }
const brandTitle    = { fontSize:"32px", fontWeight:"400", color:"white", margin:"0 0 8px 0", letterSpacing:"8px", fontFamily:"'Bodoni Moda','Bodoni MT',Georgia,serif" }
const brandSubtitle = { fontSize:"13px", color:"rgba(255,255,255,0.45)", margin:0, letterSpacing:"1px", fontFamily:"'Times New Roman',Times,serif", fontWeight:"400" }
const inteachCard   = { width:"100%", position:"relative", background:"rgba(15,20,40,0.0)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.08)", borderTop:"1px solid rgba(210,210,255,0.55)", borderLeft:"1px solid rgba(180,180,240,0.35)", padding:"40px", clipPath:"polygon(24px 0%,100% 0%,100% calc(100% - 24px),calc(100% - 24px) 100%,0% 100%,0% 24px)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15),inset 1px 0 0 rgba(255,255,255,0.08),0 20px 60px rgba(0,0,0,0.5)" }
const cornerBase    = { position:"absolute", width:"20px", height:"20px" }
const cornerTL      = { ...cornerBase, top:0, left:0,  borderTop:"2px solid rgba(99,102,241,0.7)", borderLeft:"2px solid rgba(99,102,241,0.7)" }
const cornerTR      = { ...cornerBase, top:0, right:0, borderTop:"2px solid rgba(99,102,241,0.7)", borderRight:"2px solid rgba(99,102,241,0.7)" }
const cornerBL      = { ...cornerBase, bottom:0, left:0,  borderBottom:"2px solid rgba(99,102,241,0.7)", borderLeft:"2px solid rgba(99,102,241,0.7)" }
const cornerBR      = { ...cornerBase, bottom:0, right:0, borderBottom:"2px solid rgba(99,102,241,0.7)", borderRight:"2px solid rgba(99,102,241,0.7)" }
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
const submitBtn     = { width:"100%", padding:"14px", borderRadius:"50px", border:"none", background:"white", marginTop:"8px", transition:"all 0.2s", boxShadow:"0 4px 20px rgba(255,255,255,0.15)" }
const toggleRow     = { display:"flex", justifyContent:"center", alignItems:"center", gap:"8px", marginTop:"20px" }
const toggleText    = { fontSize:"13px", color:"rgba(255,255,255,0.4)" }
const toggleBtn     = { background:"none", border:"none", fontSize:"13px", fontWeight:"600", cursor:"pointer", padding:0 }

export default Login