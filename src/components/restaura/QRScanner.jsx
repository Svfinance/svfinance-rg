/**
 * QRScanner.jsx
 * Extraído de Orders.jsx — componente isolado de leitura de QR Code.
 *
 * Modos disponíveis:
 *   - camera   → leitura via câmera (BrowserMultiFormatReader)
 *   - numeric  → digitar código do cliente
 *   - pin      → digitar PIN permanente (4 dígitos) ou temporário (6 dígitos)
 *   - confirm  → confirmar sem validação (emergência)
 *
 * Props:
 *   onDetected(text)  → chamado quando QR/código/PIN é validado com sucesso
 *   onCancel()        → chamado ao cancelar
 *   action            → "start" | "finish" (controla badge de topo)
 *   clientCode        → client_id da OS (usado na validação de código numérico e PIN)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

const API       = "https://api.svfinance.com.br/api";
const token     = () => localStorage.getItem("token");
const QR_TOKEN  = "sv-checkin-universal";

export default function QRScanner({ onDetected, onCancel, action, clientCode }) {
  const videoRef   = useRef(null);
  const readerRef  = useRef(null);
  const tmrRef     = useRef(null);
  const cleanupRef = useRef(false);

  const [mode,    setCamMode] = useState("camera");
  const [camErr,  setCamErr]  = useState("");
  const [camReady,setCamRdy]  = useState(false);
  const [numInput,setNum]     = useState("");
  const [numErr,  setNumErr]  = useState("");
  const [pin,     setPin]     = useState("");
  const [pinErr,  setPinErr]  = useState("");

  // PR7: garante que cleanupRef seja true quando o componente desmonta totalmente,
  // cobrindo qualquer janela em que useEffect([mode]) ainda não tenha rodado cleanup.
  useEffect(() => {
    return () => { cleanupRef.current = true; };
  }, []);

  // ── Para câmera ──────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    clearTimeout(tmrRef.current);
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('[QR-DEBUG] useEffect mode disparado. mode:', mode, 'cleanupRef antes do reset:', cleanupRef.current);
    // PR7: reseta no início de cada ciclo de modo — cobre o caso câmera→outro→câmera
    // sem desmontar o componente, onde o cleanup anterior teria deixado a ref em true.
    cleanupRef.current = false;
    console.log('[QR-DEBUG] cleanupRef resetado para false');

    if (mode !== "camera") return;
    let mounted = true;
    setCamRdy(false);
    setCamErr("");

    async function start() {
      await new Promise(r => setTimeout(r, 400));
      if (!mounted || !videoRef.current) { setCamErr("Câmera não encontrada."); return; }
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            console.log('[QR-DEBUG] callback decode disparado. cleanupRef:', cleanupRef.current);
            if (cleanupRef.current) return; // PR7: descarta detecções pós-desmontagem
            if (result) { stopCamera(); onDetected(result.getText()); }
          }
        );
        if (mounted) setCamRdy(true);
        tmrRef.current = setTimeout(() => {
          if (mounted && mode === "camera")
            setCamErr("Não foi possível ler o QR. Tente outro método.");
        }, 25000);
      } catch (e) {
        if (mounted)
          setCamErr(
            e?.name === "NotAllowedError"
              ? "Permissão negada. Use outro método."
              : "Câmera indisponível. Use outro método."
          );
      }
    }

    start();
    return () => { mounted = false; cleanupRef.current = true; stopCamera(); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Troca de modo: limpa estado anterior ────────────────────────────────────
  function goMode(m) {
    stopCamera();
    setNum("");
    setNumErr("");
    setPin("");
    setPinErr("");
    setCamMode(m);
  }

  // ── Validação: código numérico ───────────────────────────────────────────────
  function submitNum() {
    const v = numInput.trim();
    if (!v) { setNumErr("Digite o código."); return; }
    if (String(v) === String(clientCode)) onDetected(QR_TOKEN);
    else setNumErr("Código incorreto.");
  }

  // ── Validação: PIN (permanente 4 dígitos ou temporário 6 dígitos) ────────────
  async function submitPin() {
    const v = pin;
    if (v.length < 4) { setPinErr("Digite o PIN completo."); return; }
    try {
      const res = await fetch(`${API}/checkin/pin/validate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ client_id: clientCode, pin: v }),
      });
      const data = await res.json();
      if (data.ok) { stopCamera(); onDetected(QR_TOKEN); }
      else setPinErr(data.msg || "PIN inválido.");
    } catch {
      setPinErr("Erro de conexão. Tente outro método.");
    }
  }

  // ── Estilos internos (dark) ──────────────────────────────────────────────────
  const S = {
    wrap:   { background: "#0a0f1e", borderRadius: 20, padding: "20px 16px", textAlign: "center" },
    badge:  {
      display: "inline-block", padding: "4px 14px", borderRadius: 20,
      fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase",
      marginBottom: 10,
      background: action === "start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
      color:      action === "start" ? "#4f8ef7"               : "#22c55e",
    },
    sub:    { fontSize: 12, color: "#475569", marginBottom: 12 },
    video:  { width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 12, display: "block", background: "#000" },
    btnG:   { width: "100%", padding: "11px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginTop: 8 },
    btnY:   { width: "100%", padding: "11px 0", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, color: "#f59e0b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginTop: 8 },
    btnGrn: { width: "100%", padding: "12px 0", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginTop: 10 },
    err:    { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", padding: "8px 12px", borderRadius: 8, fontSize: 12, margin: "8px 0" },
    inp:    { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e2e8f0", fontSize: 18, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "4px" },
    divider:{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" },
    divLine:{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" },
    divTxt: { fontSize: 11, color: "#334155", fontWeight: 600 },
    tabs:   { display: "flex", gap: 6, marginBottom: 16, justifyContent: "center", flexWrap: "wrap" },
    tab:    (active) => ({
      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", border: "1px solid", transition: "all 0.2s",
      background:   active ? "rgba(79,142,247,0.15)" : "transparent",
      color:        active ? "#4f8ef7"               : "#475569",
      borderColor:  active ? "rgba(79,142,247,0.4)"  : "rgba(255,255,255,0.08)",
    }),
  };

  const tabs = [
    { id: "camera",  label: "📷 Câmera"    },
    { id: "numeric", label: "🔢 Código"    },
    { id: "pin",     label: "🔑 PIN"       },
    { id: "confirm", label: "✓ Confirmar" },
  ];

  return (
    <div style={S.wrap}>
      {/* Badge de ação */}
      <div style={S.badge}>
        {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
      </div>

      {/* Abas de modo */}
      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={S.tab(mode === t.id)} onClick={() => goMode(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CÂMERA ─────────────────────────────────────────────────────────── */}
      {mode === "camera" && (
        <>
          <div style={S.sub}>Aponte para o adesivo QR Code SV Finance</div>
          {camErr && <div style={S.err}>{camErr}</div>}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <video
              ref={videoRef} muted playsInline
              style={{ ...S.video, opacity: camReady ? 1 : 0.4 }}
            />
            {/* Mira de leitura */}
            {camReady && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 170, height: 170, position: "relative" }}>
                  {[
                    { top: 0,    left: 0,    borderTop:    "3px solid #4f8ef7", borderLeft:   "3px solid #4f8ef7" },
                    { top: 0,    right: 0,   borderTop:    "3px solid #4f8ef7", borderRight:  "3px solid #4f8ef7" },
                    { bottom: 0, left: 0,    borderBottom: "3px solid #4f8ef7", borderLeft:   "3px solid #4f8ef7" },
                    { bottom: 0, right: 0,   borderBottom: "3px solid #4f8ef7", borderRight:  "3px solid #4f8ef7" },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {!camReady && !camErr && (
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 8 }}>Iniciando câmera...</div>
          )}
        </>
      )}

      {/* ── CÓDIGO NUMÉRICO ────────────────────────────────────────────────── */}
      {mode === "numeric" && (
        <>
          <div style={S.sub}>Digite o código do cliente</div>
          <input
            style={S.inp}
            type="number" inputMode="numeric" placeholder="000000"
            value={numInput}
            onChange={e => { setNum(e.target.value); setNumErr(""); }}
            onKeyDown={e => e.key === "Enter" && submitNum()}
            autoFocus
          />
          {numErr && <div style={S.err}>{numErr}</div>}
          <button style={S.btnGrn} onClick={submitNum}>Validar código</button>
        </>
      )}

      {/* ── PIN (permanente 4 dígitos ou temporário 6 dígitos) ─────────────── */}
      {mode === "pin" && (
        <>
          <div style={S.sub}>4 dígitos (permanente) · 6 dígitos (temporário)</div>
          <input
            style={{ ...S.inp, letterSpacing: "8px", fontSize: 22 }}
            type="password" inputMode="numeric" maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinErr(""); }}
            autoFocus
          />
          {pinErr && <div style={S.err}>{pinErr}</div>}
          <button style={S.btnGrn} onClick={submitPin} disabled={pin.length < 4}>
            Validar PIN
          </button>
        </>
      )}

      {/* ── CONFIRMAR SEM VALIDAÇÃO (emergência) ───────────────────────────── */}
      {mode === "confirm" && (
        <>
          <div style={{ padding: "20px 0 12px" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <div style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              Confirmar sem validação
            </div>
            <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.6 }}>
              Use apenas se câmera, código e PIN falharem.<br />
              O GPS continuará registrando.
            </div>
          </div>
          <button style={S.btnY} onClick={() => { stopCamera(); onDetected(QR_TOKEN); }}>
            ⚡ Confirmar mesmo assim
          </button>
        </>
      )}

      {/* Divisor e cancelar */}
      <div style={S.divider}>
        <div style={S.divLine} />
        <div style={S.divTxt}>ou</div>
        <div style={S.divLine} />
      </div>
      <button style={S.btnG} onClick={() => { stopCamera(); onCancel(); }}>
        ← Cancelar
      </button>
    </div>
  );
}