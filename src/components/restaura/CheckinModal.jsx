/**
 * CheckinModal.jsx
 *
 * PR1: sending resetado no finally, race condition mobile, erro fixo na tela,
 *      sem_gps separado, mounted.current garantido, PIN limpo no QR
 * PR2: onSuccess dentro do guard mounted.current (2 ocorrências)
 * PR3: step confirming_location — confirmação de local antes do check-in
 *      confirming_location só no start, setTimeout no erro do botão "local errado"
 * PR4: confirmandoRef bloqueia duplo disparo no botão "Confirmar entrada/saída"
 *      Evita que confirmar() seja chamado duas vezes causando 400 duplo no console
 *      e mensagem de erro piscando antes de fixar na tela
 * PR5: SEPARA falha de rede real de erro do servidor.
 *      ❌ ANTES: qualquer exceção (inclusive res.json() quebrando num 502 de
 *         cold start do Render) caía no catch e virava "salvo offline → sucesso",
 *         escondendo o erro real do servidor (a mensagem 400 nunca fixava na tela).
 *      ✅ AGORA: só falha de REDE (fetch rejeitado, servidor não respondeu) salva
 *         offline. Se o servidor RESPONDEU com erro (400/403/404/500), a mensagem
 *         fixa na tela e nunca é tratada como offline.
 *      Helper salvarOffline() centraliza o caminho offline (usado em 2 lugares).
 */

import { useState, useEffect, useRef } from "react";
import { enqueueCheckin, uuid, setOrderStatusOverlay } from "../../offline/offlineDB";
import QRScanner from "./QRScanner";

const API      = "https://api.svfinance.com.br/api";
const token    = () => localStorage.getItem("token");
const QR_TOKEN = "sv-checkin-universal";

