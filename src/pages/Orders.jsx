import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { enqueueCheckin, uuid, setOrderStatusOverlay, getOrderOverlays } from "../offline/offlineDB";
import { syncNow } from "../offline/syncEngine";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");
const QR_TOKEN = "sv-checkin-universal";

// ── ISOLAMENTO RESTAURA GLASS ───────────────────────────────────────────
const RESTAURA_GLASS_COMPANY_ID = "17";
function isRestauraGlass() {
  const companyId = String(localStorage.getItem("company_id") || "");
  return companyId === RESTAURA_GLASS_COMPANY_ID;
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

const STATUS_MAP = {
  open:        { label: "Aberta",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  in_progress: { label: "Em andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  done:        { label: "Concluída",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  cancelled:   { label: "Cancelada",    color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const EMPTY_FORM = {
  client_id: "", status: "open", notes: "", payment_terms: "", discount: 0,
};

// ── COMPONENTE: CARTÃO RESTAURA GLASS ──────────────────────────────────
function RestauraGlassCard({ order, items, theme, isMobile }) {
  const [card, setCard] = useState({
    frequencia: "semanal",
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    dias_semana: "ter",
    obs_contrato: "",
    semanas: [
      { numero: 1, hora: "", realizado: false },
      { numero: 2, hora: "", realizado: false },
      { numero: 3, hora: "", realizado: false },
      { numero: 4, hora: "", realizado: false },
      { numero: 5, hora: "", realizado: false },
    ],
  });
  const [ocorrencias, setOcorrencias] = useState([]);
  const [showCalendario, setShowCalendario] = useState(false);
  const [novaDataRemarcacao, setNovaDataRemarcacao] = useState("");
  const [novaHoraRemarcacao, setNovaHoraRemarcacao] = useState("");

  const corRG = "#1a8a3c"; // Verde Restaura Glass
  const corTexto = "#333";

  // Carregar cartão do localStorage (fallback de backend)
  useEffect(() => {
    async function carregar() {
      const chave = `sv_rg_card_${order.id}`;
      const chaveOcc = `sv_rg_occ_${order.id}`;

      // Tentar backend
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API}/limpeza/card/${order.id}`, {
            headers: { Authorization: `Bearer ${token()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCard(data.card || card);
            setOcorrencias(data.ocorrencias || []);
            return;
          }
        } catch {}
      }

      // Fallback localStorage
      const saved = localStorage.getItem(chave);
      const savedOcc = localStorage.getItem(chaveOcc);
      if (saved) setCard(JSON.parse(saved));
      if (savedOcc) setOcorrencias(JSON.parse(savedOcc));
    }
    carregar();
  }, [order.id]);

  // Salvar cartão (backend + localStorage)
  async function salvarCartao() {
    const chave = `sv_rg_card_${order.id}`;
    localStorage.setItem(chave, JSON.stringify(card));

    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/card/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ card }),
        });
      } catch {}
    }
    alert("Cartão salvo!");
  }

  // Registrar ocorrência
  async function registrarOcorrencia(tipo, descricao = "") {
    const novaOcc = {
      id: uuid(),
      tipo, // "fechou" | "remarcou" | "nao_compareceu" | "mudou_ponto"
      data: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      descricao,
      reagendamento_data: tipo === "remarcou" ? novaDataRemarcacao : null,
      reagendamento_hora: tipo === "remarcou" ? novaHoraRemarcacao : null,
    };

    const novasOcc = [...ocorrencias, novaOcc];
    setOcorrencias(novasOcc);
    localStorage.setItem(`sv_rg_occ_${order.id}`, JSON.stringify(novasOcc));

    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/occurrence`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ order_id: order.id, ...novaOcc }),
        });
      } catch {}
    }

    setShowCalendario(false);
    setNovaDataRemarcacao("");
    setNovaHoraRemarcacao("");
    alert(`Ocorrência registrada: ${tipo}`);
  }

  const atualizarSemana = (idx, campo, valor) => {
    const novasSemanas = [...card.semanas];
    novasSemanas[idx] = { ...novasSemanas[idx], [campo]: valor };
    setCard({ ...card, semanas: novasSemanas });
  };

  // Estilos do cartão (branco + verde Restaura Glass)
  const estiloCartao = {
    background: "#f9f9f9",
    border: `2px solid ${corRG}`,
    borderRadius: 12,
    padding: isMobile ? 16 : 24,
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    color: corTexto,
  };

  const estiloTitulo = {
    color: corRG,
    fontSize: isMobile ? "1rem" : "1.2rem",
    fontWeight: 700,
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const estiloInput = {
    padding: 8,
    border: `1px solid ${corRG}`,
    borderRadius: 6,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 8,
  };

  const estiloBotao = {
    padding: "10px 16px",
    marginBottom: 8,
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.9rem",
  };

  const estiloBotaoVerde = {
    ...estiloBotao,
    background: corRG,
    color: "#fff",
  };

  const estiloBotaoBranco = {
    ...estiloBotao,
    background: "#fff",
    border: `2px solid ${corRG}`,
    color: corRG,
  };

  const estiloBotaoOcorrencia = (tipo) => ({
    ...estiloBotao,
    background: tipo === "fechou" ? "#ef4444" : tipo === "remarcou" ? "#3b82f6" : tipo === "nao_compareceu" ? "#f59e0b" : "#6b7280",
    color: "#fff",
    width: "100%",
    marginBottom: 8,
  });

  return (
    <div style={estiloCartao}>
      {/* CABEÇALHO COM LOGO/MARCA */}
      <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${corRG}` }}>
        <div style={{ fontSize: isMobile ? "1.4rem" : "1.8rem", fontWeight: 700, color: corRG, marginBottom: 4 }}>
          🪟 RESTAURA GLASS
        </div>
        <div style={{ fontSize: "0.8rem", color: "#666", letterSpacing: "0.08em" }}>
          ESPECIALISTA EM LIMPEZA DE VIDROS
        </div>
      </div>

      {/* FREQUÊNCIA */}
      <div style={{ marginBottom: 16 }}>
        <label style={estiloTitulo}>Frequência</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {["mensal", "quinzenal", "semanal", "esporadico"].map(freq => (
            <label key={freq} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="frequencia" value={freq} checked={card.frequencia === freq}
                onChange={e => setCard({ ...card, frequencia: e.target.value })} style={{ cursor: "pointer" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {freq === "mensal" ? "Mensal" : freq === "quinzenal" ? "Quinzenal" : freq === "semanal" ? "Semanal" : "Esporádico"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* MÊS / ANO / CLIENTE / OBS */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: corRG }}>OBS / Nº Contrato</label>
          <input style={estiloInput} type="text" value={card.obs_contrato}
            onChange={e => setCard({ ...card, obs_contrato: e.target.value })} placeholder="Ex: 125/126" />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: corRG }}>Mês</label>
          <input style={estiloInput} type="number" min="1" max="12" value={card.mes}
            onChange={e => setCard({ ...card, mes: parseInt(e.target.value) })} />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: corRG }}>Ano</label>
          <input style={estiloInput} type="number" value={card.ano}
            onChange={e => setCard({ ...card, ano: parseInt(e.target.value) })} />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: corRG }}>Cliente</label>
          <div style={{ ...estiloInput, padding: 8, marginBottom: 0, background: "#f0f0f0", cursor: "default", display: "flex", alignItems: "center" }}>
            {order.client_name}
          </div>
        </div>
      </div>

      {/* DIAS DA SEMANA */}
      <div style={{ marginBottom: 16 }}>
        <label style={estiloTitulo}>Dia Fixo da Semana</label>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 8 }}>
          {["seg", "ter", "qua", "qui", "sex", "sab"].map(dia => {
            const labels = { seg: "SEG", ter: "TER", qua: "QUA", qui: "QUI", sex: "SEX", sab: "SAB" };
            return (
              <label key={dia} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" name="dias_semana" value={dia} checked={card.dias_semana === dia}
                  onChange={e => setCard({ ...card, dias_semana: e.target.value })} style={{ cursor: "pointer" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{labels[dia]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 5 SEMANAS */}
      <div style={{ marginBottom: 16, paddingTop: 16, borderTop: `1px solid ${corRG}` }}>
        <label style={estiloTitulo}>Execução por Semana</label>
        {card.semanas.map((semana, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${corRG}aa` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: corRG, marginBottom: 4 }}>{semana.numero}ª semana</div>
              <input style={{ ...estiloInput, marginBottom: 0 }} type="time" value={semana.hora}
                onChange={e => atualizarSemana(idx, "hora", e.target.value)} placeholder="HH:MM" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
              <input type="checkbox" checked={semana.realizado}
                onChange={e => atualizarSemana(idx, "realizado", e.target.checked)} style={{ width: 20, height: 20, cursor: "pointer" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#666" }}>Realizado</span>
            </div>
          </div>
        ))}
      </div>

      {/* SERVIÇOS (SEM VALOR) */}
      {items && items.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: `${corRG}11`, borderRadius: 6 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: corRG, marginBottom: 6 }}>SERVIÇO(S)</div>
          {items.map((item, i) => (
            <div key={i} style={{ fontSize: "0.85rem", color: corTexto, marginBottom: 4 }}>
              • {item.name || `Serviço ${i + 1}`}
            </div>
          ))}
        </div>
      )}

      {/* BOTÕES PRINCIPAIS */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <button style={estiloBotaoVerde} onClick={salvarCartao}>
          💾 Salvar Cartão
        </button>
        <button style={estiloBotaoBranco} onClick={() => window.print()}>
          🖨️ Imprimir Relatório
        </button>
      </div>

      {/* OCORRÊNCIAS - 4 BOTÕES */}
      <div style={{ paddingTop: 16, borderTop: `2px solid ${corRG}`, marginBottom: 16 }}>
        <div style={{ ...estiloTitulo, marginBottom: 12, color: "#ef4444" }}>⚠️ Desfecho da Visita</div>

        <button style={estiloBotaoOcorrencia("fechou")} onClick={() => registrarOcorrencia("fechou")}>
          🔒 Loja/Escritório Fechado
        </button>

        <button style={estiloBotaoOcorrencia("remarcou")} onClick={() => setShowCalendario(!showCalendario)}>
          📅 Cliente Remarcou
        </button>

        {showCalendario && (
          <div style={{ background: "#f0f8ff", padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>Nova data:</label>
            <input style={estiloInput} type="date" value={novaDataRemarcacao}
              onChange={e => setNovaDataRemarcacao(e.target.value)} />
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>Nova hora:</label>
            <input style={estiloInput} type="time" value={novaHoraRemarcacao}
              onChange={e => setNovaHoraRemarcacao(e.target.value)} />
            <button style={{ ...estiloBotaoVerde, width: "100%" }} onClick={() => registrarOcorrencia("remarcou", "Cliente marcou nova data")}>
              ✓ Confirmar Remarcação
            </button>
          </div>
        )}

        <button style={estiloBotaoOcorrencia("nao_compareceu")} onClick={() => registrarOcorrencia("nao_compareceu")}>
          ❌ Cliente Não Compareceu
        </button>

        <button style={estiloBotaoOcorrencia("mudou_ponto")} onClick={() => registrarOcorrencia("mudou_ponto")}>
          📍 Loja Mudou de Ponto
        </button>
      </div>

      {/* HISTÓRICO DE OCORRÊNCIAS */}
      {ocorrencias.length > 0 && (
        <div style={{ paddingTop: 16, borderTop: `1px solid ${corRG}` }}>
          <div style={estiloTitulo}>📝 Histórico de Ocorrências</div>
          {ocorrencias.map((occ, i) => {
            const tipos = {
              fechou: "🔒 Fechado",
              remarcou: "📅 Remarcado",
              nao_compareceu: "❌ Não compareceu",
              mudou_ponto: "📍 Mudou ponto",
            };
            return (
              <div key={i} style={{ fontSize: "0.8rem", marginBottom: 8, padding: 8, background: "#f5f5f5", borderRadius: 6 }}>
                <strong style={{ color: corRG }}>{tipos[occ.tipo] || occ.tipo}</strong>
                <div style={{ color: "#666", marginTop: 2 }}>
                  {occ.data} às {occ.hora}
                  {occ.reagendamento_data && ` → Remarcado para ${occ.reagendamento_data} às ${occ.reagendamento_hora}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RODAPÉ COM CONTATOS */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${corRG}`, fontSize: "0.75rem", color: "#666", textAlign: "center", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: corRG, marginBottom: 6 }}>📞 Comercial - Residencial</div>
        <div>📱 <strong>Rafael</strong> (Orçamentos): <a href="tel:+5544998514234" style={{ color: corRG, textDecoration: "none" }}>44 99851-4234</a></div>
        <div>📱 <strong>Aline</strong> (Administrativo): <a href="tel:+5544999049964" style={{ color: corRG, textDecoration: "none" }}>44 99904-9964</a></div>
        <div style={{ marginTop: 6 }}>
          📸 @oficialrestauraglass &nbsp; | &nbsp; 🌐 <a href="https://www.restauraglass.com.br" style={{ color: corRG, textDecoration: "none" }}>www.restauraglass.com.br</a>
        </div>
      </div>
    </div>
  );
}

// ── Scanner com 3 fallbacks ──────────────────────────────────────────────────
function QRScanner({ onDetected, onCancel, action, clientCode }) {
  const videoRef  = useRef(null);
  const readerRef = useRef(null);
  const tmrRef    = useRef(null);

  const [mode,       setMode]    = useState("camera");
  const [camErr,     setCamErr]  = useState("");
  const [camReady,   setCamReady]= useState(false);
  const [numInput,   setNumInput]= useState("");
  const [numErr,     setNumErr]  = useState("");
  const [pin,        setPin]     = useState(["", "", "", ""]);
  const [pinErr,     setPinErr]  = useState("");
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const stopCamera = useCallback(() => {
    clearTimeout(tmrRef.current);
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode !== "camera") return;
    let mounted = true;
    setCamReady(false);
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
          (result) => { if (result) { stopCamera(); onDetected(result.getText()); } }
        );
        if (mounted) setCamReady(true);
        tmrRef.current = setTimeout(() => {
          if (mounted && mode === "camera") setCamErr("Não foi possível ler o QR Code. Tente outro método abaixo.");
        }, 25000);
      } catch (e) {
        if (mounted) {
          setCamErr(e?.name === "NotAllowedError"
            ? "Permissão de câmera negada. Use outro método abaixo."
            : "Câmera indisponível. Use outro método abaixo.");
        }
      }
    }
    start();
    return () => { mounted = false; stopCamera(); };
  }, [mode]);

  function goMode(m) {
    stopCamera();
    setNumInput(""); setNumErr("");
    setPin(["","","",""]); setPinErr("");
    setMode(m);
  }

  function submitNumeric() {
    const val = numInput.trim();
    if (!val) { setNumErr("Digite o código do cliente."); return; }
    if (String(val) === String(clientCode)) onDetected(QR_TOKEN);
    else setNumErr("Código incorreto. Verifique com seu supervisor.");
  }

  function submitPin() {
    const val = pin.join("");
    if (val.length < 4) { setPinErr("Digite os 4 dígitos."); return; }
    if (String(val) === String(clientCode).slice(-4).padStart(4, "0")) onDetected(QR_TOKEN);
    else setPinErr("PIN incorreto. Verifique com seu supervisor.");
  }

  function handlePinDigit(idx, v) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[idx] = d;
    setPin(next);
    setPinErr("");
    if (d && idx < 3) pinRefs[idx + 1].current?.focus();
  }
  function handlePinKey(idx, e) {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) pinRefs[idx - 1].current?.focus();
  }

  const S = {
    wrap:    { background: "#0a0f1e", borderRadius: 20, padding: "20px 16px", textAlign: "center" },
    badge:   { display:"inline-block", padding:"4px 14px", borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:10,
               background: action==="start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
               color:      action==="start" ? "#4f8ef7"               : "#22c55e" },
    sub:     { fontSize:12, color:"#475569", marginBottom:12 },
    video:   { width:"100%", maxHeight:240, objectFit:"cover", borderRadius:12, display:"block", background:"#000" },
    btnG:    { width:"100%", padding:"11px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#64748b", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13, marginTop:8 },
    btnY:    { width:"100%", padding:"11px 0", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:10, color:"#f59e0b", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13, marginTop:8 },
    btnGrn:  { width:"100%", padding:"12px 0", background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14, marginTop:10 },
    err:     { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", padding:"8px 12px", borderRadius:8, fontSize:12, margin:"8px 0" },
    input:   { width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, color:"#e2e8f0", fontSize:18, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"center", letterSpacing:"4px" },
    divider: { display:"flex", alignItems:"center", gap:8, margin:"16px 0" },
    divLine: { flex:1, height:1, background:"rgba(255,255,255,0.06)" },
    divTxt:  { fontSize:11, color:"#334155", fontWeight:600 },
    pinRow:  { display:"flex", gap:10, justifyContent:"center", margin:"16px 0" },
    pinBox:  { width:52, height:60, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, color:"#e2e8f0", fontSize:24, fontWeight:700, textAlign:"center", outline:"none", fontFamily:"inherit" },
    tabs:    { display:"flex", gap:6, marginBottom:16, justifyContent:"center", flexWrap:"wrap" },
    tab:     (active) => ({ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:"1px solid", transition:"all 0.2s",
               background: active ? "rgba(79,142,247,0.15)" : "transparent",
               color:      active ? "#4f8ef7" : "#475569",
               borderColor: active ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.08)" }),
  };

  const tabs = [
    { id:"camera",  label:"📷 Câmera" },
    { id:"numeric", label:"🔢 Código" },
    { id:"pin",     label:"🔑 PIN" },
    { id:"confirm", label:"✓ Confirmar" },
  ];

  return (
    <div style={S.wrap}>
      <div style={S.badge}>{action==="start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}</div>

      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={S.tab(mode===t.id)} onClick={() => goMode(t.id)}>{t.label}</button>
        ))}
      </div>

      {mode === "camera" && (
        <>
          <div style={S.sub}>Aponte para o adesivo QR Code SV Finance</div>
          {camErr && <div style={S.err}>{camErr}</div>}
          <div style={{ position:"relative", marginBottom:8 }}>
            <video ref={videoRef} muted playsInline style={{ ...S.video, opacity: camReady ? 1 : 0.4 }} />
            {camReady && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ width:170, height:170, position:"relative" }}>
                  {[
                    {top:0,left:0,borderTop:"3px solid #4f8ef7",borderLeft:"3px solid #4f8ef7"},
                    {top:0,right:0,borderTop:"3px solid #4f8ef7",borderRight:"3px solid #4f8ef7"},
                    {bottom:0,left:0,borderBottom:"3px solid #4f8ef7",borderLeft:"3px solid #4f8ef7"},
                    {bottom:0,right:0,borderBottom:"3px solid #4f8ef7",borderRight:"3px solid #4f8ef7"},
                  ].map((s,i) => <div key={i} style={{ position:"absolute", width:20, height:20, ...s }} />)}
                </div>
              </div>
            )}
          </div>
          {!camReady && !camErr && <div style={{ color:"#475569", fontSize:12, marginBottom:8 }}>Iniciando câmera...</div>}
        </>
      )}

      {mode === "numeric" && (
        <>
          <div style={S.sub}>Digite o código do cliente (informado pelo supervisor)</div>
          <input style={S.input} type="number" inputMode="numeric" placeholder="000000"
            value={numInput} onChange={e => { setNumInput(e.target.value); setNumErr(""); }}
            onKeyDown={e => e.key === "Enter" && submitNumeric()} autoFocus />
          {numErr && <div style={S.err}>{numErr}</div>}
          <button style={S.btnGrn} onClick={submitNumeric}>Validar código</button>
        </>
      )}

      {mode === "pin" && (
        <>
          <div style={S.sub}>Digite o PIN de 4 dígitos do cliente</div>
          <div style={S.pinRow}>
            {pin.map((d, idx) => (
              <input key={idx} ref={pinRefs[idx]}
                style={{ ...S.pinBox, borderColor: pinErr ? "rgba(239,68,68,0.4)" : (d ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.12)") }}
                type="password" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handlePinDigit(idx, e.target.value)}
                onKeyDown={e => handlePinKey(idx, e)} autoFocus={idx === 0} />
            ))}
          </div>
          {pinErr && <div style={S.err}>{pinErr}</div>}
          <button style={S.btnGrn} onClick={submitPin} disabled={pin.join("").length < 4}>Validar PIN</button>
        </>
      )}

      {mode === "confirm" && (
        <>
          <div style={{ padding:"20px 0 12px" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>⚠️</div>
            <div style={{ color:"#f59e0b", fontWeight:600, fontSize:13, marginBottom:6 }}>Confirmar sem validação</div>
            <div style={{ color:"#475569", fontSize:12, lineHeight:1.6 }}>
              Use apenas se câmera, código e PIN falharem.<br/>
              O GPS continuará registrando sua localização.
            </div>
          </div>
          <button style={S.btnY} onClick={() => { stopCamera(); onDetected(QR_TOKEN); }}>⚡ Confirmar mesmo assim</button>
        </>
      )}

      <div style={S.divider}><div style={S.divLine}/><div style={S.divTxt}>ou</div><div style={S.divLine}/></div>
      <button style={S.btnG} onClick={() => { stopCamera(); onCancel(); }}>← Cancelar</button>
    </div>
  );
}

// ── Modal de Checkin ─────────────────────────────────────────────────────────
function CheckinModal({ order, onClose, onSuccess, theme, isGlass, isMobile }) {
  const [step, setStep]       = useState("select_action");
  const [action, setAction]   = useState(null);
  const [openChk, setOpenChk] = useState(null);
  const [location, setLoc]    = useState(null);
  const [notes, setNotes]     = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState(null);
  const [loadingOpen, setLO]  = useState(true);

  const [pinMode, setPinMode]   = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [offlineMsg, setOfflineMsg] = useState("");

  const now     = new Date();
  const horaFmt = now.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  const dataFmt = now.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" });

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { timeout:15000, enableHighAccuracy:true, maximumAge:0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    async function checkOpen() {
      if (!navigator.onLine) { setOpenChk(null); setLO(false); return; }
      try {
        const res  = await fetch(`${API}/checkin/open`, { headers:{ Authorization:`Bearer ${token()}` } });
        const data = await res.json();
        if (data.open && String(data.order_id) === String(order.id)) setOpenChk(data);
        else setOpenChk(null);
      } catch {}
      finally { setLO(false); }
    }
    checkOpen();
    const interval = setInterval(checkOpen, 10000);
    return () => clearInterval(interval);
  }, [order.id]);

  function onQRDetected(text) {
    if (text.trim() !== QR_TOKEN) {
      setError("QR Code inválido. Use o adesivo oficial SV Finance.");
      setStep("select_action");
      return;
    }
    setError("");
    setStep("confirming");
  }

  function buildBody() {
    const base = {
      lat: location?.lat || null,
      lon: location?.lon || null,
      notes: notes || null,
      qr_token: QR_TOKEN,
      pin: pinMode ? pinValue : null,
      local_id: uuid(),
    };
    if (action === "start") return { ...base, kind: "start", client_id: order.client_id, order_id: order.id };
    return { ...base, kind: "finish", checkin_id: openChk?.checkin_id, order_id: order.id };
  }

  async function confirmar() {
    setSending(true);
    setError("");
    setOfflineMsg("");

    const body = buildBody();

    if (!navigator.onLine) {
      try {
        await enqueueCheckin(body);
        if (action === "start") await setOrderStatusOverlay(order.id, "in_progress");
        else                    await setOrderStatusOverlay(order.id, "done");
        setResult({ action, offline: true });
        setStep("success");
        setOfflineMsg("Sem internet — registro salvo e será sincronizado automaticamente.");
        onSuccess();
      } catch {
        setError("Não foi possível salvar offline. Tente novamente.");
      } finally {
        setSending(false);
      }
      return;
    }

    try {
      const endpoint = action==="start"
        ? `${API}/checkin/${order.client_id}/start`
        : `${API}/checkin/${openChk.checkin_id}/finish`;

      const res  = await fetch(endpoint, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body:JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.sem_coordenadas) {
          setPinMode(true);
          setError("Cliente sem localização cadastrada. Digite o PIN do encarregado.");
        } else {
          setError(data.msg || "Erro ao registrar. Tente novamente.");
        }
        return;
      }
      setResult({ ...data, action });
      setStep("success");
      onSuccess();
    } catch (e) {
      try {
        await enqueueCheckin(body);
        if (action === "start") await setOrderStatusOverlay(order.id, "in_progress");
        else                    await setOrderStatusOverlay(order.id, "done");
        setResult({ action, offline: true });
        setStep("success");
        setOfflineMsg("Conexão instável — registro salvo e será sincronizado automaticamente.");
        onSuccess();
      } catch {
        setError("Erro de conexão: " + (e.message || "verifique sua internet."));
      }
    } finally {
      setSending(false);
    }
  }

  const S = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)" },
    card:    { width:"100%", maxWidth:440, maxHeight:"92vh", overflowY:"auto", background:"#0a0f1e", border:"1px solid rgba(79,142,247,0.15)", borderRadius:24, padding:isMobile?"20px 16px":28, boxShadow:"0 24px 80px rgba(0,0,0,0.7)" },
    header:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
    title:   { fontWeight:700, fontSize:"1rem", color:"#e2e8f0" },
    close:   { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 },
    osBox:   { background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.15)", borderRadius:12, padding:"10px 14px", marginBottom:16, textAlign:"center" },
    osNum:   { color:"#4f8ef7", fontWeight:700, fontSize:"1rem" },
    osClient:{ color:"#475569", fontSize:11, marginTop:2 },
    btnBlue: { width:"100%", padding:"13px 0", background:"linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14, marginBottom:10, boxShadow:"0 4px 20px rgba(79,142,247,0.3)" },
    btnGreen:{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14, marginBottom:10 },
    btnGhost:{ width:"100%", padding:"11px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"#64748b", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13, marginBottom:8 },
    err:     { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:14 },
    textarea:{ width:"100%", padding:"11px 13px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#e2e8f0", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:14, resize:"none" },
    pinInput:{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(245,158,11,0.4)", borderRadius:10, color:"#e2e8f0", fontSize:20, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"center", letterSpacing:"6px", marginBottom:12 },
    time:    { textAlign:"center", marginBottom:14 },
  };

  if (loadingOpen) return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={{ textAlign:"center", padding:"40px 0", color:"#475569" }}>Verificando check-in aberto...</div>
      </div>
    </div>
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <div style={S.title}>📍 Registro de Serviço</div>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>
        <div style={S.osBox}>
          <div style={S.osNum}>{order.number}</div>
          <div style={S.osClient}>{order.client_name}</div>
        </div>

        {step === "select_action" && (
          <>
            <div style={S.time}>
              <div style={{ fontSize:"1.8rem", fontWeight:700, color:"#e2e8f0", letterSpacing:"-1px" }}>{horaFmt}</div>
              <div style={{ fontSize:12, color:"#475569", textTransform:"capitalize" }}>{dataFmt}</div>
            </div>
            {!navigator.onLine && (
              <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", color:"#f59e0b", padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:12, textAlign:"center" }}>
                📴 Você está offline — o registro será sincronizado depois.
              </div>
            )}
            {error && <div style={S.err}>⚠️ {error}</div>}
            {openChk ? (
              <>
                <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:14, marginBottom:14, textAlign:"center" }}>
                  <div style={{ color:"#f59e0b", fontWeight:700, fontSize:13 }}>⏱️ Serviço em andamento</div>
                  <div style={{ color:"#64748b", fontSize:12, marginTop:4 }}>Entrada às {openChk.checkin_at?.slice(11,16)}</div>
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

        {step === "scanning" && (
          <QRScanner
            action={action}
            clientCode={order.client_id}
            onDetected={onQRDetected}
            onCancel={() => setStep("select_action")}
          />
        )}

        {step === "confirming" && (
          <>
            <div style={S.time}>
              <span style={{ display:"inline-block", padding:"4px 14px", borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8,
                background: action==="start" ? "rgba(79,142,247,0.15)" : "rgba(34,197,94,0.15)",
                color:      action==="start" ? "#4f8ef7"               : "#22c55e" }}>
                {action==="start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
              </span>
              <div style={{ fontSize:"1.8rem", fontWeight:700, color:"#e2e8f0", letterSpacing:"-1px" }}>{horaFmt}</div>
              <div style={{ fontSize:12, color:"#475569", textTransform:"capitalize" }}>{dataFmt}</div>
            </div>

            {action==="finish" && openChk && (
              <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#4ade80", textAlign:"center" }}>
                Entrada registrada às {openChk.checkin_at?.slice(11,16)}
              </div>
            )}

            <textarea style={S.textarea} rows={2}
              placeholder={action==="start" ? "Observação de entrada (opcional)" : "Observação de saída (opcional)"}
              value={notes} onChange={e => setNotes(e.target.value)}
            />

            {pinMode && (
              <div style={{ marginBottom:14 }}>
                <div style={{ color:"#f59e0b", fontSize:12, fontWeight:600, marginBottom:6, textAlign:"center" }}>
                  🔑 PIN do encarregado (6 dígitos)
                </div>
                <input style={S.pinInput} type="number" inputMode="numeric" placeholder="000000"
                  value={pinValue} onChange={e => setPinValue(e.target.value.slice(0,6))} autoFocus />
              </div>
            )}

            {order.client_address && (
              <div style={{ fontSize:12, marginBottom:8, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }}>
                📍 {order.client_address}
              </div>
            )}
            <div style={{ fontSize:12, marginBottom:14, padding:"8px 12px", borderRadius:8,
              background: location ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${location ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
              color: location ? "#4ade80" : "#f59e0b" }}>
              {location ? "📡 GPS ativo — localização capturada"
                        : "⏳ Aguardando GPS..."}
            </div>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", padding:"12px 16px", borderRadius:10, fontSize:13, marginBottom:14 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>⚠️ Atenção</div>
                <div>{error}</div>
                {!pinMode && (
                  <button style={{ marginTop:10, width:"100%", padding:"8px 0", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, color:"#f87171", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:12 }}
                    onClick={() => { setError(""); setStep("scanning"); }}>
                    ← Tentar escanear novamente
                  </button>
                )}
              </div>
            )}

            {/* Botão salvar localização — visível só para admin quando cliente ainda não tem GPS */}
            {action === "start" && !order._hasLocation && location && (
              <button
                style={{ width:"100%", padding:"9px 0", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, color:"#4ade80", fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:12, marginBottom:10 }}
                onClick={async () => {
                  try {
                    const res = await fetch(`${API}/checkin/cliente/${order.client_id}/salvar-localizacao`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                      body: JSON.stringify({ lat: location.lat, lon: location.lon }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setError("");
                      alert("📍 Localização salva com sucesso!");
                    } else {
                      setError(data.msg || "Erro ao salvar localização.");
                    }
                  } catch {
                    setError("Erro de conexão ao salvar localização.");
                  }
                }}
              >
                📍 Salvar localização deste cliente aqui
              </button>
            )}

            {(!error || pinMode) && (
              <>
                <button
                  style={{ ...(action==="start" ? S.btnBlue : S.btnGreen), opacity:(sending||!location)?0.6:1, cursor:(sending||!location)?"not-allowed":"pointer" }}
                  onClick={confirmar}
                  disabled={sending||!location || (pinMode && pinValue.length < 4)}
                >
                  {sending ? "Registrando..."
                    : !location ? "Aguardando GPS..."
                    : pinMode ? "✓ Validar PIN e confirmar"
                    : action==="start" ? "✓ Confirmar entrada" : "✓ Confirmar saída"}
                </button>
                {!pinMode && (
                  <button style={S.btnGhost} onClick={() => setStep("scanning")} disabled={sending}>← Escanear novamente</button>
                )}
              </>
            )}
          </>
        )}

        {step === "success" && (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{result?.offline ? "⏳" : result?.action==="start" ? "📍" : "✅"}</div>
            <div style={{ fontSize:"1.1rem", fontWeight:700, marginBottom:6, color: result?.offline ? "#f59e0b" : result?.action==="start" ? "#4f8ef7" : "#22c55e" }}>
              {result?.offline ? "Registro salvo!" : result?.action==="start" ? "Check-in registrado!" : "Serviço concluído!"}
            </div>
            {offlineMsg && (
              <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:10, padding:"10px 14px", margin:"12px auto", fontSize:12, color:"#f59e0b" }}>
                {offlineMsg}
              </div>
            )}
            {!result?.offline && result?.action==="finish" && result?.duration_str && (
              <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:14, padding:"14px 20px", margin:"14px auto", display:"inline-block" }}>
                <div style={{ color:"#475569", fontSize:11, marginBottom:2 }}>Duração do serviço</div>
                <div style={{ color:"#22c55e", fontSize:"1.7rem", fontWeight:800, letterSpacing:"-1px" }}>{result.duration_str}</div>
              </div>
            )}
            {!result?.offline && result?.geo_msg && <div style={{ fontSize:11, color:"#475569", marginTop:8 }}>{result.geo_msg}</div>}
            <div style={{ color:"#475569", fontSize:12, marginTop:8 }}>{dataFmt} às {horaFmt}</div>
            <button style={{ ...S.btnGhost, marginTop:20 }} onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function Orders() {
  const { theme, themeId } = useTheme();
  const isGlass    = themeId === "glass";
  const colorScheme = isGlass ? "light" : "dark";
  const isMobile   = useIsMobile();
  const navigate   = useNavigate();
  const rg = isRestauraGlass(); // Detecta Restaura Glass

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [orders,         setOrders]         = useState([]);
  const [overlays,       setOverlays]       = useState({});
  const [clients,        setClients]        = useState([]);
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState("list");
  const [editing,        setEditing]        = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [items,          setItems]          = useState([]);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [toast,          setToast]          = useState(null);
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [checkinOrder,   setCheckinOrder]   = useState(null);
  const [detailOrder,    setDetailOrder]    = useState(null);
  const [orderCheckins,  setOrderCheckins]  = useState([]);
  const [loadingCheckins,setLoadingCheckins]= useState(false);
  const pollingRef = useRef(null);

  const CACHE_TTL = 60000;
  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null; }
      return data;
    } catch { return null; }
  }
  function cacheSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ data, ts:Date.now() })); } catch {}
  }
  function cacheInvalidate(key) {
    try { sessionStorage.removeItem(key); } catch {}
  }

  async function loadOverlays() {
    try { setOverlays(await getOrderOverlays()); } catch { setOverlays({}); }
  }

  async function fetchOrders() {
    try {
      const res  = await fetch(`${API}/orders`, { headers:{ Authorization:`Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      cacheSet("sv_orders", list);
    } catch {}
    await loadOverlays();
  }

  async function fetchAll() {
    setLoading(true);
    const co = cacheGet("sv_orders"), cc = cacheGet("sv_clients"), cp = cacheGet("sv_products");
    if (co) setOrders(co);
    if (cc) setClients(cc);
    if (cp) setProducts(cp);
    if (co && cc && cp) setLoading(false);
    await loadOverlays();
    if (!navigator.onLine) { setLoading(false); return; }
    try {
      const h = { Authorization:`Bearer ${token()}` };
      const resO = await fetch(`${API}/orders`, { headers:h });
      if (resO.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const dataO = await resO.json();
      const ords = Array.isArray(dataO) ? dataO : [];
      setOrders(ords); cacheSet("sv_orders", ords);
      try { const r = await fetch(`${API}/clients`,  { headers:h }); const d = await r.json(); const c = Array.isArray(d)?d:[]; setClients(c);  cacheSet("sv_clients",  c); } catch {}
      try { const r = await fetch(`${API}/products`, { headers:h }); const d = await r.json(); const p = Array.isArray(d)?d:[]; setProducts(p); cacheSet("sv_products", p); } catch {}
    } catch { showToast("Erro ao carregar ordens.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchOrderCheckins(orderId) {
    setLoadingCheckins(true);
    try {
      const res  = await fetch(`${API}/orders/${orderId}/checkins`, { headers:{ Authorization:`Bearer ${token()}` } });
      const data = await res.json();
      setOrderCheckins(Array.isArray(data) ? data : []);
    } catch { setOrderCheckins([]); }
    finally { setLoadingCheckins(false); }
  }

  function openDetailOrder(o) {
    setDetailOrder(o);
    fetchOrderCheckins(o.id);
  }

  useEffect(() => {
    fetchAll();
    pollingRef.current = setInterval(fetchOrders, 15000);
    const onOnline = () => { syncNow().then(() => fetchOrders()); };
    window.addEventListener("online", onOnline);
    const onSynced = () => { fetchOrders(); };
    window.addEventListener("sv_synced", onSynced);
    return () => {
      clearInterval(pollingRef.current);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("sv_synced", onSynced);
    };
  }, []);

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setItems([]); setView("form"); }
  function openEdit(o) {
    setEditing(o);
    setForm({ client_id:o.client_id, status:o.status, notes:o.notes||"", payment_terms:o.payment_terms||"", discount:o.discount||0 });
    setItems(o.items||[]);
    setView("form");
  }

  function addItem() { setItems(p => [...p, { product_id:"", name:"", unit:"un", qty:1, price:0, total:0 }]); }
  function removeItem(idx) { setItems(p => p.filter((_,i) => i!==idx)); }
  function updateItem(idx, fld, value) {
    setItems(p => {
      const n = [...p]; n[idx] = { ...n[idx], [fld]:value };
      if (fld==="qty"||fld==="price") n[idx].total = parseFloat(n[idx].qty||0)*parseFloat(n[idx].price||0);
      return n;
    });
  }
  function selectProduct(idx, pid) {
    const p = products.find(p => String(p.id)===String(pid));
    if (!p) return;
    setItems(prev => { const n=[...prev]; n[idx]={ ...n[idx], product_id:p.id, name:p.name, unit:p.unit||"un", price:p.price, total:parseFloat(n[idx].qty||1)*p.price }; return n; });
  }

  const subtotal    = items.reduce((s,i) => s+parseFloat(i.qty||0)*parseFloat(i.price||0), 0);
  const discountAmt = subtotal*(parseFloat(form.discount||0)/100);
  const total       = subtotal-discountAmt;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) { showToast("Selecione um cliente.", "error"); return; }
    if (!navigator.onLine) { showToast("Criar O.S aqui precisa de internet. Use a tela de Orçamentos para criar offline.", "warn"); return; }
    const payload = { ...form, client_id:parseInt(form.client_id), discount:parseFloat(form.discount||0), items };
    const url    = editing ? `${API}/orders/${editing.id}` : `${API}/orders`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
      if (res.ok) { cacheInvalidate("sv_orders"); showToast(editing?"O.S atualizada!":"O.S criada!"); setView("list"); fetchAll(); }
      else { const err = await res.json(); showToast(err.msg||"Erro.", "error"); }
    } catch { showToast("Erro de conexão.", "error"); }
  }

  async function changeStatus(o, status) {
    if (!navigator.onLine) { showToast("Mudar status manualmente precisa de internet.", "warn"); return; }
    try {
      await fetch(`${API}/orders/${o.id}/status`, {
        method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body:JSON.stringify({ status }),
      });
      cacheInvalidate("sv_orders"); fetchOrders();
    } catch { showToast("Erro ao alterar status.", "error"); }
  }

  async function handleDelete(id) {
    if (!navigator.onLine) { showToast("Exclusão precisa de internet.", "warn"); setDeleteConfirm(null); return; }
    try {
      const res = await fetch(`${API}/orders/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
      if (res.ok) { showToast("O.S removida."); setDeleteConfirm(null); cacheInvalidate("sv_orders"); fetchAll(); }
      else showToast("Erro ao remover.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  }

  function effectiveStatus(o) {
    return overlays[String(o.id)] || o.status;
  }

  const filtered = orders.filter(o => {
    const st = effectiveStatus(o);
    const statusOk = filterStatus==="all" || st===filterStatus;
    const searchOk = o.number.toLowerCase().includes(search.toLowerCase()) || o.client_name.toLowerCase().includes(search.toLowerCase());
    return statusOk && searchOk;
  });

  const countBy = (s) => orders.filter(o => effectiveStatus(o)===s).length;

  const inputStyle   = { background:theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
  const selectStyle  = { ...inputStyle, cursor:"pointer" };
  const modalBg      = isGlass ? { backdropFilter:"blur(18px) saturate(180%)",WebkitBackdropFilter:"blur(18px) saturate(180%)",background:"rgba(255,255,255,0.55)",border:"1px solid rgba(255,255,255,0.6)" } : { background:theme.bgModal, border:`1px solid ${theme.borderCard}` };
  const btnPrimary   = { background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}33` };
  const btnSecondary = { background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" };
  const formCard     = { background:isGlass?"rgba(255,255,255,0.2)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:14, padding:24, marginBottom:24, ...(isGlass&&{backdropFilter:"blur(18px) saturate(180%)",WebkitBackdropFilter:"blur(18px) saturate(180%)"}) };
  const sectionLabel = { fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:theme.textMuted, margin:"0 0 14px 2px" };
  const fieldStyle   = { display:"flex", flexDirection:"column", gap:6 };
  const labelStyle   = { color:theme.textSecondary, fontSize:"0.8rem", fontWeight:600 };

  // ══ FORM VIEW ══
  if (view === "form") return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ marginBottom:24 }}>
          <button style={{ ...btnSecondary, marginBottom:12, fontSize:"0.82rem" }} onClick={() => setView("list")}>← Voltar</button>
          <h1 style={{ fontSize:isMobile?"1.3rem":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>
            {editing ? `Editar O.S — ${editing.number}` : "Nova Ordem de Serviço"}
          </h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={formCard}>
            <p style={sectionLabel}>📋 Dados da O.S</p>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:16 }}>
              <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"1 / -1" }}>
                <label style={labelStyle}>Cliente *</label>
                <select style={selectStyle} required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">— Selecione o cliente —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                <select style={selectStyle} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Desconto Global (%)</label>
                <input style={inputStyle} type="number" min="0" max="100" step="0.1" placeholder="0" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Condições de Pagamento</label>
                <input style={inputStyle} placeholder="Ex: Pix no ato" value={form.payment_terms} onChange={e=>setForm({...form,payment_terms:e.target.value})}/>
              </div>
              <div style={{ ...fieldStyle, gridColumn:isMobile?"1":"1 / -1" }}>
                <label style={labelStyle}>Observações</label>
                <textarea style={{ ...inputStyle, resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
          </div>
          <div style={formCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <p style={{ ...sectionLabel, marginBottom:0 }}>📦 Itens</p>
              <button type="button" style={{ ...btnSecondary, fontSize:"0.82rem", padding:"7px 14px" }} onClick={addItem}>+ Adicionar Item</button>
            </div>
            {items.length===0 ? (
              <div style={{ textAlign:"center", color:theme.textMuted, padding:"32px 0" }}>Nenhum item. Clique em "+ Adicionar Item".</div>
            ) : (
              <>
                {!isMobile && (
                  <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1.5fr 1.5fr 36px", gap:10, padding:"8px 0", borderBottom:`1px solid ${theme.borderCard}`, color:theme.textMuted, fontSize:"0.75rem", fontWeight:600, textTransform:"uppercase", marginBottom:12 }}>
                    <span>Produto / Serviço</span><span>Unid.</span><span>Qtd.</span><span>Preço Unit.</span><span>Total</span><span></span>
                  </div>
                )}
                {items.map((item,idx)=>(
                  <div key={idx} style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"3fr 1fr 1fr 1.5fr 1.5fr 36px", gap:10, marginBottom:16, padding:isMobile?"16px":"0", background:isMobile?(isGlass?"rgba(255,255,255,0.15)":theme.bgCard):"transparent", borderRadius:isMobile?10:0, border:isMobile?`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`:"none" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {isMobile&&<label style={labelStyle}>Produto / Serviço</label>}
                      <select style={{ ...selectStyle, marginBottom:4 }} value={item.product_id||""} onChange={e=>selectProduct(idx,e.target.value)}>
                        <option value="">— Selecione —</option>
                        {products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
                      </select>
                      <input style={{ ...inputStyle, fontSize:"0.8rem" }} placeholder="Ou descreva manualmente" value={item.name} onChange={e=>updateItem(idx,"name",e.target.value)}/>
                    </div>
                    <div>{isMobile&&<label style={labelStyle}>Unid.</label>}<input style={inputStyle} value={item.unit} onChange={e=>updateItem(idx,"unit",e.target.value)}/></div>
                    <div>{isMobile&&<label style={labelStyle}>Qtd.</label>}<input style={inputStyle} type="number" min="1" step="0.01" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)}/></div>
                    <div>{isMobile&&<label style={labelStyle}>Preço</label>}<input style={inputStyle} type="number" min="0" step="0.01" value={item.price} onChange={e=>updateItem(idx,"price",e.target.value)}/></div>
                    <div style={{ display:"flex", alignItems:"center", color:theme.income, fontWeight:700, fontSize:"0.95rem" }}>
                      {isMobile&&<label style={{ ...labelStyle, marginRight:8 }}>Total:</label>}
                      {fmt(parseFloat(item.qty||0)*parseFloat(item.price||0))}
                    </div>
                    <button type="button" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, cursor:"pointer", color:"#ef4444", width:isMobile?"100%":36, height:isMobile?"auto":36, padding:isMobile?"8px":0 }} onClick={()=>removeItem(idx)}>
                      {isMobile?"Remover item":"✕"}
                    </button>
                  </div>
                ))}
                <div style={{ borderTop:`1px solid ${theme.borderCard}`, marginTop:8, paddingTop:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:"0.95rem" }}>
                    <span style={{ color:theme.textSecondary }}>Subtotal</span>
                    <span style={{ color:theme.textPrimary }}>{fmt(subtotal)}</span>
                  </div>
                  {parseFloat(form.discount)>0&&(
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, color:"#ef4444", fontSize:"0.95rem" }}>
                      <span>Desconto ({form.discount}%)</span><span>- {fmt(discountAmt)}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"1.2rem", fontWeight:700, color:theme.primary, borderTop:`1px solid ${theme.borderCard}`, paddingTop:12, marginTop:4 }}>
                    <span>TOTAL</span><span>{fmt(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginBottom:48, flexDirection:isMobile?"column":"row" }}>
            <button type="button" style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={()=>setView("list")}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimary, width:isMobile?"100%":"auto" }}>{editing?"Salvar Alterações":"Criar O.S"}</button>
          </div>
        </form>
      </div>
      {toast&&<div style={{ position:"fixed", bottom:28, right:28, color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":theme.primaryGrad }}>{toast.msg}</div>}
    </PageLayout>
  );

  // ══ LIST VIEW ══
  return (
    <PageLayout>
      <style>{`
        .card3d-os { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; transition:transform 0.35s ease,box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.7)":"0 20px 48px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.04)"}; position:relative; overflow:hidden; cursor:default; }
        .card3d-os::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-os:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-10px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.5)"}; }
        .table3d-os { background:${isGlass?"rgba(255,255,255,0.18)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.3)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);":"backdrop-filter:blur(4px);"} }
        .os-row:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0d`} !important; }
        @media (max-width:768px) { .card3d-os { transform:none !important; } .card3d-os:hover { transform:translateY(-6px) !important; } }
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }}/>
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Pedidos / O.S</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>Gerencie suas ordens de serviço</p>
            </div>
          </div>
          <button style={{ ...btnPrimary, whiteSpace:"nowrap" }} onClick={openCreate}>+ Nova O.S</button>
        </div>

        {!navigator.onLine && (
          <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", padding:"10px 16px", borderRadius:10, fontSize:13, marginBottom:20 }}>
            📴 Você está offline. Check-ins ficam salvos e a O.S muda de status na hora; sincroniza ao reconectar.
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"📋", label:"Total",       value:orders.length,            color:theme.primary, border:isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44` },
            { icon:"🔵", label:"Abertas",      value:countBy("open"),         color:"#3b82f6",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(59,130,246,0.3)" },
            { icon:"🟡", label:"Em andamento", value:countBy("in_progress"),  color:"#f59e0b",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(245,158,11,0.3)" },
            { icon:"✅", label:"Concluídas",   value:countBy("done"),         color:"#22c55e",     border:isGlass?"rgba(255,255,255,0.5)":"rgba(34,197,94,0.3)"  },
          ].map((c,i)=>(
            <div key={i} className="card3d-os" style={{ border:`1px solid ${c.border}` }}>
              <div style={{ fontSize:"1.5rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"1rem":"1.15rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          <input style={{ ...inputStyle, width:isMobile?"100%":"280px" }} type="text" placeholder="🔍 Buscar por número ou cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["all",...Object.keys(STATUS_MAP)].map(s=>(
              <button key={s} style={{ background:filterStatus===s?`${theme.primary}33`:(isGlass?"rgba(255,255,255,0.2)":theme.bgCard), color:filterStatus===s?theme.textActive:theme.textMuted, border:filterStatus===s?`1px solid ${theme.primary}66`:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer" }} onClick={()=>setFilterStatus(s)}>
                {s==="all"?"Todos":STATUS_MAP[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="table3d-os">
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
          ) : filtered.length===0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>📋</span>
              <p>{search?"Nenhuma O.S encontrada":"Nenhuma O.S cadastrada ainda"}</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth:isMobile?"620px":"unset" }}>
              <thead>
                <tr>
                  {(isMobile?["Número","Cliente","Status","Total","Check-in","Ações"]:["Número","Cliente","Origem","Itens","Total","Criado em","Status","Check-in","Ações"]).map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:theme.textMuted, fontWeight:600, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em", background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=>{
                  const effStatus = effectiveStatus(o);
                  const st = STATUS_MAP[effStatus]||STATUS_MAP.open;
                  const isOverlay = !!overlays[String(o.id)];
                  const podeCheckin = effStatus==="open"||effStatus==="in_progress";
                  return (
                    <tr key={o.id} className="os-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, transition:"background 0.15s" }}>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <button style={{ background:"none", border:"none", fontWeight:700, color:theme.primary, cursor:"pointer", fontSize:"0.88rem", padding:0, textDecoration:"underline" }}
                          onClick={() => openDetailOrder(o)}>
                          {o.number}
                        </button>
                      </td>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <div style={{ fontWeight:600, color:theme.textPrimary }}>{o.client_name}</div>
                      </td>
                      {!isMobile&&(
                        <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                          <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:600, background:o.origin==="quote"?`${theme.accent}22`:`${theme.primary}22`, color:o.origin==="quote"?theme.accent:theme.primary }}>
                            {o.origin==="quote"?"🧾 Orçamento":"✏️ Direta"}
                          </span>
                        </td>
                      )}
                      {!isMobile&&<td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted }}>{(o.items||[]).length} {(o.items||[]).length===1?"item":"itens"}</td>}
                      <td style={{ padding:"12px 16px", verticalAlign:"middle", fontWeight:700, color:theme.income }}>{fmt(o.total)}</td>
                      {!isMobile&&<td style={{ padding:"12px 16px", verticalAlign:"middle", color:theme.textMuted }}>{fmtDate(o.created_at)}</td>}
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        {isOverlay ? (
                          <span title="Atualizado offline — sincroniza ao reconectar" style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:600, color:st.color, background:st.bg }}>
                            {st.label} <span style={{ fontSize:9 }}>⏳</span>
                          </span>
                        ) : (
                          <select style={{ border:"none", borderRadius:20, padding:"4px 10px", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", outline:"none", colorScheme, color:st.color, background:st.bg }} value={o.status} onChange={e=>changeStatus(o,e.target.value)}>
                            {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        {podeCheckin ? (
                          <button style={{ background:effStatus==="in_progress"?"rgba(34,197,94,0.12)":"rgba(79,142,247,0.12)", border:`1px solid ${effStatus==="in_progress"?"rgba(34,197,94,0.3)":"rgba(79,142,247,0.3)"}`, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:"0.8rem", fontWeight:600, color:effStatus==="in_progress"?"#22c55e":"#4f8ef7", whiteSpace:"nowrap" }}
                            onClick={()=>setCheckinOrder(o)}>
                            {effStatus==="in_progress" ? "✅ Finalizar" : "📍 Check-in"}
                          </button>
                        ) : (
                          <span style={{ fontSize:"0.75rem", color:theme.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":`${theme.primary}44`}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={()=>openEdit(o)}>✏️</button>
                          <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={()=>setDeleteConfirm(o)}>🗑️</button>
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

      {checkinOrder && (
        <CheckinModal
          order={{ ...checkinOrder, _hasLocation: !!(checkinOrder?.client_latitude && checkinOrder?.client_longitude) }}
          isGlass={isGlass} isMobile={isMobile} theme={theme}
          onClose={() => setCheckinOrder(null)}
          onSuccess={() => { cacheInvalidate("sv_orders"); loadOverlays(); fetchOrders(); showToast("Registro salvo!"); setTimeout(() => setCheckinOrder(null), 1500); }}
        />
      )}

      {detailOrder && rg && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)", padding:16, overflowY:"auto" }} onClick={() => setDetailOrder(null)}>
          <div style={{ width:"100%", maxWidth:900, padding:20, overflowY:"auto", maxHeight:"95vh" }} onClick={e => e.stopPropagation()}>
            <RestauraGlassCard order={detailOrder} items={detailOrder.items||[]} theme={theme} isMobile={isMobile} />
            <div style={{ marginTop:16, display:"flex", gap:12, justifyContent:"center" }}>
              <button style={{ ...btnSecondary, padding:"10px 24px" }} onClick={() => setDetailOrder(null)}>← Voltar</button>
            </div>
          </div>
        </div>
      )}

      {detailOrder && !rg && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)", padding:16 }} onClick={() => setDetailOrder(null)}>
          <div style={{ ...modalBg, borderRadius:20, padding:isMobile?"20px 16px":28, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"1.1rem", color:theme.textPrimary }}>{detailOrder.number}</div>
                <div style={{ fontSize:12, color:theme.textMuted }}>{detailOrder.client_name}</div>
              </div>
              <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDetailOrder(null)}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {[
                { label:"Status",    value: STATUS_MAP[effectiveStatus(detailOrder)]?.label || detailOrder.status },
                { label:"Total",     value: fmt(detailOrder.total) },
                { label:"Criado em", value: fmtDate(detailOrder.created_at) },
                { label:"Concluído", value: fmtDate(detailOrder.finished_at) },
              ].map((f,i) => (
                <div key={i} style={{ background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.2)":theme.borderCard}`, borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:"0.9rem", fontWeight:600, color:theme.textPrimary }}>{f.value || "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:theme.textMuted, marginBottom:12 }}>
              📍 Registros de Execução ({orderCheckins.length})
            </div>
            {loadingCheckins ? (
              <div style={{ color:theme.textMuted, fontSize:13, textAlign:"center", padding:20 }}>Carregando...</div>
            ) : orderCheckins.length === 0 ? (
              <div style={{ color:theme.textMuted, fontSize:13, textAlign:"center", padding:20 }}>Nenhum registro de execução ainda.</div>
            ) : orderCheckins.map((chk,i) => (
              <div key={i} style={{ background:isGlass?"rgba(255,255,255,0.08)":theme.bgCard, border:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.borderCard}`, borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, color:theme.textMuted }}>Colaborador</div>
                    <div style={{ fontWeight:600, color:theme.textPrimary, fontSize:"0.9rem" }}>{chk.user_name || "—"}</div>
                  </div>
                  {chk.duration_str && (
                    <div style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8, padding:"4px 12px", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"#64748b" }}>Duração</div>
                      <div style={{ fontWeight:700, color:"#22c55e", fontSize:"0.9rem" }}>{chk.duration_str}</div>
                    </div>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                  <div>
                    <div style={{ color:theme.textMuted, marginBottom:2 }}>📍 Entrada</div>
                    <div style={{ color:theme.textPrimary, fontWeight:600 }}>{chk.checkin_at ? chk.checkin_at.replace("T"," ").slice(0,16) : "—"}</div>
                  </div>
                  <div>
                    <div style={{ color:theme.textMuted, marginBottom:2 }}>🏁 Saída</div>
                    <div style={{ color:theme.textPrimary, fontWeight:600 }}>{chk.checkout_at ? chk.checkout_at.replace("T"," ").slice(0,16) : "Em andamento..."}</div>
                  </div>
                  {chk.client_address && chk.client_address !== "—" && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ color:theme.textMuted, marginBottom:2 }}>🏠 Endereço</div>
                      <div style={{ color:theme.textPrimary }}>{chk.client_address}</div>
                    </div>
                  )}
                  {(chk.latitude||chk.longitude) && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ color:theme.textMuted, marginBottom:2 }}>🗺️ GPS do colaborador</div>
                      <div style={{ color:"#22c55e", fontSize:11 }}>{chk.latitude?.toFixed(5)}, {chk.longitude?.toFixed(5)}</div>
                    </div>
                  )}
                  {chk.synced_offline && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <span style={{ display:"inline-block", fontSize:10, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", borderRadius:6, padding:"2px 8px", fontWeight:600 }}>
                        ⏳ Registrado offline
                      </span>
                    </div>
                  )}
                  {chk.notes && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ color:theme.textMuted, marginBottom:2 }}>📝 Observação</div>
                      <div style={{ color:theme.textPrimary }}>{chk.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:16 }}>
              <button style={btnSecondary} onClick={() => setDetailOrder(null)}>Fechar</button>
              {(effectiveStatus(detailOrder)==="open"||effectiveStatus(detailOrder)==="in_progress") && (
                <button style={btnPrimary} onClick={() => { setDetailOrder(null); setCheckinOrder(detailOrder); }}>
                  {effectiveStatus(detailOrder)==="in_progress" ? "✅ Finalizar serviço" : "📍 Iniciar Check-in"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir O.S</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>
              Excluir <strong style={{ color:theme.textPrimary }}>{deleteConfirm.number}</strong> de <strong style={{ color:theme.textPrimary }}>{deleteConfirm.client_name}</strong>?
            </p>
            <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row", justifyContent:"flex-end" }}>
              <button style={{ ...btnSecondary, width:isMobile?"100%":"auto" }} onClick={()=>setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={()=>handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}