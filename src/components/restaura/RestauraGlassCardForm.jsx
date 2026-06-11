/**
 * RestauraGlassCardForm.jsx
 * Extraído de Orders.jsx — formulário de criação de novo cartão (nova O.S RG).
 *
 * Props:
 *   clients    → lista de clientes da empresa
 *   onSubmit(cliente, cardData) → chamado ao confirmar criação
 *   onCancel() → volta para a lista
 *   isMobile   → bool
 */

import { useState, useEffect, useRef } from "react";

// ── Constantes ────────────────────────────────────────────────────────────────
const verde   = "#1a8a3c";
const verdeBd = "rgba(26,138,60,0.25)";

const QTD_SEMANAS = { mensal: 4, quinzenal: 2, semanal: 4, esporadico: 1 };

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function calcDatasSemanas(mes, ano, dias) {
  const mapDia  = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
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

// ── Logo RG ───────────────────────────────────────────────────────────────────
function LogoRG({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill={verde} />
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
        fontSize="26" fontWeight="900" fontFamily="Arial Black, Arial" fill="white">RG</text>
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RestauraGlassCardForm({ clients, onSubmit, onCancel, isMobile }) {
  const [busca,       setBusca]      = useState("");
  const [clienteSel,  setClienteSel] = useState(null);
  const [endereco,    setEndereco]   = useState("");
  const [card,        setCard]       = useState(cardInicial("semanal"));
  const [criando,     setCriando]    = useState(false);
  const [showDropdown,setShowDD]     = useState(false);
  const [dropRect,    setDropRect]   = useState(null);
  const [modoForm,    setModoForm]   = useState("digital");
  const inputRef = useRef(null);

  // Pré-selecionar cliente vindo do Clients.jsx via sessionStorage
  useEffect(() => {
    const cid = sessionStorage.getItem("sv_rg_preselect_client");
    if (!cid || clients.length === 0) return;
    const found = clients.find(c => String(c.id) === String(cid));
    if (found) {
      selecionarCliente(found);
      sessionStorage.removeItem("sv_rg_preselect_client");
    }
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Busca de clientes ───────────────────────────────────────────────────────
  const filtrados = busca.length >= 1
    ? clients.filter(c =>
        c.name.toLowerCase().includes(busca.toLowerCase()) ||
        (c.codigo && String(c.codigo).toLowerCase().includes(busca.toLowerCase()))
      ).slice(0, 8)
    : [];

  function atualizarRect() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }

  function selecionarCliente(c) {
    setClienteSel(c);
    setBusca(c.name);
    setShowDD(false);
    const partes = [c.logradouro, c.numero, c.complemento, c.bairro, c.municipio, c.uf].filter(Boolean);
    setEndereco(partes.length > 0 ? partes.join(", ") : (c.address || ""));
  }

  function abrirLocalizacao() {
    if (!endereco.trim()) return;
    const q = encodeURIComponent(endereco.trim());
    if (/iPad|iPhone|iPod/.test(navigator.userAgent))
      window.open(`maps://maps.apple.com/?q=${q}`, "_blank");
    else
      window.open(`https://maps.google.com/?q=${q}`, "_blank");
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

  async function handleCriar() {
    if (!clienteSel) { alert("Selecione um cliente."); return; }
    setCriando(true);
    await onSubmit(clienteSel, card);
    setCriando(false);
  }

  // ── Estilos base ────────────────────────────────────────────────────────────
  const inp     = { border: `1px solid ${verdeBd}`, borderRadius: 6, padding: "7px 10px", background: "#fff", color: "#1a1a1a", fontFamily: "inherit", fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box", colorScheme: "light" };
  const section = { background: "rgba(255,255,255,0.88)", border: `1px solid ${verdeBd}`, borderRadius: 12, padding: isMobile ? "14px" : "18px", marginBottom: 14, boxShadow: "0 2px 12px rgba(26,138,60,0.06)" };
  const labelG  = { fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: verde, marginBottom: 4, display: "block" };
  const btnV    = { background: verde, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" };
  const btnB    = { background: "#fff", color: verde, border: `2px solid ${verde}`, borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" };

  // ── Toggle modo ─────────────────────────────────────────────────────────────
  const toggle = (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button onClick={() => setModoForm("digital")} style={{ ...(modoForm === "digital" ? btnV : btnB), padding: "7px 18px", fontSize: "0.85rem" }}>📱 Digital</button>
      <button onClick={() => setModoForm("fisico")}  style={{ ...(modoForm === "fisico"  ? btnV : btnB), padding: "7px 18px", fontSize: "0.85rem" }}>🖨️ Cartão Físico</button>
    </div>
  );

  // ── Bloco cliente (compartilhado entre os dois modos) ───────────────────────
  const blocoCliente = (
    <div style={section}>
      <span style={labelG}>Cliente *</span>
      <div style={{ position: "relative" }}>
        <input ref={inputRef} style={inp}
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setShowDD(true); atualizarRect(); if (!e.target.value) setClienteSel(null); }}
          onFocus={() => { setShowDD(true); atualizarRect(); }}
          onBlur={() => setTimeout(() => setShowDD(false), 180)}
        />
        {showDropdown && filtrados.length > 0 && dropRect && (
          <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 99999, background: "#fff", border: `1px solid ${verdeBd}`, borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", maxHeight: 260, overflowY: "auto" }}>
            {filtrados.map(c => (
              <div key={c.id} onMouseDown={() => selecionarCliente(c)}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${verdeBd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(26,138,60,0.06)"}
                onMouseOut={e  => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1a1a1a" }}>{c.name}</div>
                  {c.address && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{c.address}</div>}
                </div>
                {c.codigo && <span style={{ fontSize: "0.72rem", color: verde, fontWeight: 700 }}>#{c.codigo}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {clienteSel && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(240,250,244,0.9)", border: `1px solid ${verdeBd}`, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: verde, fontSize: "0.88rem" }}>✅ {clienteSel.name}</div>
          <div style={{ marginTop: 8 }}>
            <span style={labelG}>Endereço</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inp, flex: 1, fontSize: "0.82rem" }} placeholder="Endereço..." value={endereco} onChange={e => setEndereco(e.target.value)} />
              <button type="button" onClick={abrirLocalizacao}
                style={{ ...btnV, padding: "0 12px", fontSize: "0.78rem", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                📍 {!isMobile && "Abrir localização"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODO FÍSICO
  // ════════════════════════════════════════════════════════════════════════════
  if (modoForm === "fisico") {
    const fB = { border: "1px solid #1a8a3c", background: "#fff", color: "#1a1a1a", fontFamily: "inherit", fontSize: "0.82rem", outline: "none", padding: "4px 7px", borderRadius: 4, colorScheme: "light" };
    return (
      <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: "#1a1a1a" }}>
        {toggle}

        <div style={{ background: "#fff", border: "2px solid #1a8a3c", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>

          {/* Frequência + cabeçalho RG */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", borderBottom: "1px solid rgba(26,138,60,0.3)" }}>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k, l]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                    <input type="radio" name="freq_fis" value={k} checked={card.frequencia === k} onChange={() => setFreq(k)} style={{ accentColor: "#1a8a3c" }} /> {l}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1a8a3c", whiteSpace: "nowrap" }}>Obs:</span>
                <input style={{ ...fB, flex: 1 }} value={card.obs} onChange={e => setCard({ ...card, obs: e.target.value })} placeholder="nº contrato..." />
              </div>
            </div>
            <div style={{ padding: "8px 12px", background: "rgba(26,138,60,0.04)", borderTop: "1px solid rgba(26,138,60,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#1a8a3c" }}>RestauraGlass<sup style={{ fontSize: "0.45rem" }}>®</sup></span>
                <span style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Especialista em limpeza de vidros</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1a8a3c" }}>Mês:</span>
                  <input style={{ ...fB, width: 44 }} type="number" min="1" max="12" value={card.mes} onChange={e => setCard({ ...card, mes: parseInt(e.target.value) || 1 })} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1a8a3c" }}>Ano:</span>
                  <input style={{ ...fB, width: 60 }} type="number" value={card.ano} onChange={e => setCard({ ...card, ano: parseInt(e.target.value) || 2026 })} />
                </div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div style={{ borderBottom: "1px solid rgba(26,138,60,0.3)", padding: "8px 12px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1a8a3c", whiteSpace: "nowrap" }}>Cliente:</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <input ref={inputRef} style={{ ...fB, width: "100%" }}
                    placeholder="Buscar cliente..."
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setShowDD(true); atualizarRect(); if (!e.target.value) setClienteSel(null); }}
                    onFocus={() => { setShowDD(true); atualizarRect(); }}
                    onBlur={() => setTimeout(() => setShowDD(false), 180)}
                  />
                  {showDropdown && filtrados.length > 0 && dropRect && (
                    <div style={{ position: "fixed", top: dropRect.top, left: dropRect.left, width: Math.max(dropRect.width, 260), zIndex: 99999, background: "#fff", border: `1px solid ${verdeBd}`, borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", maxHeight: 220, overflowY: "auto" }}>
                      {filtrados.map(c => (
                        <div key={c.id} onMouseDown={() => selecionarCliente(c)}
                          style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${verdeBd}`, display: "flex", justifyContent: "space-between" }}
                          onMouseOver={e => e.currentTarget.style.background = "rgba(26,138,60,0.06)"}
                          onMouseOut={e  => e.currentTarget.style.background = "transparent"}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1a1a1a" }}>{c.name}</div>
                          {c.codigo && <span style={{ fontSize: "0.72rem", color: verde, fontWeight: 700 }}>#{c.codigo}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {clienteSel && <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✅</span>}
              </div>
            </div>
            {clienteSel && endereco && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1a8a3c", whiteSpace: "nowrap" }}>End:</span>
                <input style={{ ...fB, flex: 1, fontSize: "0.72rem" }} value={endereco} onChange={e => setEndereco(e.target.value)} />
                <button type="button" onClick={abrirLocalizacao} style={{ background: "#1a8a3c", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>📍</button>
              </div>
            )}
          </div>

          {/* Semanas */}
          {card.semanas.map((sem, idx) => {
            const datas    = calcDatasSemanas(card.mes, card.ano, card.dias);
            const dataCalc = datas[idx] || "";
            return (
              <div key={idx} style={{ borderBottom: idx < card.semanas.length - 1 ? "1px solid rgba(26,138,60,0.25)" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "auto" : 48 }}>
                  <div style={{ borderRight: isMobile ? "none" : "1px solid rgba(26,138,60,0.2)", borderBottom: isMobile ? "1px solid rgba(26,138,60,0.15)" : "none", padding: "6px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!sem.int} onChange={e => setSemana(idx, "int", e.target.checked)} style={{ accentColor: "#1a8a3c" }} /> int
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem" }}>
                        hr <input type="time" value={sem.hr} onChange={e => setSemana(idx, "hr", e.target.value)} style={{ ...fB, width: 84 }} />
                      </label>
                    </div>
                    <input type="date" value={sem.data_dia || ""} onChange={e => setSemana(idx, "data_dia", e.target.value)} style={{ ...fB, fontSize: "0.72rem", width: "100%" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: isMobile ? "1px solid rgba(26,138,60,0.15)" : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 900, fontFamily: "'Arial Black','Arial Bold',sans-serif", color: "#1a1a1a", lineHeight: 1.1 }}>{sem.numero}ª semana</span>
                      {dataCalc && <span style={{ fontSize: "0.7rem", color: "#1a8a3c", fontWeight: 700 }}>{dataCalc}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.75rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!sem.x} onChange={e => setSemana(idx, "x", e.target.checked)} style={{ accentColor: "#1a8a3c" }} /> x
                      </label>
                      {card.semanas.length > 1 && (
                        <button onClick={() => removeSemana(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "4px 10px 8px", borderTop: "1px solid rgba(26,138,60,0.12)" }}>
                  <input style={{ ...fB, width: "100%", boxSizing: "border-box" }} placeholder="Observação da semana..." value={sem.observacao} onChange={e => setSemana(idx, "observacao", e.target.value)} />
                </div>
              </div>
            );
          })}

          {/* Dias da semana */}
          <div style={{ borderTop: "2px solid #1a8a3c", padding: "8px 12px", display: "flex", gap: isMobile ? 10 : 14, flexWrap: "wrap" }}>
            {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>
                {l} <input type="checkbox" checked={!!card.dias[k]} onChange={e => setCard({ ...card, dias: { ...card.dias, [k]: e.target.checked } })} style={{ width: 14, height: 14, accentColor: "#1a8a3c" }} />
              </label>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button onClick={addSemana}    style={{ ...btnB, padding: "9px 8px", fontSize: "0.8rem" }}>+ Semana</button>
          <button onClick={onCancel}     style={{ ...btnB, padding: "9px 8px", fontSize: "0.8rem" }}>Cancelar</button>
          <button onClick={handleCriar}  disabled={criando || !clienteSel}
            style={{ ...btnV, padding: "9px 8px", fontSize: "0.8rem", opacity: criando || !clienteSel ? 0.6 : 1 }}>
            {criando ? "Criando..." : "✅ Criar Cartão"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODO DIGITAL (glassmorphism)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: "#1a1a1a" }}>
      {toggle}

      {/* Header */}
      <div style={{ ...section, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <LogoRG size={48} />
        <div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem", color: verde }}>Nova Ordem de Serviço</div>
          <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Restaura Glass · Especialista em limpeza de vidros</div>
        </div>
      </div>

      {blocoCliente}

      {/* Frequência + obs + mês/ano */}
      <div style={section}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div>
            <span style={labelG}>Frequência</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k, l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "5px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: card.frequencia === k ? verde : "#fff", color: card.frequencia === k ? "#fff" : "#1a1a1a", border: `1px solid ${card.frequencia === k ? verde : verdeBd}`, transition: "all 0.18s" }}>
                  <input type="radio" name="freq_dig" value={k} checked={card.frequencia === k} onChange={() => setFreq(k)} style={{ display: "none" }} />{l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span style={labelG}>Obs / Nº Contrato</span>
            <input style={inp} value={card.obs} placeholder="ex: 125/126" onChange={e => setCard({ ...card, obs: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div><span style={labelG}>Mês</span><input style={inp} type="number" min="1" max="12" value={card.mes} onChange={e => setCard({ ...card, mes: parseInt(e.target.value) || 1 })} /></div>
          <div><span style={labelG}>Ano</span><input style={inp} type="number" value={card.ano} onChange={e => setCard({ ...card, ano: parseInt(e.target.value) || 2026 })} /></div>
        </div>
      </div>

      {/* Dias da semana */}
      <div style={section}>
        <span style={labelG}>Dia fixo da semana</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k, l]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "5px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700, background: card.dias[k] ? verde : "#fff", color: card.dias[k] ? "#fff" : "#1a1a1a", border: `1px solid ${card.dias[k] ? verde : verdeBd}`, transition: "all 0.18s" }}>
              <input type="checkbox" checked={!!card.dias[k]} onChange={e => setCard({ ...card, dias: { ...card.dias, [k]: e.target.checked } })} style={{ display: "none" }} />{l}
            </label>
          ))}
        </div>
      </div>

      {/* Semanas */}
      <div style={section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={labelG}>Semanas do mês</span>
          <button onClick={addSemana} style={{ ...btnB, padding: "5px 14px", fontSize: "0.78rem" }}>+ Semana</button>
        </div>
        {card.semanas.map((sem, idx) => {
          const datas    = calcDatasSemanas(card.mes, card.ano, card.dias);
          const dataCalc = datas[idx] || "";
          return (
            <div key={idx} style={{ background: "#fff", border: `1px solid ${verdeBd}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 90 }}>
                  <span style={{ fontWeight: 900, fontSize: "1rem", color: verde, lineHeight: 1.1 }}>{sem.numero}ª semana</span>
                  {dataCalc && <span style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600 }}>{dataCalc}</span>}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!sem.int} onChange={e => setSemana(idx, "int", e.target.checked)} style={{ width: 14, height: 14, accentColor: verde }} /> Int
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 600, color: verde }}>Hora</span>
                  <input type="time" value={sem.hr} onChange={e => setSemana(idx, "hr", e.target.value)} style={{ ...inp, width: 95 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 600, color: verde }}>Data</span>
                  <input type="date" value={sem.data_dia || ""} onChange={e => setSemana(idx, "data_dia", e.target.value)} style={{ ...inp, width: 130 }} />
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", background: "rgba(26,138,60,0.06)", padding: "3px 8px", borderRadius: 5 }}>📍 Check-in ao abrir O.S</div>
                  {card.semanas.length > 1 && (
                    <button onClick={() => removeSemana(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#ef4444", fontSize: "0.78rem", fontWeight: 700 }}>✕</button>
                  )}
                </div>
              </div>
              <input style={{ ...inp, fontSize: "0.8rem" }} placeholder="Observação da semana..." value={sem.observacao} onChange={e => setSemana(idx, "observacao", e.target.value)} />
            </div>
          );
        })}
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: isMobile ? "column" : "row" }}>
        <button onClick={onCancel} style={btnB}>Cancelar</button>
        <button onClick={handleCriar} disabled={criando || !clienteSel}
          style={{ ...btnV, opacity: criando || !clienteSel ? 0.6 : 1 }}>
          {criando ? "Criando..." : "✅ Criar Cartão"}
        </button>
      </div>
    </div>
  );
}