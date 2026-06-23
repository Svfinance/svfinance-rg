/**
 * RestauraGlassCard.jsx
 * Extraído de Orders.jsx — cartão de serviço da OS (modo digital e físico).
 *
 * Props:
 *   order                    → objeto da OS (id, number, client_id, client_name, status)
 *   theme                    → objeto de tema do ThemeContext
 *   isMobile                 → bool
 *   onCheckinClick(semanaIdx, action, onCheckinSuccess)
 *                            → abre CheckinModal para a semana correta;
 *                              passa onCheckinSuccess para que o pai possa
 *                              chamar de volta e atualizar o cartão visualmente.
 */

import { useState, useEffect } from "react";

const API    = "https://api.svfinance.com.br/api";
const token  = () => localStorage.getItem("token");

// ── Tema Restaura Glass ───────────────────────────────────────────────────────
const RGT = {
  verde:      "#1a8a3c",
  verdeBd:    "rgba(26,138,60,0.25)",
  verdePale:  "rgba(26,138,60,0.08)",
  cardBg:     "rgba(255,255,255,0.78)",
  cardBlur:   "blur(22px) saturate(180%)",
  cardShadow: "0 8px 32px rgba(26,138,60,0.13), 0 2px 8px rgba(0,0,0,0.07)",
  pageBg:     "transparent",
  text:       "#1a1a1a",
  textSub:    "#4a5568",
  radius:     14,
};

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES     = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const QTD_SEMANAS = { mensal: 4, quinzenal: 2, semanal: 4, esporadico: 1 };

