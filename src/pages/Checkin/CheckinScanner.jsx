// src/pages/Checkin/CheckinScanner.jsx
// Scanner QR Code — @zxing/browser (mais compatível com mobile)
// Fallbacks: código numérico | PIN 4 dígitos | confirmar sem escanear
// Offline-first com sync automático + geolocalização

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { BrowserMultiFormatReader } from "@zxing/browser"

const API = "https://api.svfinance.com.br/api"

// ─── Utilitários ────────────────────────────────────────────────────────────

function horaAtual() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
function dataAtual() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}
function isoNow() {
  return new Date().toISOString()
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #060c1a 0%, #0d1b35 60%, #0a1220 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "'DM Sans', sans-serif",
    WebkitFontSmoothing: "antialiased",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(79,142,247,0.12)",
    borderRadius: 24,
    padding: "24px 20px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
    backdropFilter: "blur(20px)",
  },
  brand: { textAlign: "center", marginBottom: 20 },
  brandLogo: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "4px",
    color: "#4f8ef7",
    textTransform: "uppercase",
  },
  brandSub: { fontSize: 11, color: "#475569", marginTop: 3 },
  offlineBanner: {
    background: "rgba(245,158,11,0.08)",
    border: "1px solid rgba(245,158,11,0.25)",
    borderRadius: 10,
    padding: "8px 14px",
    marginBottom: 14,
    fontSize: 12,
    color: "#f59e0b",
    textAlign: "center",
    fontWeight: 600,
  },
  clientBox: {
    background: "rgba(79,142,247,0.06)",
    border: "1px solid rgba(79,142,247,0.15)",
    borderRadius: 14,
    padding: "12px 16px",
    marginBottom: 18,
    textAlign: "center",
  },
  clientName: { color: "#e2e8f0", fontSize: "1rem", fontWeight: 700 },
  clientSub: { color: "#475569", fontSize: 11, marginTop: 2 },
  // Botões
  btnBlue: {
    width: "100%", padding: "14px 16px",
    background: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)",
    border: "none", borderRadius: 12, color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", marginBottom: 10,
    boxShadow: "0 4px 20px rgba(79,142,247,0.3)",
    transition: "opacity .15s, transform .1s",
  },
  btnGreen: {
    width: "100%", padding: "14px 16px",
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    border: "none", borderRadius: 12, color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", marginBottom: 10,
    boxShadow: "0 4px 20px rgba(34,197,94,0.25)",
    transition: "opacity .15s",
  },
  btnGhost: {
    width: "100%", padding: "12px 16px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, color: "#64748b",
    fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", marginBottom: 10,
    transition: "border-color .15s, color .15s",
  },
  btnAmber: {
    width: "100%", padding: "12px 16px",
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 12, color: "#f59e0b",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", marginBottom: 10,
  },
  btnRed: {
    width: "100%", padding: "12px 16px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 12, color: "#f87171",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", marginBottom: 10,
  },
  errBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#f87171", padding: "10px 14px",
    borderRadius: 10, fontSize: 13, marginBottom: 14,
  },
  successBox: {
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.2)",
    color: "#4ade80", padding: "10px 14px",
    borderRadius: 10, fontSize: 13, marginBottom: 14, textAlign: "center",
  },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
    textTransform: "uppercase", color: "#475569", marginBottom: 10,
    display: "block",
  },
  input: {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#e2e8f0",
    fontSize: 15, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
    marginBottom: 14,
    transition: "border-color .15s",
  },
  textarea: {
    width: "100%", padding: "11px 13px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#e2e8f0",
    fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
    marginBottom: 14, resize: "none",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: "16px 0",
  },
  footer: {
    textAlign: "center", marginTop: 16, paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  footerLink: { fontSize: 10, color: "#334155", textDecoration: "none" },
}

// ─── Componentes menores ─────────────────────────────────────────────────────

function Brand({ offline }) {
  return (
    <div style={S.brand}>
      <div style={S.brandLogo}>SV Finance</div>
      <div style={S.brandSub}>Registro de Serviço</div>
      {offline && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#f59e0b", fontWeight: 700, letterSpacing: "1px" }}>
          📵 MODO OFFLINE
        </div>
      )}
    </div>
  )
}

