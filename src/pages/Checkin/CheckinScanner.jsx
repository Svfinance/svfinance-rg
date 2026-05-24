// src/pages/Checkin/CheckinScanner.jsx
// ─────────────────────────────────────────────────────────────
// PWA com câmera real para check-in e check-out de OS
// Usa jsQR para ler QR Code via câmera do celular
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"

const API = "https://api.svfinance.com.br/api"

// ── Carrega jsQR dinamicamente (sem precisar instalar) ────────
async function loadJsQR() {
  if (window.jsQR) return window.jsQR
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"
    script.onload = () => resolve(window.jsQR)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function CheckinScanner() {
  const { clientId }   = useParams()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // Estado geral
  const [step, setStep]         = useState("loading")
  // loading → checking_open → select_action → scanning → confirming → success → error
  const [client, setClient]     = useState(null)
  const [openCheckin, setOpen]  = useState(null)  // check-in em aberto
  const [action, setAction]     = useState(null)  // "start" | "finish"
  const [location, setLocation] = useState(null)
  const [notes, setNotes]       = useState("")
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState("")
  const [sending, setSending]   = useState(false)

  // Câmera
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scannerRef  = useRef(null)
  const [cameraErr, setCameraErr] = useState("")

  const token      = localStorage.getItem("token")
  const companyId  = searchParams.get("c") || localStorage.getItem("company_id")

  // ── 1. Verifica autenticação ──────────────────────────────
  useEffect(() => {
    if (!token) {
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }
    init()
  }, [])

  async function init() {
    await loadClientData()
    await checkOpenCheckin()
    requestLocation()
  }

  // ── 2. Carrega dados do cliente ───────────────────────────
  async function loadClientData() {
    try {
      const res  = await fetch(`${API}/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { navigate("/"); return }
      const data = await res.json()
      setClient(data)
    } catch {
      setError("Erro ao carregar cliente.")
      setStep("error")
    }
  }

  // ── 3. Verifica se tem check-in em aberto ─────────────────
  async function checkOpenCheckin() {
    try {
      const res  = await fetch(`${API}/checkin/open`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.open) {
        setOpen(data)
        setStep("select_action")
      } else {
        setStep("select_action")
      }
    } catch {
      setStep("select_action")
    }
  }

  // ── 4. GPS ────────────────────────────────────────────────
  function requestLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // ── 5. Câmera ─────────────────────────────────────────────
  async function startCamera() {
    setCameraErr("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      startScanning()
    } catch (e) {
      setCameraErr("Câmera não autorizada. Permita o acesso nas configurações do navegador.")
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (scannerRef.current) {
      cancelAnimationFrame(scannerRef.current)
      scannerRef.current = null
    }
  }

  function startScanning() {
    const jsQR = window.jsQR
    if (!jsQR) return

    function scan() {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== 4) {
        scannerRef.current = requestAnimationFrame(scan)
        return
      }

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data.includes("/checkin/")) {
        stopCamera()
        handleQRDetected(code.data)
        return
      }
      scannerRef.current = requestAnimationFrame(scan)
    }
    scannerRef.current = requestAnimationFrame(scan)
  }

  useEffect(() => {
    if (step === "scanning") startCamera()
    return () => { if (step !== "scanning") stopCamera() }
  }, [step])

  // ── 6. QR detectado → confirma ────────────────────────────
  function handleQRDetected(url) {
    // Valida que o QR é do cliente correto
    const expectedPattern = `/checkin/${clientId}`
    if (!url.includes(expectedPattern)) {
      setError(`QR Code não corresponde a este cliente. Escaneie o QR Code correto.`)
      setStep("select_action")
      return
    }
    setStep("confirming")
  }

  // ── 7. Registra check-in ou check-out ─────────────────────
  async function handleConfirm() {
    setSending(true)
    setError("")
    try {
      let res, data

      if (action === "start") {
        // CHECK-IN — chegada
        res = await fetch(`${API}/checkin/${clientId}/start`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lat:   location?.lat,
            lon:   location?.lon,
            notes: notes || null,
          }),
        })
        data = await res.json()
        if (!res.ok) { setError(data.msg || "Erro ao registrar."); return }
        setResult({ ...data, action: "start" })

      } else {
        // CHECK-OUT — saída
        res = await fetch(`${API}/checkin/${openCheckin.checkin_id}/finish`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lat:   location?.lat,
            lon:   location?.lon,
            notes: notes || null,
          }),
        })
        data = await res.json()
        if (!res.ok) { setError(data.msg || "Erro ao registrar."); return }
        setResult({ ...data, action: "finish" })
      }

      setStep("success")
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSending(false)
    }
  }

  // ── Hora atual formatada ──────────────────────────────────
  const now          = new Date()
  const horaFmt      = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const dataFmt      = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })

  // ── ESTILOS ───────────────────────────────────────────────
  const S = {
    page:    { minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'DM Sans', sans-serif" },
    card:    { width: "100%", maxWidth: 420, background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    brand:   { textAlign: "center", marginBottom: 24 },
    brandT:  { fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: "#4f8ef7", textTransform: "uppercase" },
    brandS:  { fontSize: 11, color: "#6b7fa3", marginTop: 2 },
    clientB: { background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 16, padding: "16px 18px", marginBottom: 20, textAlign: "center" },
    clientN: { color: "#f0f4ff", fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Syne', sans-serif" },
    time:    { textAlign: "center", marginBottom: 20 },
    timeH:   { fontSize: "2rem", fontWeight: 700, color: "#f0f4ff" },
    timeD:   { fontSize: 13, color: "#6b7fa3", textTransform: "capitalize" },
    btnP:    { width: "100%", padding: 16, background: "linear-gradient(135deg, #4f8ef7, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, boxShadow: "0 4px 20px rgba(79,142,247,0.4)" },
    btnS:    { width: "100%", padding: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#6b7fa3", fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    btnG:    { width: "100%", padding: 16, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    input:   { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f0f4ff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 14, resize: "none" },
    err:     { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 },
    badge:   (color) => ({ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${color}20`, color, marginBottom: 8 }),
    footer:  { textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" },
  }

  // ══════════════════════════════════════════════════════════
  // RENDERS POR STEP
  // ══════════════════════════════════════════════════════════

  function Brand() {
    return (
      <div style={S.brand}>
        <div style={S.brandT}>SV Finance</div>
        <div style={S.brandS}>Registro de Serviço</div>
      </div>
    )
  }

  function ClientInfo() {
    return client ? (
      <div style={S.clientB}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🏪</div>
        <div style={S.clientN}>{client.name}</div>
        {client.address && <div style={{ color: "#6b7fa3", fontSize: 12, marginTop: 4 }}>{client.address}</div>}
      </div>
    ) : null
  }

  // STEP: loading
  if (step === "loading") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", color: "#6b7fa3", padding: "40px 0" }}>⏳ Carregando...</div>
    </div></div>
  )

  // STEP: error
  if (step === "error") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
        <div style={{ color: "#f87171" }}>{error}</div>
      </div>
    </div></div>
  )

  // STEP: select_action — escolhe iniciar ou finalizar
  if (step === "select_action") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <ClientInfo />

      <div style={S.time}>
        <div style={S.timeH}>{horaFmt}</div>
        <div style={S.timeD}>{dataFmt}</div>
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      {openCheckin ? (
        // Tem check-in em aberto → só pode finalizar
        <>
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>⏱️ Serviço em andamento</div>
            <div style={{ color: "#6b7fa3", fontSize: 13 }}>
              Check-in: {openCheckin.checkin_at?.slice(11, 16)}
              {openCheckin.order_number && ` · ${openCheckin.order_number}`}
            </div>
          </div>
          <button style={S.btnG} onClick={() => { setAction("finish"); setStep("scanning") }}>
            ✅ Finalizar serviço — Escanear QR Code
          </button>
        </>
      ) : (
        // Sem check-in aberto → pode iniciar
        <button style={S.btnP} onClick={() => { setAction("start"); setStep("scanning") }}>
          📍 Iniciar serviço — Escanear QR Code
        </button>
      )}

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={{ fontSize: 11, color: "#6b7fa3", textDecoration: "none" }}>
          Powered by <strong style={{ color: "#4f8ef7" }}>svfinance.com.br</strong>
        </a>
      </div>
    </div></div>
  )

  // STEP: scanning — câmera ativa
  if (step === "scanning") return (
    <div style={S.page}><div style={{ ...S.card, padding: "24px 20px" }}>
      <Brand />

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={S.badge(action === "start" ? "#4f8ef7" : "#22c55e")}>
          {action === "start" ? "📍 CHECK-IN — ENTRADA" : "✅ CHECK-OUT — SAÍDA"}
        </div>
        <div style={{ color: "#6b7fa3", fontSize: 13, marginTop: 4 }}>
          Aponte a câmera para o QR Code na vitrine do cliente
        </div>
      </div>

      {/* Viewfinder da câmera */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 16, background: "#000", aspectRatio: "4/3" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Moldura de scan */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 200, height: 200, border: "3px solid #4f8ef7", borderRadius: 16, boxShadow: "0 0 0 2000px rgba(0,0,0,0.4)" }}>
            {/* Cantos decorativos */}
            {[["0","0","0","auto"],["0","auto","0","0"],["auto","0","auto","auto"],["auto","auto","auto","0"]].map(([t,r,b,l], i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, top: t==="0"?"0":undefined, bottom: b==="auto"?undefined:"0", left: l==="0"?"0":undefined, right: r==="auto"?undefined:"0", borderTop: (t==="0")?"3px solid #4f8ef7":"none", borderLeft: (l==="0")?"3px solid #4f8ef7":"none", borderBottom: (b!=="auto")?"3px solid #4f8ef7":"none", borderRight: (r!=="auto")?"3px solid #4f8ef7":"none" }} />
            ))}
          </div>
        </div>
      </div>

      {cameraErr && <div style={S.err}>📷 {cameraErr}</div>}

      <button style={S.btnS} onClick={() => { stopCamera(); setStep("select_action") }}>
        ← Cancelar
      </button>
    </div></div>
  )

  // STEP: confirming — confirmação antes de enviar
  if (step === "confirming") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <ClientInfo />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={S.badge(action === "start" ? "#4f8ef7" : "#22c55e")}>
          {action === "start" ? "📍 CHECK-IN — ENTRADA" : "✅ CHECK-OUT — SAÍDA"}
        </div>
        <div style={S.timeH}>{horaFmt}</div>
        <div style={S.timeD}>{dataFmt}</div>
      </div>

      {action === "finish" && openCheckin && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#6b7fa3", textAlign: "center" }}>
          Entrada: {openCheckin.checkin_at?.slice(11, 16)} · O.S: {openCheckin.order_number || "—"}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#6b7fa3", fontSize: 12, marginBottom: 6 }}>Observação (opcional)</div>
        <textarea
          style={S.input}
          rows={3}
          placeholder={action === "start" ? "Ex: vidro lateral com mancha antiga" : "Ex: serviço concluído, cliente satisfeito"}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12, color: location ? "#22c55e" : "#6b7fa3" }}>
        <span>{location ? "📍 Localização capturada" : "📍 Sem localização"}</span>
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      <button
        style={{ ...( action === "start" ? S.btnP : S.btnG ), opacity: sending ? 0.6 : 1, cursor: sending ? "not-allowed" : "pointer" }}
        onClick={handleConfirm}
        disabled={sending}
      >
        {sending ? "Registrando..." : action === "start" ? "✓ Confirmar entrada" : "✓ Confirmar saída"}
      </button>

      <button style={S.btnS} onClick={() => setStep("scanning")} disabled={sending}>
        ← Escanear novamente
      </button>
    </div></div>
  )

  // STEP: success
  if (step === "success") return (
    <div style={S.page}><div style={S.card}>
      <Brand />

      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {result?.action === "start" ? "📍" : "✅"}
        </div>
        <div style={{ color: result?.action === "start" ? "#4f8ef7" : "#22c55e", fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>
          {result?.action === "start" ? "Check-in registrado!" : "Serviço concluído!"}
        </div>

        {result?.action === "finish" && result?.duration_str && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px 16px", margin: "16px 0", display: "inline-block" }}>
            <div style={{ color: "#6b7fa3", fontSize: 12, marginBottom: 4 }}>Duração do serviço</div>
            <div style={{ color: "#22c55e", fontSize: "1.5rem", fontWeight: 700 }}>{result.duration_str}</div>
          </div>
        )}

        <div style={{ color: "#6b7fa3", fontSize: 13, marginTop: 8 }}>
          {dataFmt} às {horaFmt}
        </div>

        {client && (
          <div style={{ color: "#f0f4ff", fontWeight: 600, marginTop: 8 }}>{client.name}</div>
        )}
      </div>

      <button style={S.btnS} onClick={() => { setStep("select_action"); setResult(null); setNotes(""); checkOpenCheckin(); }}>
        Registrar outro serviço
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={{ fontSize: 11, color: "#6b7fa3", textDecoration: "none" }}>
          Powered by <strong style={{ color: "#4f8ef7" }}>svfinance.com.br</strong>
        </a>
      </div>
    </div></div>
  )

  return null
}