const STATUS_MAP = {
  open:        { label: "Aberta",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  in_progress: { label: "Em andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  done:        { label: "Concluída",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  cancelled:   { label: "Cancelada",    color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function fmtDateBR(iso) {
  if (!iso) return "";
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}
function fmtMonthYear(d) {
  if (!d) return "";
  const dt = d.length > 10 ? new Date(d) : new Date(d + "T00:00:00");
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function calcProximaData(dias) {
  const map  = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  const dia  = Object.entries(dias).find(([, v]) => v)?.[0];
  if (!dia) return "";
  const alvo = map[dia] ?? 1;
  const hoje = new Date();
  const diff = (alvo - hoje.getDay() + 7) % 7 || 7;
  const prox = new Date(hoje);
  prox.setDate(hoje.getDate() + diff);
  return prox.toISOString().split("T")[0];
}

function calcDatasSemanas(mes, ano, dias) {
  const mapDia = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  const diaFixo = Object.entries(dias || {}).find(([, v]) => v)?.[0];
  if (!diaFixo || !mes || !ano) return [];
  const alvo   = mapDia[diaFixo] ?? 1;
  const inicio = new Date(ano, mes - 1, 1);
  while (inicio.getDay() !== alvo) inicio.setDate(inicio.getDate() + 1);
  const datas  = [];
  const atual  = new Date(inicio);
  while (atual.getMonth() === mes - 1) {
    datas.push(atual.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    atual.setDate(atual.getDate() + 7);
  }
  return datas;
}

function novaSemana(numero) {
  return { numero, int: false, hr: "", checkin_at: "", checkout_at: "", proxima_data: "", observacao: "", x: false, data_semana: "" };
}

function cardInicial(freq = "semanal") {
  return {
    frequencia: freq, obs: "",
    mes: new Date().getMonth() + 1, ano: new Date().getFullYear(),
    dias: { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false },
    semanas: Array.from({ length: QTD_SEMANAS[freq] }, (_, i) => novaSemana(i + 1)),
  };
}

// ── Logo RG ───────────────────────────────────────────────────────────────────
function LogoRG({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill={RGT.verde} />
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
        fontSize="26" fontWeight="900" fontFamily="Arial Black, Arial" fill="white">RG</text>
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RestauraGlassCard({ order, theme, isMobile, onCheckinClick }) {
  const [card,        setCard]      = useState(cardInicial());
  const [ocorrencias, setOcc]       = useState([]);
  const [showCalendario, setShowC]  = useState(false);
  const [novaData,    setNovaData]  = useState("");
  const [novaHora,    setNovaHora]  = useState("");
  const [salvando,    setSalvando]  = useState(false);
  const [loaded,      setLoaded]    = useState(false);
  const [modo,        setModo]      = useState("digital"); // "digital" | "fisico"
  const [showRenovar, setShowRenovar]   = useState(false);
  const [cardRenovar, setCardRenovar]   = useState(null);
  const [renovando,   setRenovando]     = useState(false);

  // ── Carregar cartão ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API}/limpeza/card/${order.id}`,
            { headers: { Authorization: `Bearer ${token()}` } });
          if (res.ok) {
            const data = await res.json();
            if (data.card?.semanas?.length) setCard(data.card);
            setOcc(data.ocorrencias || []);
            setLoaded(true);
            return;
          }
        } catch {}
      }
      const s = localStorage.getItem(`sv_rg_card_${order.id}`);
      const o = localStorage.getItem(`sv_rg_occ_${order.id}`);
      if (s) { try { setCard(JSON.parse(s)); } catch {} }
      if (o) { try { setOcc(JSON.parse(o));  } catch {} }
      setLoaded(true);
    }
    carregar();
  }, [order.id]);

  // ── Salvar cartão ───────────────────────────────────────────────────────────
  async function salvar() {
    setSalvando(true);
    localStorage.setItem(`sv_rg_card_${order.id}`, JSON.stringify(card));
    try {
      const idx = JSON.parse(localStorage.getItem("sv_rg_freq_idx") || "{}");
      idx[order.id] = card.frequencia;
      localStorage.setItem("sv_rg_freq_idx", JSON.stringify(idx));
    } catch {}
    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/card/${order.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body:    JSON.stringify({ card }),
        });
      } catch {}
    }
    setSalvando(false);
    alert("Cartão salvo!");
  }

  // ── Renovar cartão ──────────────────────────────────────────────────────────
  async function confirmarRenovacao() {
    if (!cardRenovar || !navigator.onLine) { alert("Conexão necessária para renovar."); return; }
    setRenovando(true);
    try {
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();

      const resOS = await fetch(`${API}/orders`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ client_id: order.client_id, status: "open", notes: `Renovação ${MESES[card.mes - 1]}/${card.ano}` }),
      });
      if (!resOS.ok) { alert("Erro ao criar nova O.S."); setRenovando(false); return; }
      const novaOS = await resOS.json();

      const cardNovo = {
        ...cardRenovar, mes: mesAtual, ano: anoAtual,
        semanas: cardRenovar.semanas.map((s, i) => ({
          numero: i + 1, int: s.int, hr: s.hr, observacao: "",
          checkin_at: "", checkout_at: "", proxima_data: "", x: false, data_dia: "",
        })),
      };

      await fetch(`${API}/limpeza/card/${novaOS.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ card: cardNovo }),
      });
      localStorage.setItem(`sv_rg_card_${novaOS.id}`, JSON.stringify(cardNovo));
      try {
        const idx = JSON.parse(localStorage.getItem("sv_rg_freq_idx") || "{}");
        idx[novaOS.id] = cardNovo.frequencia;
        localStorage.setItem("sv_rg_freq_idx", JSON.stringify(idx));
      } catch {}

      alert(`Cartão renovado para ${MESES[mesAtual - 1]}/${anoAtual}!`);
      setShowRenovar(false);
    } catch {
      alert("Erro ao renovar. Tente novamente.");
    }
    setRenovando(false);
  }

  // ── Ocorrências ─────────────────────────────────────────────────────────────
  async function registrarOcc(tipo, descricao = "") {
    const occ = {
      id:   uuid(), tipo,
      data: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      descricao,
      reagendamento_data: tipo === "remarcou" ? novaData : null,
      reagendamento_hora: tipo === "remarcou" ? novaHora : null,
    };
    const novas = [...ocorrencias, occ];
    setOcc(novas);
    localStorage.setItem(`sv_rg_occ_${order.id}`, JSON.stringify(novas));
    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/occurrence`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body:    JSON.stringify({ order_id: order.id, ...occ }),
        });
      } catch {}
    }

    // Se remarcou com data → preenche data_dia + obs na próxima semana sem check-in
    if (tipo === "remarcou" && novaData) {
      const nextIdx = card.semanas.findIndex(s => !s.checkin_at);
      if (nextIdx >= 0) {
        const semanas  = [...card.semanas];
        const hrStr    = novaHora ? ` às ${novaHora}` : "";
        const obsNova  = `📅 Remarcado para ${fmtDateBR(novaData)}${hrStr}`;
        semanas[nextIdx] = {
          ...semanas[nextIdx], data_dia: novaData,
          observacao: semanas[nextIdx].observacao
            ? `${semanas[nextIdx].observacao} | ${obsNova}`
            : obsNova,
        };
        const novoCard = { ...card, semanas };
        setCard(novoCard);
        localStorage.setItem(`sv_rg_card_${order.id}`, JSON.stringify(novoCard));
        if (navigator.onLine) {
          try {
            await fetch(`${API}/limpeza/card/${order.id}`, {
              method:  "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
              body:    JSON.stringify({ card: novoCard }),
            });
          } catch {}
        }
      }
    }
    setShowC(false);
    setNovaData("");
    setNovaHora("");
    alert("Ocorrência registrada!");
  }

  // ── Helpers de semana ───────────────────────────────────────────────────────
  function setFreq(f) {
    const qtd   = QTD_SEMANAS[f];
    const atual = card.semanas;
    const novas = qtd <= atual.length
      ? atual.slice(0, qtd)
      : [...atual, ...Array.from({ length: qtd - atual.length }, (_, i) => novaSemana(atual.length + i + 1))];
    setCard({ ...card, frequencia: f, semanas: novas });
  }

  function addSemana() {
    setCard({ ...card, semanas: [...card.semanas, novaSemana(card.semanas.length + 1)] });
  }

  function removeSemana(idx) {
    if (card.semanas.length <= 1) return;
    const novas = card.semanas.filter((_, i) => i !== idx).map((s, i) => ({ ...s, numero: i + 1 }));
    setCard({ ...card, semanas: novas });
  }

  function setSemana(idx, campo, valor) {
    const s = [...card.semanas];
    s[idx]  = { ...s[idx], [campo]: valor };
    setCard({ ...card, semanas: s });
  }

  function onCheckinSuccess(semanaIdx) {
    const agora    = new Date().toISOString();
    const proxData = calcProximaData(card.dias);
    const s        = [...card.semanas];
    if (!s[semanaIdx].checkin_at) s[semanaIdx] = { ...s[semanaIdx], checkin_at: agora };
    else s[semanaIdx] = { ...s[semanaIdx], checkout_at: agora, proxima_data: proxData };
    const novoCard = { ...card, semanas: s };
    setCard(novoCard);
    localStorage.setItem(`sv_rg_card_${order.id}`, JSON.stringify(novoCard));
  }

  if (!loaded) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: RGT.textSub }}>
      Carregando cartão...
    </div>
  );

  // Detectar cartão de mês anterior
  const mesAtualC  = new Date().getMonth() + 1;
  const anoAtualC  = new Date().getFullYear();
  const ehAnterior = loaded && card.semanas?.length > 0 &&
    (card.mes !== mesAtualC || card.ano !== anoAtualC);

  // ── Estilos base ────────────────────────────────────────────────────────────
  const inp      = { border: `1px solid ${RGT.verdeBd}`, borderRadius: 6, padding: "5px 8px", background: "#ffffff", color: "#1a1a1a", fontFamily: "inherit", fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box", colorScheme: "light" };
  const section  = { background: RGT.cardBg, backdropFilter: RGT.cardBlur, WebkitBackdropFilter: RGT.cardBlur, border: `1px solid ${RGT.verdeBd}`, borderRadius: RGT.radius, padding: isMobile ? "14px" : "18px", marginBottom: 14, boxShadow: RGT.cardShadow };
  const labelG   = { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: RGT.verde, marginBottom: 5, display: "block" };
  const btnVerde = { background: RGT.verde, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" };
  const btnBranco = { background: "rgba(255,255,255,0.9)", color: RGT.verde, border: `2px solid ${RGT.verde}`, borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" };
  const tipoOcc  = { fechou: "🔒 Fechado", remarcou: "📅 Remarcado", nao_compareceu: "❌ Não compareceu", mudou_ponto: "📍 Mudou ponto" };

  // ════════════════════════════════════════════════════════════════════════════
  // MODO CARTÃO FÍSICO
  // ════════════════════════════════════════════════════════════════════════════
  if (modo === "fisico") {
    const fB  = { border: "1px solid #1a8a3c", background: "#fff", color: "#1a1a1a", fontFamily: "inherit", fontSize: "0.82rem", outline: "none", padding: "4px 6px", borderRadius: 4, width: "100%", boxSizing: "border-box" };

    return (
      <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif" }}>
        {/* Toggle topo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setModo("digital")} style={{ ...btnBranco, padding: "6px 14px", fontSize: "0.78rem" }}>📱 Digital</button>
          <button style={{ ...btnVerde, padding: "6px 14px", fontSize: "0.78rem" }}>🖨️ Cartão Físico</button>
        </div>

        {/* Cartão físico */}
        <div style={{ background: "#fff", border: "2px solid #1a8a3c", borderRadius: 10, overflow: "hidden" }}>

          {/* Cabeçalho */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "2px solid #1a8a3c" }}>
            <div style={{ borderRight: "1px solid #1a8a3c", padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k, l]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", color: "#1a1a1a" }}>
                    <input type="radio" name={`freq_f_${order.id}`} value={k} checked={card.frequencia === k} onChange={() => setFreq(k)} style={{ accentColor: "#1a8a3c", cursor: "pointer" }} />
                    {l}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1a8a3c" }}>Obs:</span>
                <input style={{ ...fB, flex: 1 }} value={card.obs} onChange={e => setCard({ ...card, obs: e.target.value })} placeholder="nº contrato..." />
              </div>
            </div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1a8a3c", letterSpacing: "-0.5px" }}>RestauraGlass<sup style={{ fontSize: "0.5rem" }}>®</sup></div>
              <div style={{ fontSize: "0.55rem", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Especialista em limpeza de vidros</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1a8a3c" }}>Mês:</span>
                  <input style={{ ...fB, width: 40 }} type="number" min="1" max="12" value={card.mes} onChange={e => setCard({ ...card, mes: parseInt(e.target.value) || 1 })} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1a8a3c" }}>Ano:</span>
                  <input style={{ ...fB, width: 55 }} type="number" value={card.ano} onChange={e => setCard({ ...card, ano: parseInt(e.target.value) || 2026 })} />
                </div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div style={{ borderBottom: "1px solid #1a8a3c", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1a8a3c" }}>Cliente:</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1a1a1a" }}>{order.client_name}</span>
          </div>

          {/* Semanas */}
          {card.semanas.map((sem, idx) => (
            <div key={idx} style={{ borderBottom: idx < card.semanas.length - 1 ? "1px solid rgba(26,138,60,0.3)" : undefined }}>
              <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "auto" : 52 }}>
                <div style={{ borderRight: isMobile ? "none" : "1px solid rgba(26,138,60,0.3)", borderBottom: isMobile ? "1px solid rgba(26,138,60,0.2)" : "none", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem", fontWeight: 700, color: "#1a1a1a", cursor: "pointer" }}>
                      <input type="checkbox" checked={!!sem.int} onChange={e => setSemana(idx, "int", e.target.checked)} style={{ accentColor: "#1a8a3c" }} /> int
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem", fontWeight: 700, color: "#1a1a1a" }}>
                      hr <input type="time" value={sem.hr} onChange={e => setSemana(idx, "hr", e.target.value)} style={{ ...fB, width: 80, fontSize: "0.72rem" }} />
                    </label>
                    <input type="date" value={sem.data_dia || ""} onChange={e => setSemana(idx, "data_dia", e.target.value)} style={{ ...fB, width: 115, fontSize: "0.68rem" }} />
                  </div>
                  {/* Botão check-in */}
                  {!sem.checkin_at
                    ? <button onClick={() => onCheckinClick(idx, "start", onCheckinSuccess)} style={{ fontSize: "0.7rem", padding: "3px 8px", background: "#1a8a3c", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, width: "100%" }}>📍 Check-in</button>
                    : !sem.checkout_at
                      ? <div style={{ fontSize: "0.68rem", color: "#1a8a3c", fontWeight: 600, display: "flex", gap: 4, alignItems: "center" }}>
                          <span>✅ {new Date(sem.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          <button onClick={() => onCheckinClick(idx, "finish", onCheckinSuccess)} style={{ fontSize: "0.65rem", padding: "2px 6px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>🏁</button>
                        </div>
                      : <div style={{ fontSize: "0.68rem", color: "#22c55e", fontWeight: 600 }}>
                          ✅ {new Date(sem.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} → {new Date(sem.checkout_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                  }
                </div>

                {/* Número semana + botão remover */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "8px 12px" : "0 12px", borderTop: isMobile ? "1px solid rgba(26,138,60,0.15)" : "none" }}>
                  {(() => {
                    const datas      = calcDatasSemanas(card.mes, card.ano, card.dias);
                    const dataManual = sem.data_dia ? fmtDateBR(sem.data_dia) : "";
                    const dataCalc   = datas[idx] || "";
                    const dataExibir = dataManual || dataCalc;
                    return (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: isMobile ? "1.2rem" : "1.5rem", fontWeight: 900, fontFamily: "'Arial Black','Arial Bold',sans-serif", color: "#1a1a1a", lineHeight: 1.1 }}>
                          {sem.numero}ª semana
                        </span>
                        {dataExibir && (
                          <span style={{ fontSize: "0.7rem", color: "#1a8a3c", fontWeight: 700 }}>
                            {dataExibir}{dataManual ? " ✏️" : ""}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={!!sem.x} onChange={e => setSemana(idx, "x", e.target.checked)} style={{ accentColor: "#1a8a3c" }} /> x
                    </label>
                    {card.semanas.length > 1 && (
                      <button onClick={() => removeSemana(idx)} title="Remover semana" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}>✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Observação */}
              <div style={{ padding: "4px 10px 8px 10px", borderTop: "1px solid rgba(26,138,60,0.15)" }}>
                <input style={{ ...fB, fontSize: "0.75rem" }} placeholder="Observação da semana..." value={sem.observacao} onChange={e => setSemana(idx, "observacao", e.target.value)} />
              </div>
            </div>
          ))}

          {/* Dias da semana */}
          <div style={{ borderTop: "2px solid #1a8a3c", padding: "8px 12px", display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap" }}>
            {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", color: "#1a1a1a" }}>
                <span>{l}</span>
                <input type="checkbox" checked={!!card.dias[k]} onChange={e => setCard({ ...card, dias: { ...card.dias, [k]: e.target.checked } })} style={{ width: 14, height: 14, accentColor: "#1a8a3c" }} />
              </label>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, marginBottom: 14 }}>
          <button onClick={addSemana} style={{ ...btnBranco, padding: "8px 10px", fontSize: "0.78rem" }}>+ Semana</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnVerde, padding: "8px 10px", fontSize: "0.78rem" }}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
          <button onClick={() => window.print()} style={{ ...btnBranco, padding: "8px 10px", fontSize: "0.78rem" }}>🖨️ Imprimir</button>
        </div>

        {/* Desfecho */}
        <div style={{ ...section, marginBottom: 14 }}>
          <span style={labelG}>⚠️ Desfecho da visita</span>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {[
              { tipo: "fechou",          label: "🔒 Loja / Fechado",    bg: "#ef4444" },
              { tipo: "remarcou",        label: "📅 Cliente Remarcou",  bg: "#3b82f6" },
              { tipo: "nao_compareceu",  label: "❌ Não Compareceu",    bg: "#f59e0b" },
              { tipo: "mudou_ponto",     label: "📍 Mudou de Ponto",    bg: "#6b7280" },
            ].map(b => (
              <button key={b.tipo} onClick={() => b.tipo === "remarcou" ? setShowC(!showCalendario) : registrarOcc(b.tipo)}
                style={{ padding: "9px 8px", background: b.bg, color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", fontFamily: "inherit" }}>
                {b.label}
              </button>
            ))}
          </div>
          {showCalendario && (
            <div style={{ marginTop: 10, padding: 10, background: "rgba(255,255,255,0.9)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><span style={labelG}>Data</span><input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} style={inp} /></div>
                <div><span style={labelG}>Hora</span><input type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)} style={inp} /></div>
              </div>
              <button onClick={() => registrarOcc("remarcou", "Cliente remarcou")} style={{ ...btnVerde, width: "100%", padding: "8px 0" }}>✓ Confirmar Remarcação</button>
            </div>
          )}
        </div>

        {/* Histórico */}
        {ocorrencias.length > 0 && (
          <div style={section}>
            <span style={labelG}>📝 Histórico de ocorrências</span>
            {ocorrencias.map((o, i) => (
              <div key={i} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.9)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 6, marginBottom: 6, fontSize: "0.8rem" }}>
                <strong style={{ color: RGT.verde }}>{tipoOcc[o.tipo] || o.tipo}</strong>
                <div style={{ color: RGT.textSub, marginTop: 2 }}>
                  {o.data} às {o.hora}
                  {o.reagendamento_data && <span style={{ color: "#3b82f6" }}> → {o.reagendamento_data} às {o.reagendamento_hora}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODO DIGITAL (glassmorphism)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: RGT.text }}>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button style={{ ...btnVerde, padding: "6px 14px", fontSize: "0.78rem" }}>📱 Digital</button>
        <button onClick={() => setModo("fisico")} style={{ ...btnBranco, padding: "6px 14px", fontSize: "0.78rem" }}>🖨️ Cartão Físico</button>
      </div>

      {/* Banner renovação */}
      {ehAnterior && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#b45309", fontSize: "0.88rem" }}>📅 Cartão de {MESES[card.mes - 1]}/{card.ano}</div>
            <div style={{ fontSize: "0.75rem", color: RGT.textSub }}>Este cartão é de um mês anterior. Deseja renovar para {MESES[mesAtualC - 1]}/{anoAtualC}?</div>
          </div>
          <button onClick={() => { setCardRenovar(card); setShowRenovar(true); }}
            style={{ background: "#d97706", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            🔄 Renovar para {MESES[mesAtualC - 1]}
          </button>
        </div>
      )}

      {/* Modal renovação */}
      {showRenovar && cardRenovar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(4px)" }} onClick={() => setShowRenovar(false)}>
          <div style={{ background: "#fff", border: `1px solid ${RGT.verdeBd}`, borderRadius: 16, padding: 24, width: "90%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(22,163,74,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: RGT.verde, marginBottom: 4 }}>🔄 Renovar Cartão</div>
            <div style={{ fontSize: "0.82rem", color: RGT.textSub, marginBottom: 16 }}>
              Nova O.S para <strong>{order.client_name}</strong> — {MESES[mesAtualC - 1]}/{anoAtualC}<br />
              As semanas serão zeradas mas a configuração será mantida. Você pode editar antes de confirmar.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: RGT.verde, display: "block", marginBottom: 4 }}>Frequência</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k, l]) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, background: cardRenovar.frequencia === k ? RGT.verde : "#f4fbf6", color: cardRenovar.frequencia === k ? "#fff" : "#1a1a1a", border: `1px solid ${cardRenovar.frequencia === k ? RGT.verde : RGT.verdeBd}` }}>
                      <input type="radio" name="freq_ren" value={k} checked={cardRenovar.frequencia === k} onChange={() => setCardRenovar({ ...cardRenovar, frequencia: k })} style={{ display: "none" }} />{l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: RGT.verde, display: "block", marginBottom: 4 }}>Obs / Contrato</span>
                <input style={{ border: `1px solid ${RGT.verdeBd}`, borderRadius: 6, padding: "6px 10px", background: "#fff", color: "#1a1a1a", fontSize: "0.82rem", outline: "none", width: "100%", boxSizing: "border-box" }}
                  value={cardRenovar.obs} onChange={e => setCardRenovar({ ...cardRenovar, obs: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: RGT.verde, display: "block", marginBottom: 6 }}>Dia fixo</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k, l]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "5px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, background: cardRenovar.dias?.[k] ? RGT.verde : "#f4fbf6", color: cardRenovar.dias?.[k] ? "#fff" : "#1a1a1a", border: `1px solid ${cardRenovar.dias?.[k] ? RGT.verde : RGT.verdeBd}` }}>
                    <input type="checkbox" checked={!!cardRenovar.dias?.[k]} onChange={e => setCardRenovar({ ...cardRenovar, dias: { ...cardRenovar.dias, [k]: e.target.checked } })} style={{ display: "none" }} />{l}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRenovar(false)} style={{ background: "#fff", color: RGT.verde, border: `2px solid ${RGT.verde}`, borderRadius: 8, padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={confirmarRenovacao} disabled={renovando}
                style={{ background: RGT.verde, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: renovando ? 0.6 : 1 }}>
                {renovando ? "Renovando..." : `✅ Confirmar — ${MESES[mesAtualC - 1]}/${anoAtualC}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ ...section, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <LogoRG size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1.2rem", color: RGT.verde, letterSpacing: "-0.5px" }}>RestauraGlass<sup style={{ fontSize: "0.55rem" }}>®</sup></div>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: RGT.textSub, textTransform: "uppercase" }}>Especialista em limpeza de vidros</div>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, marginTop: 4, color: RGT.text }}>{fmtMonthYear(order.created_at) || order.number} — {order.client_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: RGT.textSub }}>Status</div>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: STATUS_MAP[order.status]?.bg, color: STATUS_MAP[order.status]?.color }}>
            {STATUS_MAP[order.status]?.label || order.status}
          </span>
        </div>
      </div>

      {/* Frequência + obs + mês/ano */}
      <div style={section}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div>
            <span style={labelG}>Frequência</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k, l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "5px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: card.frequencia === k ? RGT.verde : "rgba(255,255,255,0.8)", color: card.frequencia === k ? "#fff" : RGT.text, border: `1px solid ${card.frequencia === k ? RGT.verde : RGT.verdeBd}`, transition: "all 0.18s" }}>
                  <input type="radio" name={`freq_d_${order.id}`} value={k} checked={card.frequencia === k} onChange={() => setFreq(k)} style={{ display: "none" }} />{l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span style={labelG}>Obs / Nº Contrato</span>
            <input style={inp} value={card.obs} placeholder="ex: 125/126" onChange={e => setCard({ ...card, obs: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
          <div><span style={labelG}>Mês</span><input style={inp} type="number" min="1" max="12" value={card.mes} onChange={e => setCard({ ...card, mes: parseInt(e.target.value) || 1 })} /></div>
          <div><span style={labelG}>Ano</span><input style={inp} type="number" value={card.ano} onChange={e => setCard({ ...card, ano: parseInt(e.target.value) || 2026 })} /></div>
          <div><span style={labelG}>Cliente</span><div style={{ ...inp, background: "rgba(240,250,244,0.9)", cursor: "default", display: "flex", alignItems: "center" }}>{order.client_name}</div></div>
        </div>
      </div>

      {/* Dias da semana */}
      <div style={section}>
        <span style={labelG}>Dia fixo da semana</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k, l]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "5px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700, background: card.dias[k] ? RGT.verde : "rgba(255,255,255,0.8)", color: card.dias[k] ? "#fff" : RGT.text, border: `1px solid ${card.dias[k] ? RGT.verde : RGT.verdeBd}`, transition: "all 0.18s" }}>
              <input type="checkbox" checked={!!card.dias[k]} onChange={e => setCard({ ...card, dias: { ...card.dias, [k]: e.target.checked } })} style={{ display: "none" }} />{l}
            </label>
          ))}
        </div>
      </div>

      {/* Semanas */}
      <div style={section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={labelG}>Execução por semana</span>
          <button onClick={addSemana} style={{ ...btnBranco, padding: "5px 14px", fontSize: "0.78rem" }}>+ Semana</button>
        </div>
        {card.semanas.map((sem, idx) => {
          const temCheckin  = !!sem.checkin_at;
          const temCheckout = !!sem.checkout_at;
          return (
            <div key={idx} style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                {(() => {
                  const datas      = calcDatasSemanas(card.mes, card.ano, card.dias);
                  const dataManual = sem.data_dia ? fmtDateBR(sem.data_dia) : "";
                  const dataCalc   = datas[idx] || "";
                  const dataExibir = dataManual || dataCalc;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
                      <span style={{ fontWeight: 900, fontSize: "1.1rem", color: RGT.verde, lineHeight: 1.1 }}>{sem.numero}ª semana</span>
                      {dataExibir && (
                        <span style={{ fontSize: "0.7rem", color: dataManual ? RGT.verde : RGT.textSub, fontWeight: 700 }}>
                          {dataExibir}{dataManual ? " ✏️" : ""}
                        </span>
                      )}
                    </div>
                  );
                })()}
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!sem.int} onChange={e => setSemana(idx, "int", e.target.checked)} style={{ width: 14, height: 14, accentColor: RGT.verde }} /> Int
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: RGT.verde }}>Hora</span>
                    <input type="time" value={sem.hr} onChange={e => setSemana(idx, "hr", e.target.value)} style={{ ...inp, width: 95 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: RGT.verde }}>Data</span>
                    <input type="date" value={sem.data_dia || ""} onChange={e => setSemana(idx, "data_dia", e.target.value)} style={{ ...inp, width: 130 }} />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>
                  <input type="checkbox" checked={!!sem.x} onChange={e => setSemana(idx, "x", e.target.checked)} style={{ width: 14, height: 14, accentColor: RGT.verde }} /> ✓ Ok
                </label>
                {card.semanas.length > 1 && (
                  <button onClick={() => removeSemana(idx)} title="Remover semana" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#ef4444", fontSize: "0.78rem", fontWeight: 700 }}>✕</button>
                )}
              </div>

              {/* Botões check-in / check-out */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                {!temCheckin ? (
                  <button onClick={() => onCheckinClick(idx, "start", onCheckinSuccess)} style={{ ...btnVerde, padding: "7px 14px", fontSize: "0.8rem" }}>📍 Iniciar serviço</button>
                ) : !temCheckout ? (
                  <>
                    <div style={{ fontSize: "0.78rem", color: RGT.textSub }}>✅ Entrada: <strong>{new Date(sem.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
                    <button onClick={() => onCheckinClick(idx, "finish", onCheckinSuccess)} style={{ ...btnVerde, background: "#22c55e", padding: "7px 14px", fontSize: "0.8rem" }}>🏁 Finalizar</button>
                  </>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#22c55e", fontWeight: 600 }}>
                    ✅ {new Date(sem.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} → {new Date(sem.checkout_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {sem.proxima_data && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <span style={{ fontSize: "0.72rem", color: RGT.textSub }}>Próxima:</span>
                    <input type="date" value={sem.proxima_data} onChange={e => setSemana(idx, "proxima_data", e.target.value)} style={{ ...inp, width: 130, fontSize: "0.78rem" }} />
                  </div>
                )}
              </div>
              <input style={{ ...inp, fontSize: "0.8rem" }} placeholder="Observação da semana (ex: limpeza interna, só externa...)" value={sem.observacao} onChange={e => setSemana(idx, "observacao", e.target.value)} />
            </div>
          );
        })}
      </div>

      {/* Salvar / imprimir */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <button onClick={salvar} disabled={salvando} style={btnVerde}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
        <button onClick={() => window.print()} style={btnBranco}>🖨️ Imprimir</button>
      </div>

      {/* Desfecho */}
      <div style={{ ...section, marginBottom: 14 }}>
        <span style={labelG}>⚠️ Desfecho da visita</span>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
          {[
            { tipo: "fechou",         label: "🔒 Loja / Fechado",   bg: "#ef4444" },
            { tipo: "remarcou",       label: "📅 Cliente Remarcou", bg: "#3b82f6" },
            { tipo: "nao_compareceu", label: "❌ Não Compareceu",   bg: "#f59e0b" },
            { tipo: "mudou_ponto",    label: "📍 Mudou de Ponto",   bg: "#6b7280" },
          ].map(b => (
            <button key={b.tipo} onClick={() => b.tipo === "remarcou" ? setShowC(!showCalendario) : registrarOcc(b.tipo)}
              style={{ padding: "10px 8px", background: b.bg, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
              {b.label}
            </button>
          ))}
        </div>
        {showCalendario && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.9)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><span style={labelG}>Data</span><input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} style={inp} /></div>
              <div><span style={labelG}>Hora</span><input type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)} style={inp} /></div>
            </div>
            <button onClick={() => registrarOcc("remarcou", "Cliente remarcou")} style={{ ...btnVerde, width: "100%" }}>✓ Confirmar Remarcação</button>
          </div>
        )}
      </div>

      {/* Histórico */}
      {ocorrencias.length > 0 && (
        <div style={section}>
          <span style={labelG}>📝 Histórico de ocorrências</span>
          {ocorrencias.map((o, i) => (
            <div key={i} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.9)", border: `1px solid ${RGT.verdeBd}`, borderRadius: 7, marginBottom: 6, fontSize: "0.8rem" }}>
              <strong style={{ color: RGT.verde }}>{tipoOcc[o.tipo] || o.tipo}</strong>
              <div style={{ color: RGT.textSub, marginTop: 2 }}>
                {o.data} às {o.hora}
                {o.reagendamento_data && <span style={{ color: "#3b82f6" }}> → {o.reagendamento_data} às {o.reagendamento_hora}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}