function ClientBox({ client }) {
  if (!client) return null
  return (
    <div style={S.clientBox}>
      <div style={S.clientName}>{client.name}</div>
      {client.address && <div style={S.clientSub}>{client.address}</div>}
    </div>
  )
}

function ErrBox({ msg }) {
  if (!msg) return null
  return <div style={S.errBox}>⚠️ {msg}</div>
}

function OfflineBanner({ show }) {
  if (!show) return null
  return <div style={S.offlineBanner}>📵 Offline — será sincronizado depois</div>
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
      <div style={{
        width: 32, height: 32, border: "3px solid rgba(79,142,247,0.2)",
        borderTop: "3px solid #4f8ef7", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13 }}>Carregando...</div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function CheckinScanner() {
  const { clientId }   = useParams()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // Estados de fluxo
  const [step, setStep]               = useState("loading")
  // Dados
  const [client, setClient]           = useState(null)
  const [orders, setOrders]           = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openCheckin, setOpenCheckin] = useState(null)
  const [action, setAction]           = useState(null) // "start" | "finish"
  // UI
  const [error, setError]             = useState("")
  const [sending, setSending]         = useState(false)
  const [result, setResult]           = useState(null)
  const [notes, setNotes]             = useState("")
  // Retry
  const [retryInfo, setRetryInfo]         = useState("")
  // Scanner
  const [scannerStatus, setScannerStatus] = useState("idle") // idle | starting | active | error
  const [fallbackMode, setFallbackMode]   = useState(null)  // null | "code" | "pin" | "manual"
  const [manualCode, setManualCode]       = useState("")
  const [pinValue, setPinValue]           = useState("")
  // Localização
  const [location, setLocation]       = useState(null)
  // Offline
  const [isOffline, setIsOffline]     = useState(!navigator.onLine)

  const videoRef    = useRef(null)
  const readerRef   = useRef(null)
  const fallbackTmr = useRef(null)

  const token = localStorage.getItem("token")

  // ── Offline detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => { setIsOffline(false); syncOffline() }
    const off = () => setIsOffline(true)
    window.addEventListener("online",  on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online",  on)
      window.removeEventListener("offline", off)
    }
  }, [token])

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }
    requestLocation()
    loadData()
    return () => {
      stopCamera()
      clearTimeout(fallbackTmr.current)
    }
  }, [])

  function requestLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      p => setLocation({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  async function loadData(attempt = 1) {
    const MAX_ATTEMPTS = 3
    const RETRY_DELAY  = 12000

    setStep("loading")
    setError("")
    setRetryInfo(attempt > 1 ? `Tentativa ${attempt} de ${MAX_ATTEMPTS}…` : "")

    // Sem token → redireciona para login salvando destino
    if (!token) {
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }

      // Health check primeiro para ver se API responde
      let healthOk = false
      try {
        const h = await fetch(`${API}/health`, { signal: AbortSignal.timeout(10000) })
        healthOk = h.ok
      } catch {}

      if (!healthOk && attempt === 1) {
        // API não respondeu ainda — aguarda e tenta de novo
        let countdown = 12
        setRetryInfo(`Conectando ao servidor… ${countdown}s`)
        const interval = setInterval(() => {
          countdown -= 1
          setRetryInfo(`Conectando ao servidor… ${countdown}s`)
          if (countdown <= 0) clearInterval(interval)
        }, 1000)
        await new Promise(r => setTimeout(r, RETRY_DELAY))
        clearInterval(interval)
        loadData(2)
        return
      }

      const [resC, resO, resOpen] = await Promise.all([
        fetch(`${API}/clients/${clientId}`,  { headers, signal: AbortSignal.timeout(20000) }),
        fetch(`${API}/orders`,               { headers, signal: AbortSignal.timeout(20000) }),
        fetch(`${API}/checkin/open`,         { headers, signal: AbortSignal.timeout(20000) }),
      ])

      // Token expirado
      if (resC.status === 401) {
        localStorage.removeItem("token")
        localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
        navigate("/")
        return
      }

      // Qualquer outro erro HTTP — mostra status real
      if (!resC.ok) {
        setError(`Erro ${resC.status} ao carregar cliente. Tente novamente.`)
        setRetryInfo("")
        setStep("error")
        return
      }

      const [dataC, dataO, dataOpen] = await Promise.all([
        resC.json(), resO.json(), resOpen.json()
      ])

      setClient(dataC)
      setRetryInfo("")

      const clientOrders = (Array.isArray(dataO) ? dataO : []).filter(o =>
        String(o.client_id) === String(clientId) &&
        (o.status === "open" || o.status === "in_progress")
      )
      setOrders(clientOrders)

      if (dataOpen.open) setOpenCheckin(dataOpen)

      setStep("select_os")

    } catch (err) {
      if (!navigator.onLine) {
        setStep("offline_mode")
        return
      }
      // Mostra mensagem técnica real para diagnóstico
      const msg = err?.message || String(err)
      if (attempt < MAX_ATTEMPTS) {
        let countdown = RETRY_DELAY / 1000
        setRetryInfo(`Falha (${msg}) — nova tentativa em ${countdown}s`)
        const interval = setInterval(() => {
          countdown -= 1
          setRetryInfo(`Falha — nova tentativa em ${countdown}s`)
          if (countdown <= 0) clearInterval(interval)
        }, 1000)
        await new Promise(r => setTimeout(r, RETRY_DELAY))
        clearInterval(interval)
        loadData(attempt + 1)
      } else {
        setError(`Falha ao conectar: ${msg}`)
        setRetryInfo("")
        setStep("error")
      }
    }
  }

  // ── Camera / ZXing ─────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    clearTimeout(fallbackTmr.current)
    if (readerRef.current) {
      try { readerRef.current.reset() } catch {}
      readerRef.current = null
    }
    setScannerStatus("idle")
  }, [])

  const startCamera = useCallback(async () => {
    setError("")
    setFallbackMode(null)
    setScannerStatus("starting")

    // Aguarda o elemento de vídeo estar no DOM
    await new Promise(r => setTimeout(r, 400))

    if (!videoRef.current) {
      setScannerStatus("error")
      setError("Elemento de vídeo não encontrado.")
      setFallbackMode("code")
      return
    }

    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // decodeFromConstraints é mais estável no mobile que decodeFromVideoElement
      await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, err) => {
          if (result) {
            stopCamera()
            onQRDetected(result.getText())
          }
          // Erros de frame sem QR são normais — ignorar silenciosamente
        }
      )

      setScannerStatus("active")

      // Mostra botão de fallback após 25 segundos sem leitura
      fallbackTmr.current = setTimeout(() => {
        setScannerStatus(prev => prev === "active" ? "active" : prev)
        setFallbackMode("code") // abre painel de fallback automaticamente
      }, 25000)

    } catch (e) {
      setScannerStatus("error")
      const msg = e?.name === "NotAllowedError"
        ? "Permissão de câmera negada. Use uma das opções abaixo."
        : "Câmera não disponível neste dispositivo."
      setError(msg)
      setFallbackMode("code")
    }
  }, [stopCamera])

  // Inicia/para câmera quando o step muda para "scanning"
  useEffect(() => {
    if (step === "scanning") {
      startCamera()
    } else {
      stopCamera()
    }
  }, [step])

  // ── QR detectado ──────────────────────────────────────────────────────────

  function onQRDetected(text) {
    const pattern = `/checkin/${clientId}`
    if (!text.includes(pattern)) {
      setError("QR Code incorreto. Use o adesivo deste cliente.")
      setStep("select_action")
      return
    }
    setError("")
    setStep("confirming")
  }

  // ── Fallbacks ──────────────────────────────────────────────────────────────

  // Fallback 1: código numérico (ID do cliente)
  function handleCodeConfirm() {
    const expected = String(clientId)
    if (manualCode.trim() !== expected) {
      setError(`Código incorreto. O código deste cliente é ${expected}.`)
      return
    }
    stopCamera()
    setError("")
    setFallbackMode(null)
    setStep("confirming")
  }

  // Fallback 2: PIN de 4 dígitos cadastrado no cliente
  // (PIN = últimos 4 do ID com padding: ex. cliente 32 → "0032")
  function handlePinConfirm() {
    const expectedPin = String(clientId).padStart(4, "0")
    if (pinValue.trim() !== expectedPin) {
      setError("PIN incorreto. Solicite ao ADM.")
      return
    }
    stopCamera()
    setError("")
    setFallbackMode(null)
    setStep("confirming")
  }

  // Fallback 3: confirmar sem escanear (ADM revisa depois)
  function handleManualConfirm() {
    stopCamera()
    setError("")
    setFallbackMode(null)
    setStep("confirming")
  }

  // ── Offline sync ──────────────────────────────────────────────────────────

  async function syncOffline() {
    const pending = JSON.parse(localStorage.getItem("sv_offline_checkins") || "[]")
      .filter(i => !i.synced)
    if (!pending.length || !token) return

    const updated = await Promise.all(pending.map(async item => {
      try {
        if (item.type === "start") {
          await fetch(`${API}/checkin/${item.clientId}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              order_id: item.orderId || null,
              notes:    item.notes   || null,
              lat:      item.location?.lat,
              lon:      item.location?.lon,
            }),
          })
        }
        return { ...item, synced: true }
      } catch {
        return item
      }
    }))

    const remaining = [
      ...updated.filter(i => !i.synced),
      ...(JSON.parse(localStorage.getItem("sv_offline_checkins") || "[]")
          .filter(i => i.synced)),
    ]
    localStorage.setItem("sv_offline_checkins", JSON.stringify(remaining))
  }

  // ── Confirmar check-in/out ────────────────────────────────────────────────

  async function handleConfirm() {
    setSending(true)
    setError("")

    // Modo offline
    if (isOffline) {
      const record = {
        type:       action,
        clientId,
        clientName: client?.name || "Cliente",
        orderId:    selectedOrder?.id   || null,
        orderNum:   selectedOrder?.number || null,
        timestamp:  isoNow(),
        notes,
        location,
        synced: false,
      }
      const list = JSON.parse(localStorage.getItem("sv_offline_checkins") || "[]")
      list.push(record)
      localStorage.setItem("sv_offline_checkins", JSON.stringify(list))
      setResult({ action, offline: true, timestamp: record.timestamp })
      setStep("success")
      setSending(false)
      return
    }

    try {
      let res, data

      if (action === "start") {
        res = await fetch(`${API}/checkin/${clientId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            order_id: selectedOrder?.id || null,
            lat:      location?.lat     || null,
            lon:      location?.lon     || null,
            notes:    notes             || null,
          }),
        })
      } else {
        res = await fetch(`${API}/checkin/${openCheckin.checkin_id}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lat:   location?.lat || null,
            lon:   location?.lon || null,
            notes: notes         || null,
          }),
        })
      }

      data = await res.json()

      if (!res.ok) {
        setError(data.msg || "Erro ao registrar.")
        setSending(false)
        return
      }

      setResult({ ...data, action })
      setStep("success")

    } catch {
      if (!navigator.onLine) {
        setIsOffline(true)
        // Chama novamente já no modo offline
        setSending(false)
        handleConfirm()
      } else {
        setError("Erro de conexão. Tente novamente.")
        setSending(false)
      }
    } finally {
      setSending(false)
    }
  }

  // ── Reset / novo serviço ──────────────────────────────────────────────────

  function resetFlow() {
    setResult(null)
    setNotes("")
    setSelectedOrder(null)
    setOpenCheckin(null)
    setAction(null)
    setError("")
    setFallbackMode(null)
    setManualCode("")
    setPinValue("")
    loadData()
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDERS POR STEP
  // ══════════════════════════════════════════════════════════════════════════

  // ── Loading ───────────────────────────────────────────────
  if (step === "loading") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />
      <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
        <div style={{
          width: 32, height: 32, border: "3px solid rgba(79,142,247,0.2)",
          borderTop: "3px solid #4f8ef7", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13, color: "#475569" }}>
          {retryInfo || "Carregando..."}
        </div>
        {retryInfo && (
          <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
            O servidor pode levar até 60s para iniciar
          </div>
        )}
      </div>
    </div></div>
  )

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (step === "error") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ color: "#f87171", marginBottom: 6, fontSize: 14 }}>{error}</div>
        <div style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>
          Se o problema persistir, aguarde ~50 segundos (servidor pode estar a dormir).
        </div>
        <button style={S.btnBlue} onClick={loadData}>↺ Tentar novamente</button>
      </div>
      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={S.footerLink}>svfinance.com.br</a>
      </div>
    </div></div>
  )

  // ── Offline mode (sem dados) ──────────────────────────────────────────────
  if (step === "offline_mode") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline />
      <div style={S.offlineBanner}>📵 Sem conexão — modo offline ativo</div>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
        O registro será salvo localmente e sincronizado automaticamente quando houver internet.
      </div>
      <button style={S.btnBlue} onClick={() => { setAction("start"); setStep("scanning") }}>
        📍 Registrar entrada (offline)
      </button>
      <button style={S.btnGhost} onClick={loadData}>↺ Tentar reconectar</button>
    </div></div>
  )

  // ── Selecionar OS ─────────────────────────────────────────────────────────
  if (step === "select_os") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />
      <ClientBox client={client} />
      {isOffline && <OfflineBanner show />}

      <span style={S.label}>Selecione a O.S do dia</span>

      {orders.length === 0 ? (
        <div style={{
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600 }}>⚠️ Nenhuma O.S aberta</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Peça ao ADM para criar uma O.S para este cliente.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {orders.map(o => {
            const sel = selectedOrder?.id === o.id
            return (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                style={{
                  background: sel ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.03)",
                  border: `2px solid ${sel ? "#4f8ef7" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 12, padding: "13px 15px", cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#4f8ef7", fontWeight: 700, fontSize: 14 }}>{o.number}</div>
                    <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                      {o.description || `${o.items?.length || 0} ${o.items?.length === 1 ? "item" : "itens"}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{
                      fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 700,
                      background: o.status === "in_progress" ? "rgba(245,158,11,0.15)" : "rgba(79,142,247,0.15)",
                      color: o.status === "in_progress" ? "#f59e0b" : "#4f8ef7",
                    }}>
                      {o.status === "in_progress" ? "Em andamento" : "Aberta"}
                    </span>
                    {sel && <span style={{ color: "#4f8ef7", fontSize: 15 }}>✓</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ErrBox msg={error} />

      <button
        style={{ ...S.btnBlue, opacity: (orders.length > 0 && !selectedOrder) ? 0.45 : 1 }}
        onClick={() => (orders.length === 0 || selectedOrder) && setStep("select_action")}
        disabled={orders.length > 0 && !selectedOrder}
      >
        Continuar →
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={S.footerLink}>svfinance.com.br</a>
      </div>
    </div></div>
  )

  // ── Selecionar ação ───────────────────────────────────────────────────────
  if (step === "select_action") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />
      <ClientBox client={client} />

      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-1px" }}>
          {horaAtual()}
        </div>
        <div style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{dataAtual()}</div>
        {selectedOrder && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#4f8ef7", fontWeight: 600 }}>
            O.S: {selectedOrder.number}
          </div>
        )}
      </div>

      <OfflineBanner show={isOffline} />
      <ErrBox msg={error} />

      {openCheckin ? (
        <>
          <div style={{
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center",
          }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>⏱️ Serviço em andamento</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
              Entrada: {openCheckin.checkin_at?.slice(11, 16)}
              {openCheckin.order_number && ` · ${openCheckin.order_number}`}
            </div>
          </div>
          <button style={S.btnGreen} onClick={() => { setAction("finish"); setStep("scanning") }}>
            ✅ Finalizar serviço — Escanear QR
          </button>
        </>
      ) : (
        <button style={S.btnBlue} onClick={() => { setAction("start"); setStep("scanning") }}>
          📍 Iniciar serviço — Escanear QR
        </button>
      )}

      <button style={S.btnGhost} onClick={() => setStep("select_os")}>← Voltar</button>
    </div></div>
  )

  // ── Scanner ───────────────────────────────────────────────────────────────
  if (step === "scanning") return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: "20px 16px" }}>
        <Brand offline={isOffline} />

        {/* Cabeçalho da ação */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <span style={{
            display: "inline-block", padding: "4px 16px", borderRadius: 20,
            fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase",
            background: action === "start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
            color:      action === "start" ? "#4f8ef7"               : "#22c55e",
            marginBottom: 6,
          }}>
            {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
          </span>
          <div style={{ color: "#475569", fontSize: 12 }}>
            {scannerStatus === "active"
              ? "Aponte para o QR Code fixo na vitrine"
              : scannerStatus === "starting"
              ? "Iniciando câmera..."
              : "Use uma das opções abaixo"}
          </div>
        </div>

        <ErrBox msg={error} />

        {/* Viewfinder da câmera — sempre renderiza o <video> para ZXing encontrar */}
        <div style={{
          position: "relative", borderRadius: 16, overflow: "hidden",
          marginBottom: 12, background: "#000",
          display: scannerStatus === "error" && !error ? "none" : "block",
          // Esconde se câmera deu erro mas mantém no DOM
          opacity: scannerStatus === "error" ? 0 : 1,
          height: scannerStatus === "error" ? 0 : "auto",
        }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "cover" }}
          />

          {/* Overlay com mira */}
          {scannerStatus === "active" && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                width: 200, height: 200, position: "relative",
              }}>
                {/* Cantos da mira */}
                {[
                  { top: 0, left: 0, borderTop: "3px solid #4f8ef7", borderLeft: "3px solid #4f8ef7" },
                  { top: 0, right: 0, borderTop: "3px solid #4f8ef7", borderRight: "3px solid #4f8ef7" },
                  { bottom: 0, left: 0, borderBottom: "3px solid #4f8ef7", borderLeft: "3px solid #4f8ef7" },
                  { bottom: 0, right: 0, borderBottom: "3px solid #4f8ef7", borderRight: "3px solid #4f8ef7" },
                ].map((style, i) => (
                  <div key={i} style={{
                    position: "absolute", width: 24, height: 24, ...style
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Overlay de loading */}
          {scannerStatus === "starting" && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ color: "#64748b", fontSize: 13 }}>⏳ Abrindo câmera...</div>
            </div>
          )}
        </div>

        {/* ── Painel de fallbacks ── */}
        {(scannerStatus === "error" || fallbackMode !== null) && (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: 16, marginBottom: 12,
          }}>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              Alternativas
            </div>

            {/* Tabs de fallback */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[
                { id: "code",   label: "🔢 Código" },
                { id: "pin",    label: "🔑 PIN" },
                { id: "manual", label: "⚡ Direto" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setFallbackMode(id); setError("") }}
                  style={{
                    flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700,
                    border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    background: fallbackMode === id ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.04)",
                    color:      fallbackMode === id ? "#4f8ef7"               : "#64748b",
                    transition: "all .15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Fallback 1 — Código numérico */}
            {fallbackMode === "code" && (
              <div>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>
                  Digite o <b style={{ color: "#e2e8f0" }}>código do cliente</b> (número do ID):
                </div>
                <input
                  style={S.input}
                  type="number"
                  inputMode="numeric"
                  placeholder={`Ex: ${clientId}`}
                  value={manualCode}
                  onChange={e => { setManualCode(e.target.value); setError("") }}
                  onKeyDown={e => e.key === "Enter" && handleCodeConfirm()}
                  autoFocus
                />
                <ErrBox msg={error} />
                <button style={S.btnBlue} onClick={handleCodeConfirm}>
                  Confirmar com código
                </button>
              </div>
            )}

            {/* Fallback 2 — PIN de 4 dígitos */}
            {fallbackMode === "pin" && (
              <div>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>
                  Digite o <b style={{ color: "#e2e8f0" }}>PIN de 4 dígitos</b> do cliente (fornecido pelo ADM):
                </div>
                <input
                  style={{ ...S.input, fontSize: 22, textAlign: "center", letterSpacing: "8px", fontWeight: 700 }}
                  type="number"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={pinValue}
                  onChange={e => { setPinValue(e.target.value.slice(0, 4)); setError("") }}
                  onKeyDown={e => e.key === "Enter" && handlePinConfirm()}
                  autoFocus
                />
                <ErrBox msg={error} />
                <button style={S.btnBlue} onClick={handlePinConfirm}>
                  Confirmar com PIN
                </button>
              </div>
            )}

            {/* Fallback 3 — Confirmar sem escanear */}
            {fallbackMode === "manual" && (
              <div>
                <div style={{
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 10, padding: "10px 13px", marginBottom: 12, fontSize: 12, color: "#f59e0b",
                }}>
                  ⚠️ Esta opção registra o check-in <b>sem validação de QR Code</b>. O ADM verá o registro para revisão.
                </div>
                <button style={S.btnAmber} onClick={handleManualConfirm}>
                  Confirmar sem escanear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botão para abrir fallbacks manualmente (câmera ativa mas difícil de ler) */}
        {scannerStatus === "active" && fallbackMode === null && (
          <button style={S.btnGhost} onClick={() => setFallbackMode("code")}>
            QR não leu? Usar alternativa
          </button>
        )}

        <button style={{ ...S.btnGhost, marginTop: 4 }} onClick={() => { stopCamera(); setStep("select_action") }}>
          ← Cancelar
        </button>
      </div>
    </div>
  )

  // ── Confirmação ───────────────────────────────────────────────────────────
  if (step === "confirming") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />
      <ClientBox client={client} />

      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <span style={{
          display: "inline-block", padding: "4px 16px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase",
          background: action === "start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
          color:      action === "start" ? "#4f8ef7"               : "#22c55e",
          marginBottom: 10,
        }}>
          {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
        </span>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-1px" }}>
          {horaAtual()}
        </div>
        <div style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{dataAtual()}</div>
        {selectedOrder && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#4f8ef7", fontWeight: 600 }}>
            O.S: {selectedOrder.number}
          </div>
        )}
      </div>

      {action === "finish" && openCheckin && (
        <div style={{ ...S.successBox, marginBottom: 14 }}>
          Entrada registrada às {openCheckin.checkin_at?.slice(11, 16)}
        </div>
      )}

      <OfflineBanner show={isOffline} />

      <textarea
        style={S.textarea}
        rows={2}
        placeholder={action === "start" ? "Observação de entrada (opcional)" : "Observação de saída (opcional)"}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <div style={{ fontSize: 11, color: location ? "#22c55e" : "#475569", marginBottom: 14 }}>
        {location ? "📍 Localização capturada ✓" : "📍 Sem localização GPS"}
      </div>

      <ErrBox msg={error} />

      <button
        style={{
          ...(action === "start" ? S.btnBlue : S.btnGreen),
          opacity: sending ? 0.6 : 1,
          cursor:  sending ? "not-allowed" : "pointer",
        }}
        onClick={handleConfirm}
        disabled={sending}
      >
        {sending ? "Registrando..." : action === "start" ? "✓ Confirmar entrada" : "✓ Confirmar saída"}
      </button>

      <button style={S.btnGhost} onClick={() => setStep("scanning")} disabled={sending}>
        ← Escanear novamente
      </button>
    </div></div>
  )

  // ── Sucesso ───────────────────────────────────────────────────────────────
  if (step === "success") return (
    <div style={S.page}><div style={S.card}>
      <Brand offline={isOffline} />

      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>
          {result?.action === "start" ? "📍" : "✅"}
        </div>

        <div style={{
          fontSize: "1.15rem", fontWeight: 700, marginBottom: 6,
          color: result?.action === "start" ? "#4f8ef7" : "#22c55e",
        }}>
          {result?.offline
            ? "Salvo offline!"
            : result?.action === "start"
            ? "Check-in registrado!"
            : "Serviço concluído!"}
        </div>

        {result?.offline && (
          <div style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 10, padding: 12, margin: "12px 0", fontSize: 12, color: "#f59e0b",
          }}>
            📵 Registrado offline.<br />Será sincronizado automaticamente ao reconectar.
          </div>
        )}

        {result?.action === "finish" && result?.duration_str && (
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
            borderRadius: 14, padding: "14px 20px", margin: "14px auto",
            display: "inline-block", minWidth: 140,
          }}>
            <div style={{ color: "#475569", fontSize: 11, marginBottom: 2 }}>Duração do serviço</div>
            <div style={{ color: "#22c55e", fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-1px" }}>
              {result.duration_str}
            </div>
          </div>
        )}

        <div style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>{dataAtual()} às {horaAtual()}</div>
        {client && <div style={{ color: "#e2e8f0", fontWeight: 600, marginTop: 6 }}>{client.name}</div>}
        {selectedOrder && (
          <div style={{ color: "#4f8ef7", fontSize: 12, marginTop: 4 }}>
            O.S: {selectedOrder.number}
          </div>
        )}
      </div>

      <div style={S.divider} />

      <button style={S.btnGhost} onClick={resetFlow}>
        Registrar outro serviço
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={S.footerLink}>svfinance.com.br</a>
      </div>
    </div></div>
  )

  return null
}