export default function CheckinModal({ order, onClose, onSuccess, theme, isGlass, isMobile, initialAction }) {
  const [step,        setStep]   = useState(initialAction ? "scanning" : "select_action");
  const [action,      setAction] = useState(initialAction || null);
  const [openChk,     setOpenChk]= useState(null);
  const [location,    setLoc]    = useState(null);
  const [notes,       setNotes]  = useState("");
  const [sending,     setSending]= useState(false);
  const [error,       setError]  = useState("");
  const [result,      setResult] = useState(null);
  const [loadingOpen, setLO]     = useState(true);
  const [pinMode,     setPinMode]= useState(false);
  const [pinValue,    setPinVal] = useState("");
  const [offlineMsg,  setOffMsg] = useState("");

  const mounted       = useRef(true);
  // PR4: guard contra duplo disparo no botão confirmar
  const confirmandoRef = useRef(false);

  useEffect(() => {
    mounted.current        = true;
    confirmandoRef.current = false; // reseta ao montar/remontar — evita ref travado entre sessões
    return () => { mounted.current = false; };
  }, []);

  const now     = new Date();
  const horaFmt = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dataFmt = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Verificar check-in aberto ──────────────────────────────────────────────
  useEffect(() => {
    const localKey = `sv_chk_open_${order.id}`;

    async function checkOpen() {
      const localRaw = localStorage.getItem(localKey);
      if (localRaw) {
        try {
          const localData = JSON.parse(localRaw);
          const ageMs     = Date.now() - new Date(localData.checkin_at || 0).getTime();
          if (ageMs < 8 * 60 * 60 * 1000) {
            if (mounted.current) setOpenChk(localData);
          } else {
            localStorage.removeItem(localKey);
          }
        } catch {
          localStorage.removeItem(localKey);
        }
      }

      if (!navigator.onLine) {
        if (mounted.current) setLO(false);
        return;
      }

      try {
        const res  = await fetch(`${API}/checkin/open`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const data = await res.json();

        if (!mounted.current) return;

        if (data.open && String(data.order_id) === String(order.id)) {
          const merged = { ...data, checkin_at: data.checkin_at || new Date().toISOString() };
          setOpenChk(merged);
          localStorage.setItem(localKey, JSON.stringify(merged));
        } else if (data.open && String(data.order_id) !== String(order.id)) {
          // checkin aberto é de outra OS — não afeta esta
        } else {
          const localRaw2 = localStorage.getItem(localKey);
          if (!localRaw2) setOpenChk(null);
        }
      } catch {
        // falha de rede — mantém localStorage
      } finally {
        if (mounted.current) setLO(false);
      }
    }

    checkOpen();
    const interval = setInterval(checkOpen, 10000);
    return () => clearInterval(interval);
  }, [order.id]);

  // ── Limpa estado ao voltar para scanner ───────────────────────────────────
  function voltarParaScanner() {
    setError("");
    setPinMode(false);
    setPinVal("");
    setStep("scanning");
  }

  // ── QR detectado ──────────────────────────────────────────────────────────
  function onQRDetected(text) {
    if (loadingOpen) return;

    if (text.trim() !== QR_TOKEN) {
      setStep("select_action");
      setTimeout(() => {
        if (mounted.current) setError("❌ QR Code inválido. Use o adesivo oficial SV Finance.");
      }, 50);
      return;
    }
    setError("");
    setPinMode(false);
    setPinVal("");
    // confirming_location só no check-in (start) — check-out vai direto
    setStep(action === "start" ? "confirming_location" : "confirming");
  }

  // ── Monta body da requisição ───────────────────────────────────────────────
  function buildBody() {
    const base = {
      lat:      location?.lat || null,
      lon:      location?.lon || null,
      notes:    notes || null,
      qr_token: QR_TOKEN,
      pin:      pinMode ? pinValue : null,
      local_id: uuid(),
    };
    if (action === "start")
      return { ...base, kind: "start", client_id: order.client_id, order_id: order.id };
    return { ...base, kind: "finish", checkin_id: openChk?.checkin_id, order_id: order.id };
  }

  // ── Salvar offline (caminho único reutilizado) ─────────────────────────────
  // PR5: usado tanto no offline conhecido quanto na falha de REDE real.
  // NUNCA é chamado quando o servidor respondeu com erro — erro de servidor
  // tem que aparecer fixo na tela.
  async function salvarOffline(body, localKey, motivo) {
    try {
      await enqueueCheckin(body);
      if (action === "start") {
        await setOrderStatusOverlay(order.id, "in_progress");
        localStorage.setItem(localKey, JSON.stringify({
          open: true, order_id: order.id,
          checkin_id: body.local_id,
          checkin_at: new Date().toISOString(),
          offline: true,
        }));
      } else {
        await setOrderStatusOverlay(order.id, "done");
        localStorage.removeItem(localKey);
      }
      const r = { action, offline: true };
      if (mounted.current) {
        setResult(r);
        setStep("success");
        setOffMsg(motivo || "Sem internet — registro salvo e será sincronizado.");
        onSuccess(r);
      }
    } catch {
      if (mounted.current) setError("Não foi possível salvar offline.");
    }
  }

  // ── Confirmar check-in / check-out ────────────────────────────────────────
  async function confirmar() {
    // PR4: bloqueia duplo disparo — evita 400 duplo e mensagem piscando
    if (confirmandoRef.current) return;
    confirmandoRef.current = true;

    setSending(true);
    setError("");
    setOffMsg("");
    const body     = buildBody();
    const localKey = `sv_chk_open_${order.id}`;

    // ── Offline conhecido (sem internet) → salva direto ───────────────────────
    if (!navigator.onLine) {
      await salvarOffline(body, localKey, "Sem internet — registro salvo e será sincronizado.");
      confirmandoRef.current = false;
      if (mounted.current) setSending(false);
      return;
    }

    // ── Online → tenta o servidor ─────────────────────────────────────────────
    try {
      const endpoint = action === "start"
        ? `${API}/checkin/${order.client_id}/start`
        : `${API}/checkin/${openChk?.checkin_id}/finish`;

      // PR5: a falha de REDE (fetch rejeitado: sem resposta, DNS, timeout de
      // conexão) é capturada AQUI, só nela salvamos offline.
      let res;
      try {
        res = await fetch(endpoint, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body:    JSON.stringify(body),
        });
      } catch (netErr) {
        await salvarOffline(body, localKey, "Conexão instável — salvo offline.");
        return;
      }

      // PR5: o servidor RESPONDEU. A partir daqui NUNCA tratamos como offline.
      // Se o corpo não vier como JSON (ex.: HTML de erro do Render no cold start),
      // não quebra o fluxo nem cai em "sucesso offline" — vira erro fixo na tela.
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!mounted.current) return;

      if (!res.ok) {
        if (data.sem_coordenadas) {
          setPinMode(true);
          setError("📍 Cliente sem localização cadastrada. Digite o PIN do encarregado para confirmar sua presença.");
        } else if (data.sem_gps) {
          setError("📡 " + (data.msg || "GPS não disponível. Ative a localização e tente novamente."));
        } else {
          setError(data.msg || `Erro ${res.status} ao registrar. Tente novamente.`);
        }
        return;
      }

      // ── Sucesso real do servidor ────────────────────────────────────────────
      if (action === "start" && data.checkin_id) {
        localStorage.setItem(localKey, JSON.stringify({
          ...data, open: true, order_id: order.id,
          checkin_at: data.checkin_at || new Date().toISOString(),
        }));
      } else {
        localStorage.removeItem(localKey);
      }

      const r = { ...data, action };
      if (mounted.current) {
        setResult(r);
        setStep("success");
        onSuccess(r);
      }

    } finally {
      confirmandoRef.current = false;
      if (mounted.current) setSending(false);
    }
  }

  // ── Estilos ────────────────────────────────────────────────────────────────
  const S = {
    overlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(6px)" },
    card:     { width: "100%", maxWidth: 440, maxHeight: "92vh", overflowY: "auto", background: "#0a0f1e", border: "1px solid rgba(79,142,247,0.15)", borderRadius: 24, padding: isMobile ? "20px 16px" : 28, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" },
    osBox:    { background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, textAlign: "center" },
    osNum:    { color: "#4f8ef7", fontWeight: 700, fontSize: "1rem" },
    osClient: { color: "#475569", fontSize: 11, marginTop: 2 },
    btnBlue:  { width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 10, boxShadow: "0 4px 20px rgba(79,142,247,0.3)" },
    btnGreen: { width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 10 },
    btnRed:   { width: "100%", padding: "13px 0", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "#f87171", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 10 },
    btnGhost: { width: "100%", padding: "11px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 8 },
    errBox:   { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", padding: "12px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 },
    textarea: { width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 14, resize: "none" },
    pinInput: { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, color: "#e2e8f0", fontSize: 20, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "6px", marginBottom: 12 },
    time:     { textAlign: "center", marginBottom: 14 },
    title:    { fontWeight: 700, fontSize: "1rem", color: "#e2e8f0" },
    close:    { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 },
  };

  function ErroFixo({ msg, onTentarNovamente }) {
    return (
      <div style={S.errBox}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Atenção</div>
        <div style={{ lineHeight: 1.5 }}>{msg}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            style={{ flex: 1, padding: "7px 0", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
            onClick={() => setError("")}
          >✕ Fechar</button>
          {onTentarNovamente && (
            <button
              style={{ flex: 1, padding: "7px 0", background: "rgba(79,142,247,0.15)", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 8, color: "#4f8ef7", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
              onClick={onTentarNovamente}
            >↩ Tentar novamente</button>
          )}
        </div>
      </div>
    );
  }

  if (loadingOpen) return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>Verificando check-in...</div>
      </div>
    </div>
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={S.title}>📍 Registro de Serviço</div>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>

        {/* Info da OS */}
        <div style={S.osBox}>
          <div style={S.osNum}>{order.number}</div>
          <div style={S.osClient}>{order.client_name}</div>
        </div>

        {/* ── SELECT ACTION ──────────────────────────────────────────────── */}
        {step === "select_action" && (
          <>
            <div style={S.time}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-1px" }}>{horaFmt}</div>
              <div style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{dataFmt}</div>
            </div>

            {!navigator.onLine && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12, textAlign: "center" }}>
                📴 Offline — registro será sincronizado depois.
              </div>
            )}

            {error && <ErroFixo msg={error} />}

            {openChk ? (
              <>
                <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>⏱️ Serviço em andamento</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Entrada às {openChk.checkin_at?.slice(11, 16)}</div>
                </div>
                <button style={S.btnGreen} onClick={() => { setAction("finish"); setStep("scanning"); }}>
                  ✅ Finalizar serviço — Escanear QR
                </button>
              </>
            ) : (
              <button style={S.btnBlue} onClick={() => { setAction("start"); setStep("scanning"); }}>
                📍 Iniciar serviço — Escanear QR
              </button>
            )}

            <button style={S.btnGhost} onClick={onClose}>← Fechar</button>
          </>
        )}

        {/* ── SCANNING ───────────────────────────────────────────────────── */}
        {step === "scanning" && (
          <QRScanner
            action={action}
            clientCode={order.client_id}
            onDetected={onQRDetected}
            onCancel={() => setStep("select_action")}
          />
        )}

        {/* ── CONFIRMING LOCATION ────────────────────────────────────────── */}
        {step === "confirming_location" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#e2e8f0", marginBottom: 6 }}>
                Você está no local correto?
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                Confirme que está no local do cliente antes de registrar.
              </div>
            </div>

            <div style={{ background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#e2e8f0", marginBottom: 6 }}>
                🏪 {order.client_name}
              </div>
              {order.client_address && (
                <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span>📍</span>
                  <span>{order.client_address}</span>
                </div>
              )}
              <div style={{
                marginTop: 10, fontSize: 12, padding: "6px 10px", borderRadius: 8,
                background: location ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${location ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                color: location ? "#4ade80" : "#f59e0b",
              }}>
                {location ? "📡 GPS do seu celular capturado" : "⏳ Aguardando GPS..."}
              </div>
            </div>

            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
              ⚠️ Ao confirmar, sua localização GPS é registrada. Confirmações incorretas ficam gravadas para auditoria.
            </div>

            <button style={S.btnGreen} onClick={() => setStep("confirming")}>
              ✓ Sim, estou no local de {order.client_name}
            </button>

            <button
              style={S.btnRed}
              onClick={() => {
                setStep("select_action");
                setTimeout(() => {
                  if (mounted.current)
                    setError("❌ Check-in cancelado. Vá até o local correto antes de registrar.");
                }, 50);
              }}
            >
              ✗ Não, estou no local errado
            </button>

            <button style={S.btnGhost} onClick={() => setStep("scanning")}>
              ← Escanear novamente
            </button>
          </>
        )}

        {/* ── CONFIRMING ─────────────────────────────────────────────────── */}
        {step === "confirming" && (
          <>
            <div style={S.time}>
              <span style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 20,
                fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8,
                background: action === "start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
                color:      action === "start" ? "#4f8ef7"               : "#22c55e",
              }}>
                {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
              </span>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-1px" }}>{horaFmt}</div>
              <div style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{dataFmt}</div>
            </div>

            {action === "finish" && openChk && (
              <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#4ade80", textAlign: "center" }}>
                Entrada às {openChk.checkin_at?.slice(11, 16)}
              </div>
            )}

            <textarea
              style={S.textarea} rows={2}
              placeholder={action === "start" ? "Observação de entrada (opcional)" : "Observação de saída (opcional)"}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            {pinMode && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>
                  🔑 PIN do encarregado (6 dígitos) ou PIN do cliente (4 dígitos)
                </div>
                <input
                  style={S.pinInput}
                  type="number" inputMode="numeric" placeholder="——"
                  value={pinValue}
                  onChange={e => setPinVal(e.target.value.slice(0, 6))}
                  autoFocus
                />
              </div>
            )}

            {order.client_address && (
              <div style={{ fontSize: 12, marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                📍 {order.client_address}
              </div>
            )}

            <div style={{
              fontSize: 12, marginBottom: 14, padding: "8px 12px", borderRadius: 8,
              background: location ? "rgba(34,197,94,0.08)"  : "rgba(245,158,11,0.08)",
              border:     `1px solid ${location ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
              color:      location ? "#4ade80" : "#f59e0b",
            }}>
              {location ? "📡 GPS ativo — localização capturada" : "⏳ Aguardando GPS..."}
            </div>

            {error && (
              <ErroFixo
                msg={error}
                onTentarNovamente={!pinMode ? voltarParaScanner : null}
              />
            )}

            <button
              style={{
                ...(action === "start" ? S.btnBlue : S.btnGreen),
                opacity: (sending || !location || (pinMode && pinValue.length < 4)) ? 0.6 : 1,
                cursor:  (sending || !location || (pinMode && pinValue.length < 4)) ? "not-allowed" : "pointer",
              }}
              onClick={confirmar}
              disabled={sending || !location || (pinMode && pinValue.length < 4)}
            >
              {sending
                ? "Registrando..."
                : !location
                  ? "Aguardando GPS..."
                  : pinMode
                    ? "✓ Validar PIN e confirmar"
                    : action === "start"
                      ? "✓ Confirmar entrada"
                      : "✓ Confirmar saída"}
            </button>

            {!pinMode && !error && (
              <button style={S.btnGhost} onClick={voltarParaScanner} disabled={sending}>
                ← Escanear novamente
              </button>
            )}
          </>
        )}

        {/* ── SUCCESS ────────────────────────────────────────────────────── */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>
              {result?.offline ? "⏳" : result?.action === "start" ? "📍" : "✅"}
            </div>
            <div style={{
              fontSize: "1.1rem", fontWeight: 700, marginBottom: 6,
              color: result?.offline ? "#f59e0b" : result?.action === "start" ? "#4f8ef7" : "#22c55e",
            }}>
              {result?.offline
                ? "Registro salvo!"
                : result?.action === "start" ? "Check-in registrado!" : "Serviço concluído!"}
            </div>

            {offlineMsg && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", margin: "12px auto", fontSize: 12, color: "#f59e0b" }}>
                {offlineMsg}
              </div>
            )}

            {!result?.offline && result?.action === "finish" && result?.duration_str && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 14, padding: "14px 20px", margin: "14px auto", display: "inline-block" }}>
                <div style={{ color: "#475569", fontSize: 11, marginBottom: 2 }}>Duração do serviço</div>
                <div style={{ color: "#22c55e", fontSize: "1.7rem", fontWeight: 800 }}>{result.duration_str}</div>
              </div>
            )}

            <div style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>{dataFmt} às {horaFmt}</div>
            <button style={{ ...S.btnGhost, marginTop: 20 }} onClick={onClose}>Fechar</button>
          </div>
        )}

      </div>
    </div>
  );
}