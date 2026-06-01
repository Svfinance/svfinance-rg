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

// ── ISOLAMENTO RESTAURA GLASS ────────────────────────────────────────────────
const RG_ID = "17";
const isRG = () => String(localStorage.getItem("company_id") || "") === RG_ID;

// ── TEMA RESTAURA GLASS ──────────────────────────────────────────────────────
const RGT = {
  verde:       "#1a8a3c",
  verdeBd:     "rgba(26,138,60,0.25)",
  verdePale:   "rgba(26,138,60,0.08)",
  cardBg:      "rgba(255,255,255,0.78)",
  cardBlur:    "blur(22px) saturate(180%)",
  cardShadow:  "0 8px 32px rgba(26,138,60,0.13), 0 2px 8px rgba(0,0,0,0.07)",
  pageBg:      "linear-gradient(140deg,#f0faf4 0%,#ffffff 55%,#e8f5ed 100%)",
  text:        "#1a1a1a",
  textSub:     "#4a5568",
  radius:      14,
};

// ── SEMANAS ──────────────────────────────────────────────────────────────────
const QTD_SEMANAS = { mensal: 4, quinzenal: 2, semanal: 4, esporadico: 1 };

const novaSemana = (numero) => ({
  numero, int: false, hr: "", checkin_at: "", checkout_at: "",
  proxima_data: "", observacao: "", x: false,
});

const cardInicial = (freq = "semanal") => ({
  frequencia: freq, obs: "",
  mes: new Date().getMonth() + 1, ano: new Date().getFullYear(),
  dias: { seg:false, ter:false, qua:false, qui:false, sex:false, sab:false },
  semanas: Array.from({ length: QTD_SEMANAS[freq] }, (_, i) => novaSemana(i + 1)),
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
}
function fmtDate(d) {
  if (!d) return "—";
  const [y,m,dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}
function fmtDateBR(iso) {
  if (!iso) return "";
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function calcProximaData(dias) {
  const map = { seg:1, ter:2, qua:3, qui:4, sex:5, sab:6 };
  const dia = Object.entries(dias).find(([,v]) => v)?.[0];
  if (!dia) return "";
  const alvo = map[dia] ?? 1;
  const hoje = new Date();
  const diff = (alvo - hoje.getDay() + 7) % 7 || 7;
  const prox = new Date(hoje);
  prox.setDate(hoje.getDate() + diff);
  return prox.toISOString().split("T")[0];
}

const STATUS_MAP = {
  open:        { label:"Aberta",       color:"#3b82f6", bg:"rgba(59,130,246,0.12)"  },
  in_progress: { label:"Em andamento", color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
  done:        { label:"Concluída",    color:"#22c55e", bg:"rgba(34,197,94,0.12)"   },
  cancelled:   { label:"Cancelada",    color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
};
const EMPTY_FORM = { client_id:"", status:"open", notes:"", payment_terms:"", discount:0 };

// ── LOGO RG ──────────────────────────────────────────────────────────────────
function LogoRG({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill={RGT.verde}/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
        fontSize="26" fontWeight="900" fontFamily="Arial Black, Arial" fill="white">RG</text>
    </svg>
  );
}

// ── CARTÃO RESTAURA GLASS (DETALHE / EDIÇÃO) ─────────────────────────────────
function RestauraGlassCard({ order, theme, isMobile, onCheckinClick, checkinSemanaIdx, onClose }) {
  const [card, setCard]           = useState(cardInicial());
  const [ocorrencias, setOcc]     = useState([]);
  const [showCalendario, setShowC]= useState(false);
  const [novaData, setNovaData]   = useState("");
  const [novaHora, setNovaHora]   = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [loaded, setLoaded]       = useState(false);

  useEffect(() => {
    async function carregar() {
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API}/limpeza/card/${order.id}`,
            { headers: { Authorization:`Bearer ${token()}` } });
          if (res.ok) {
            const data = await res.json();
            if (data.card?.semanas?.length) setCard(data.card);
            setOcc(data.ocorrencias || []);
            setLoaded(true); return;
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

  async function salvar() {
    setSalvando(true);
    localStorage.setItem(`sv_rg_card_${order.id}`, JSON.stringify(card));
    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/card/${order.id}`, {
          method:"PUT",
          headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`},
          body: JSON.stringify({ card }),
        });
      } catch {}
    }
    setSalvando(false);
    alert("Cartão salvo!");
  }

  async function registrarOcc(tipo, descricao="") {
    const occ = {
      id: uuid(), tipo,
      data: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
      descricao,
      reagendamento_data: tipo==="remarcou" ? novaData : null,
      reagendamento_hora: tipo==="remarcou" ? novaHora : null,
    };
    const novas = [...ocorrencias, occ];
    setOcc(novas);
    localStorage.setItem(`sv_rg_occ_${order.id}`, JSON.stringify(novas));
    if (navigator.onLine) {
      try {
        await fetch(`${API}/limpeza/occurrence`, {
          method:"POST",
          headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`},
          body: JSON.stringify({ order_id:order.id, ...occ }),
        });
      } catch {}
    }
    setShowC(false); setNovaData(""); setNovaHora("");
    alert("Ocorrência registrada!");
  }

  function setFreq(f) {
    const qtd = QTD_SEMANAS[f];
    const atual = card.semanas;
    const novas = qtd <= atual.length
      ? atual.slice(0, qtd)
      : [...atual, ...Array.from({length:qtd-atual.length},(_,i)=>novaSemana(atual.length+i+1))];
    setCard({ ...card, frequencia:f, semanas:novas });
  }

  function addSemana() {
    const prox = novaSemana(card.semanas.length + 1);
    setCard({ ...card, semanas:[...card.semanas, prox] });
  }

  function setSemana(idx, campo, valor) {
    const s = [...card.semanas];
    s[idx] = { ...s[idx], [campo]:valor };
    setCard({ ...card, semanas:s });
  }

  // Quando checkin finaliza: recebe o index da semana e grava horário + sugere próxima data
  function onCheckinSuccess(semanaIdx) {
    const agora = new Date().toISOString();
    const proxData = calcProximaData(card.dias);
    const s = [...card.semanas];
    if (!s[semanaIdx].checkin_at) {
      s[semanaIdx] = { ...s[semanaIdx], checkin_at: agora };
    } else {
      s[semanaIdx] = { ...s[semanaIdx], checkout_at: agora, proxima_data: proxData };
    }
    const novoCard = { ...card, semanas:s };
    setCard(novoCard);
    localStorage.setItem(`sv_rg_card_${order.id}`, JSON.stringify(novoCard));
  }

  if (!loaded) return (
    <div style={{textAlign:"center",padding:"40px 0",color:RGT.textSub}}>Carregando cartão...</div>
  );

  const inp = {
    border:`1px solid ${RGT.verdeBd}`, borderRadius:6, padding:"5px 8px",
    background:"rgba(255,255,255,0.9)", color:RGT.text, fontFamily:"inherit",
    fontSize:"0.85rem", outline:"none", width:"100%", boxSizing:"border-box",
  };
  const section = {
    background: RGT.cardBg, backdropFilter: RGT.cardBlur,
    WebkitBackdropFilter: RGT.cardBlur, border:`1px solid ${RGT.verdeBd}`,
    borderRadius: RGT.radius, padding:isMobile?"14px":"18px",
    marginBottom:14, boxShadow: RGT.cardShadow,
  };
  const labelG = { fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase",
    letterSpacing:"0.08em", color:RGT.verde, marginBottom:5, display:"block" };
  const btnVerde = { background:RGT.verde, color:"#fff", border:"none", borderRadius:8,
    padding:"9px 18px", fontWeight:700, cursor:"pointer", fontSize:"0.85rem", fontFamily:"inherit" };
  const btnBranco = { background:"rgba(255,255,255,0.9)", color:RGT.verde,
    border:`2px solid ${RGT.verde}`, borderRadius:8, padding:"9px 18px",
    fontWeight:700, cursor:"pointer", fontSize:"0.85rem", fontFamily:"inherit" };

  const tipoOcc = { fechou:"🔒 Fechado", remarcou:"📅 Remarcado",
    nao_compareceu:"❌ Não compareceu", mudou_ponto:"📍 Mudou ponto" };

  return (
    <div style={{ fontFamily:"'Segoe UI',Arial,sans-serif", color:RGT.text }}>

      {/* HEADER */}
      <div style={{ ...section, display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
        <LogoRG size={48}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:"1.2rem",color:RGT.verde,letterSpacing:"-0.5px"}}>
            RestauraGlass<sup style={{fontSize:"0.55rem"}}>®</sup>
          </div>
          <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",color:RGT.textSub,textTransform:"uppercase"}}>
            Especialista em limpeza de vidros
          </div>
          <div style={{fontSize:"0.82rem",fontWeight:600,marginTop:4,color:RGT.text}}>
            {order.number} — {order.client_name}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"0.72rem",color:RGT.textSub}}>Status</div>
          <span style={{
            padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700,
            background: STATUS_MAP[order.status]?.bg, color: STATUS_MAP[order.status]?.color,
          }}>{STATUS_MAP[order.status]?.label || order.status}</span>
        </div>
      </div>

      {/* FREQUÊNCIA + OBS + MÊS/ANO */}
      <div style={section}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <div>
            <span style={labelG}>Frequência</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k,l])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                  padding:"5px 10px", borderRadius:20, fontSize:"0.8rem", fontWeight:600,
                  background: card.frequencia===k ? RGT.verde : "rgba(255,255,255,0.8)",
                  color: card.frequencia===k ? "#fff" : RGT.text,
                  border:`1px solid ${card.frequencia===k ? RGT.verde : RGT.verdeBd}`,
                  transition:"all 0.18s",
                }}>
                  <input type="radio" name="freq" value={k} checked={card.frequencia===k}
                    onChange={()=>setFreq(k)} style={{display:"none"}}/>
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span style={labelG}>Obs / Nº Contrato</span>
            <input style={inp} value={card.obs} placeholder="ex: 125/126"
              onChange={e=>setCard({...card,obs:e.target.value})}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12}}>
          <div>
            <span style={labelG}>Mês</span>
            <input style={inp} type="number" min="1" max="12" value={card.mes}
              onChange={e=>setCard({...card,mes:parseInt(e.target.value)||1})}/>
          </div>
          <div>
            <span style={labelG}>Ano</span>
            <input style={inp} type="number" value={card.ano}
              onChange={e=>setCard({...card,ano:parseInt(e.target.value)||2026})}/>
          </div>
          <div>
            <span style={labelG}>Cliente</span>
            <div style={{...inp, background:"rgba(240,250,244,0.9)", cursor:"default",
              display:"flex",alignItems:"center"}}>{order.client_name}</div>
          </div>
        </div>
      </div>

      {/* DIAS DA SEMANA */}
      <div style={section}>
        <span style={labelG}>Dia fixo da semana</span>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k,l])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
              padding:"5px 12px", borderRadius:20, fontSize:"0.8rem", fontWeight:700,
              background: card.dias[k] ? RGT.verde : "rgba(255,255,255,0.8)",
              color: card.dias[k] ? "#fff" : RGT.text,
              border:`1px solid ${card.dias[k] ? RGT.verde : RGT.verdeBd}`,
              transition:"all 0.18s",
            }}>
              <input type="checkbox" checked={!!card.dias[k]}
                onChange={e=>setCard({...card,dias:{...card.dias,[k]:e.target.checked}})}
                style={{display:"none"}}/>
              {l}
            </label>
          ))}
        </div>
      </div>

      {/* SEMANAS */}
      <div style={section}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={labelG}>Execução por semana</span>
          <button onClick={addSemana} style={{...btnBranco,padding:"5px 14px",fontSize:"0.78rem"}}>
            + Semana
          </button>
        </div>

        {card.semanas.map((sem, idx) => {
          const temCheckin  = !!sem.checkin_at;
          const temCheckout = !!sem.checkout_at;
          return (
            <div key={idx} style={{
              background:"rgba(255,255,255,0.85)", border:`1px solid ${RGT.verdeBd}`,
              borderRadius:10, padding:"12px 14px", marginBottom:10,
            }}>
              {/* linha superior: número + int + hr */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontWeight:900,fontSize:"1.1rem",color:RGT.verde,minWidth:80}}>
                  {sem.numero}ª semana
                </span>
                <label style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!sem.int}
                    onChange={e=>setSemana(idx,"int",e.target.checked)}
                    style={{width:14,height:14,accentColor:RGT.verde}}/>
                  Int
                </label>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:"0.78rem",fontWeight:600}}>Hora:</span>
                  <input type="time" value={sem.hr}
                    onChange={e=>setSemana(idx,"hr",e.target.value)}
                    style={{...inp,width:100}}/>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>
                  <input type="checkbox" checked={!!sem.x}
                    onChange={e=>setSemana(idx,"x",e.target.checked)}
                    style={{width:14,height:14,accentColor:RGT.verde}}/>
                  ✓ Confirmado
                </label>
              </div>

              {/* botão check-in / status */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                {!temCheckin ? (
                  <button
                    onClick={() => onCheckinClick(idx, "start")}
                    style={{...btnVerde, padding:"7px 14px", fontSize:"0.8rem", display:"flex",alignItems:"center",gap:6}}>
                    📍 Iniciar serviço
                  </button>
                ) : !temCheckout ? (
                  <>
                    <div style={{fontSize:"0.78rem",color:RGT.textSub}}>
                      ✅ Entrada: <strong>{new Date(sem.checkin_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</strong>
                    </div>
                    <button
                      onClick={() => onCheckinClick(idx, "finish")}
                      style={{...btnVerde, background:"#22c55e", padding:"7px 14px", fontSize:"0.8rem"}}>
                      🏁 Finalizar serviço
                    </button>
                  </>
                ) : (
                  <div style={{fontSize:"0.78rem",color:"#22c55e",fontWeight:600}}>
                    ✅ {new Date(sem.checkin_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                    {" → "}
                    {new Date(sem.checkout_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                )}

                {sem.proxima_data && (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
                    <span style={{fontSize:"0.72rem",color:RGT.textSub}}>Próxima visita:</span>
                    <input type="date" value={sem.proxima_data}
                      onChange={e=>setSemana(idx,"proxima_data",e.target.value)}
                      style={{...inp,width:130,fontSize:"0.78rem"}}/>
                  </div>
                )}
              </div>

              {/* observação da semana */}
              <input style={{...inp,fontSize:"0.8rem"}}
                placeholder="Observação da semana (ex: limpeza interna, só externa...)"
                value={sem.observacao}
                onChange={e=>setSemana(idx,"observacao",e.target.value)}/>
            </div>
          );
        })}
      </div>

      {/* BOTÕES SALVAR / IMPRIMIR */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <button onClick={salvar} disabled={salvando} style={btnVerde}>
          {salvando ? "Salvando..." : "💾 Salvar Cartão"}
        </button>
        <button onClick={()=>window.print()} style={btnBranco}>
          🖨️ Imprimir
        </button>
      </div>

      {/* DESFECHO DA VISITA */}
      <div style={{...section,marginBottom:14}}>
        <span style={labelG}>⚠️ Desfecho da visita</span>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          {[
            {tipo:"fechou",      label:"🔒 Loja / Fechado",    bg:"#ef4444"},
            {tipo:"remarcou",    label:"📅 Cliente Remarcou",  bg:"#3b82f6"},
            {tipo:"nao_compareceu", label:"❌ Não Compareceu", bg:"#f59e0b"},
            {tipo:"mudou_ponto", label:"📍 Mudou de Ponto",    bg:"#6b7280"},
          ].map(b=>(
            <button key={b.tipo}
              onClick={()=> b.tipo==="remarcou" ? setShowC(!showCalendario) : registrarOcc(b.tipo)}
              style={{padding:"10px 8px",background:b.bg,color:"#fff",border:"none",
                borderRadius:8,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit"}}>
              {b.label}
            </button>
          ))}
        </div>

        {showCalendario && (
          <div style={{marginTop:12,padding:12,background:"rgba(255,255,255,0.9)",
            border:`1px solid ${RGT.verdeBd}`,borderRadius:8}}>
            <span style={labelG}>Nova data da visita</span>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><span style={{...labelG,fontSize:"0.68rem"}}>Data</span>
                <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)} style={inp}/></div>
              <div><span style={{...labelG,fontSize:"0.68rem"}}>Hora</span>
                <input type="time" value={novaHora} onChange={e=>setNovaHora(e.target.value)} style={inp}/></div>
            </div>
            <button onClick={()=>registrarOcc("remarcou","Cliente remarcou")} style={{...btnVerde,width:"100%"}}>
              ✓ Confirmar Remarcação
            </button>
          </div>
        )}
      </div>

      {/* HISTÓRICO */}
      {ocorrencias.length > 0 && (
        <div style={section}>
          <span style={labelG}>📝 Histórico de ocorrências</span>
          {ocorrencias.map((o,i)=>(
            <div key={i} style={{padding:"8px 10px",background:"rgba(255,255,255,0.9)",
              border:`1px solid ${RGT.verdeBd}`,borderRadius:7,marginBottom:6,fontSize:"0.8rem"}}>
              <strong style={{color:RGT.verde}}>{tipoOcc[o.tipo]||o.tipo}</strong>
              <div style={{color:RGT.textSub,marginTop:2}}>
                {o.data} às {o.hora}
                {o.reagendamento_data &&
                  <span style={{color:"#3b82f6"}}> → {fmtDateBR(o.reagendamento_data)} às {o.reagendamento_hora}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NOVA O.S COMO CARTÃO (FORM RG) ──────────────────────────────────────────
function RestauraGlassCardForm({ clients, onSubmit, onCancel, isMobile }) {
  const [busca, setBusca]         = useState("");
  const [clienteSel, setClienteSel] = useState(null);
  const [card, setCard]           = useState(cardInicial("semanal"));
  const [criando, setCriando]     = useState(false);
  const [showDropdown, setShowDD] = useState(false);

  const filtrados = busca.length >= 1
    ? clients.filter(c =>
        c.name.toLowerCase().includes(busca.toLowerCase()) ||
        (c.codigo && String(c.codigo).toLowerCase().includes(busca.toLowerCase()))
      ).slice(0, 8)
    : [];

  function selecionarCliente(c) {
    setClienteSel(c);
    setBusca(c.name);
    setShowDD(false);
  }

  function setFreq(f) {
    const qtd = QTD_SEMANAS[f];
    const atual = card.semanas;
    const novas = qtd <= atual.length
      ? atual.slice(0, qtd)
      : [...atual, ...Array.from({length:qtd-atual.length},(_,i)=>novaSemana(atual.length+i+1))];
    setCard({...card, frequencia:f, semanas:novas});
  }

  function addSemana() {
    setCard({...card, semanas:[...card.semanas, novaSemana(card.semanas.length+1)]});
  }

  function setSemana(idx, campo, valor) {
    const s=[...card.semanas]; s[idx]={...s[idx],[campo]:valor};
    setCard({...card,semanas:s});
  }

  async function handleCriar() {
    if (!clienteSel) { alert("Selecione um cliente."); return; }
    setCriando(true);
    await onSubmit(clienteSel, card);
    setCriando(false);
  }

  const inp = {
    border:`1px solid ${RGT.verdeBd}`, borderRadius:6, padding:"8px 10px",
    background:"rgba(255,255,255,0.9)", color:RGT.text, fontFamily:"inherit",
    fontSize:"0.88rem", outline:"none", width:"100%", boxSizing:"border-box",
  };
  const section = {
    background: RGT.cardBg, backdropFilter: RGT.cardBlur,
    WebkitBackdropFilter: RGT.cardBlur, border:`1px solid ${RGT.verdeBd}`,
    borderRadius: RGT.radius, padding:isMobile?"14px":"18px", marginBottom:14,
    boxShadow: RGT.cardShadow,
  };
  const labelG = { fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",
    letterSpacing:"0.08em",color:RGT.verde,marginBottom:5,display:"block" };
  const btnVerde = { background:RGT.verde,color:"#fff",border:"none",borderRadius:8,
    padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit" };
  const btnBranco = { background:"rgba(255,255,255,0.9)",color:RGT.verde,
    border:`2px solid ${RGT.verde}`,borderRadius:8,padding:"10px 20px",
    fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit" };

  return (
    <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",color:RGT.text}}>

      {/* Header */}
      <div style={{...section,display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <LogoRG size={48}/>
        <div>
          <div style={{fontWeight:900,fontSize:"1.15rem",color:RGT.verde}}>Nova Ordem de Serviço</div>
          <div style={{fontSize:"0.72rem",color:RGT.textSub,textTransform:"uppercase",letterSpacing:"0.08em"}}>
            Restaura Glass · Especialista em limpeza de vidros
          </div>
        </div>
      </div>

      {/* Busca de cliente */}
      <div style={section}>
        <span style={labelG}>Cliente *</span>
        <div style={{position:"relative"}}>
          <input style={inp} placeholder="Buscar por nome ou código do cliente..."
            value={busca}
            onChange={e=>{ setBusca(e.target.value); setShowDD(true); if(!e.target.value) setClienteSel(null); }}
            onFocus={()=>setShowDD(true)}/>
          {showDropdown && filtrados.length > 0 && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,
              background:"#fff",border:`1px solid ${RGT.verdeBd}`,borderRadius:8,
              boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:240,overflowY:"auto"}}>
              {filtrados.map(c=>(
                <div key={c.id} onClick={()=>selecionarCliente(c)}
                  style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${RGT.verdeBd}`,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseOver={e=>e.currentTarget.style.background=RGT.verdePale}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontWeight:600,fontSize:"0.88rem"}}>{c.name}</div>
                    {c.address && <div style={{fontSize:"0.75rem",color:RGT.textSub}}>{c.address}</div>}
                  </div>
                  {c.codigo && <span style={{fontSize:"0.72rem",color:RGT.verde,fontWeight:700}}>#{c.codigo}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {clienteSel && (
          <div style={{marginTop:10,padding:"10px 14px",background:"rgba(240,250,244,0.9)",
            border:`1px solid ${RGT.verdeBd}`,borderRadius:8,fontSize:"0.85rem"}}>
            <div style={{fontWeight:700,color:RGT.verde}}>✅ {clienteSel.name}</div>
            {clienteSel.address && <div style={{color:RGT.textSub,marginTop:2}}>{clienteSel.address}</div>}
            {clienteSel.codigo && <div style={{color:RGT.textSub,marginTop:2}}>Código: #{clienteSel.codigo}</div>}
          </div>
        )}
      </div>

      {/* Frequência + Obs + Mês/Ano */}
      <div style={section}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <div>
            <span style={labelG}>Frequência</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["mensal","Mensal"],["quinzenal","Quinzenal"],["semanal","Semanal"],["esporadico","Esporádico"]].map(([k,l])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                  padding:"5px 10px",borderRadius:20,fontSize:"0.8rem",fontWeight:600,
                  background:card.frequencia===k?RGT.verde:"rgba(255,255,255,0.8)",
                  color:card.frequencia===k?"#fff":RGT.text,
                  border:`1px solid ${card.frequencia===k?RGT.verde:RGT.verdeBd}`,transition:"all 0.18s"}}>
                  <input type="radio" name="freq_form" value={k} checked={card.frequencia===k}
                    onChange={()=>setFreq(k)} style={{display:"none"}}/>
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span style={labelG}>Obs / Nº Contrato</span>
            <input style={inp} value={card.obs} placeholder="ex: 125/126"
              onChange={e=>setCard({...card,obs:e.target.value})}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
          <div><span style={labelG}>Mês</span>
            <input style={inp} type="number" min="1" max="12" value={card.mes}
              onChange={e=>setCard({...card,mes:parseInt(e.target.value)||1})}/></div>
          <div><span style={labelG}>Ano</span>
            <input style={inp} type="number" value={card.ano}
              onChange={e=>setCard({...card,ano:parseInt(e.target.value)||2026})}/></div>
        </div>
      </div>

      {/* Dias da semana */}
      <div style={section}>
        <span style={labelG}>Dia fixo da semana</span>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["seg","SEG"],["ter","TER"],["qua","QUA"],["qui","QUI"],["sex","SEX"],["sab","SÁB"]].map(([k,l])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
              padding:"5px 12px",borderRadius:20,fontSize:"0.8rem",fontWeight:700,
              background:card.dias[k]?RGT.verde:"rgba(255,255,255,0.8)",
              color:card.dias[k]?"#fff":RGT.text,
              border:`1px solid ${card.dias[k]?RGT.verde:RGT.verdeBd}`,transition:"all 0.18s"}}>
              <input type="checkbox" checked={!!card.dias[k]}
                onChange={e=>setCard({...card,dias:{...card.dias,[k]:e.target.checked}})}
                style={{display:"none"}}/>
              {l}
            </label>
          ))}
        </div>
      </div>

      {/* Semanas */}
      <div style={section}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={labelG}>Semanas do mês</span>
          <button onClick={addSemana} style={{...btnBranco,padding:"5px 14px",fontSize:"0.78rem"}}>
            + Semana
          </button>
        </div>
        {card.semanas.map((sem,idx)=>(
          <div key={idx} style={{background:"rgba(255,255,255,0.85)",border:`1px solid ${RGT.verdeBd}`,
            borderRadius:8,padding:"10px 12px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:900,fontSize:"1rem",color:RGT.verde,minWidth:80}}>{sem.numero}ª semana</span>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>
                <input type="checkbox" checked={!!sem.int}
                  onChange={e=>setSemana(idx,"int",e.target.checked)}
                  style={{width:14,height:14,accentColor:RGT.verde}}/> Int
              </label>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:"0.78rem",fontWeight:600}}>Hora:</span>
                <input type="time" value={sem.hr} onChange={e=>setSemana(idx,"hr",e.target.value)}
                  style={{...inp,width:100}}/>
              </div>
              <div style={{marginLeft:"auto",fontSize:"0.75rem",color:RGT.textSub,
                background:RGT.verdePale,padding:"4px 10px",borderRadius:6}}>
                📍 Check-in ao abrir O.S
              </div>
            </div>
            <input style={{...inp,fontSize:"0.8rem"}}
              placeholder="Observação da semana..."
              value={sem.observacao} onChange={e=>setSemana(idx,"observacao",e.target.value)}/>
          </div>
        ))}
      </div>

      {/* Botões */}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",flexDirection:isMobile?"column":"row"}}>
        <button onClick={onCancel} style={btnBranco}>Cancelar</button>
        <button onClick={handleCriar} disabled={criando||!clienteSel} style={{...btnVerde,opacity:criando||!clienteSel?0.6:1}}>
          {criando ? "Criando..." : "✅ Criar Ordem de Serviço"}
        </button>
      </div>
    </div>
  );
}

// ── QR SCANNER ───────────────────────────────────────────────────────────────
function QRScanner({ onDetected, onCancel, action, clientCode }) {
  const videoRef  = useRef(null);
  const readerRef = useRef(null);
  const tmrRef    = useRef(null);
  const [mode,setCamMode]    = useState("camera");
  const [camErr,setCamErr]   = useState("");
  const [camReady,setCamRdy] = useState(false);
  const [numInput,setNum]    = useState("");
  const [numErr,setNumErr]   = useState("");
  const [pin,setPin]         = useState(["","","",""]);
  const [pinErr,setPinErr]   = useState("");
  const pinRefs = [useRef(),useRef(),useRef(),useRef()];

  const stopCamera = useCallback(()=>{
    clearTimeout(tmrRef.current);
    if(readerRef.current){try{readerRef.current.reset();}catch{}readerRef.current=null;}
  },[]);

  useEffect(()=>{
    if(mode!=="camera")return;
    let mounted=true; setCamRdy(false); setCamErr("");
    async function start(){
      await new Promise(r=>setTimeout(r,400));
      if(!mounted||!videoRef.current){setCamErr("Câmera não encontrada.");return;}
      try{
        const reader=new BrowserMultiFormatReader(); readerRef.current=reader;
        await reader.decodeFromConstraints(
          {video:{facingMode:{ideal:"environment"}}}, videoRef.current,
          (result)=>{if(result){stopCamera();onDetected(result.getText());}});
        if(mounted)setCamRdy(true);
        tmrRef.current=setTimeout(()=>{if(mounted&&mode==="camera")setCamErr("Não foi possível ler o QR. Tente outro método.");},25000);
      }catch(e){if(mounted)setCamErr(e?.name==="NotAllowedError"?"Permissão negada. Use outro método.":"Câmera indisponível. Use outro método.");}
    }
    start(); return()=>{mounted=false;stopCamera();};
  },[mode]);

  function goMode(m){stopCamera();setNum("");setNumErr("");setPin(["","","",""]);setPinErr("");setCamMode(m);}
  function submitNum(){const v=numInput.trim();if(!v){setNumErr("Digite o código.");return;}if(String(v)===String(clientCode))onDetected(QR_TOKEN);else setNumErr("Código incorreto.");}
  function submitPin(){const v=pin.join("");if(v.length<4){setPinErr("Digite 4 dígitos.");return;}if(String(v)===String(clientCode).slice(-4).padStart(4,"0"))onDetected(QR_TOKEN);else setPinErr("PIN incorreto.");}
  function handlePinDigit(idx,v){const d=v.replace(/\D/g,"").slice(-1);const n=[...pin];n[idx]=d;setPin(n);setPinErr("");if(d&&idx<3)pinRefs[idx+1].current?.focus();}
  function handlePinKey(idx,e){if(e.key==="Backspace"&&!pin[idx]&&idx>0)pinRefs[idx-1].current?.focus();}

  const S={
    wrap:{background:"#0a0f1e",borderRadius:20,padding:"20px 16px",textAlign:"center"},
    badge:{display:"inline-block",padding:"4px 14px",borderRadius:20,fontSize:10,fontWeight:800,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,background:action==="start"?"rgba(79,142,247,0.15)":"rgba(34,197,94,0.15)",color:action==="start"?"#4f8ef7":"#22c55e"},
    sub:{fontSize:12,color:"#475569",marginBottom:12},
    video:{width:"100%",maxHeight:240,objectFit:"cover",borderRadius:12,display:"block",background:"#000"},
    btnG:{width:"100%",padding:"11px 0",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#64748b",fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:8},
    btnY:{width:"100%",padding:"11px 0",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:10,color:"#f59e0b",fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:8},
    btnGrn:{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14,marginTop:10},
    err:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",padding:"8px 12px",borderRadius:8,fontSize:12,margin:"8px 0"},
    inp:{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#e2e8f0",fontSize:18,fontFamily:"inherit",outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:"4px"},
    divider:{display:"flex",alignItems:"center",gap:8,margin:"16px 0"},
    divLine:{flex:1,height:1,background:"rgba(255,255,255,0.06)"},
    divTxt:{fontSize:11,color:"#334155",fontWeight:600},
    pinRow:{display:"flex",gap:10,justifyContent:"center",margin:"16px 0"},
    pinBox:{width:52,height:60,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,color:"#e2e8f0",fontSize:24,fontWeight:700,textAlign:"center",outline:"none",fontFamily:"inherit"},
    tabs:{display:"flex",gap:6,marginBottom:16,justifyContent:"center",flexWrap:"wrap"},
    tab:(active)=>({padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:"1px solid",transition:"all 0.2s",background:active?"rgba(79,142,247,0.15)":"transparent",color:active?"#4f8ef7":"#475569",borderColor:active?"rgba(79,142,247,0.4)":"rgba(255,255,255,0.08)"}),
  };
  const tabs=[{id:"camera",label:"📷 Câmera"},{id:"numeric",label:"🔢 Código"},{id:"pin",label:"🔑 PIN"},{id:"confirm",label:"✓ Confirmar"}];
  return(
    <div style={S.wrap}>
      <div style={S.badge}>{action==="start"?"📍 CHECK-IN · ENTRADA":"✅ CHECK-OUT · SAÍDA"}</div>
      <div style={S.tabs}>{tabs.map(t=><button key={t.id} style={S.tab(mode===t.id)} onClick={()=>goMode(t.id)}>{t.label}</button>)}</div>
      {mode==="camera"&&(<>
        <div style={S.sub}>Aponte para o adesivo QR Code SV Finance</div>
        {camErr&&<div style={S.err}>{camErr}</div>}
        <div style={{position:"relative",marginBottom:8}}>
          <video ref={videoRef} muted playsInline style={{...S.video,opacity:camReady?1:0.4}}/>
          {camReady&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{width:170,height:170,position:"relative"}}>
              {[{top:0,left:0,borderTop:"3px solid #4f8ef7",borderLeft:"3px solid #4f8ef7"},{top:0,right:0,borderTop:"3px solid #4f8ef7",borderRight:"3px solid #4f8ef7"},{bottom:0,left:0,borderBottom:"3px solid #4f8ef7",borderLeft:"3px solid #4f8ef7"},{bottom:0,right:0,borderBottom:"3px solid #4f8ef7",borderRight:"3px solid #4f8ef7"}].map((s,i)=><div key={i} style={{position:"absolute",width:20,height:20,...s}}/>)}
            </div>
          </div>}
        </div>
        {!camReady&&!camErr&&<div style={{color:"#475569",fontSize:12,marginBottom:8}}>Iniciando câmera...</div>}
      </>)}
      {mode==="numeric"&&(<>
        <div style={S.sub}>Digite o código do cliente</div>
        <input style={S.inp} type="number" inputMode="numeric" placeholder="000000" value={numInput} onChange={e=>{setNum(e.target.value);setNumErr("");}} onKeyDown={e=>e.key==="Enter"&&submitNum()} autoFocus/>
        {numErr&&<div style={S.err}>{numErr}</div>}
        <button style={S.btnGrn} onClick={submitNum}>Validar código</button>
      </>)}
      {mode==="pin"&&(<>
        <div style={S.sub}>Digite o PIN de 4 dígitos</div>
        <div style={S.pinRow}>{pin.map((d,idx)=><input key={idx} ref={pinRefs[idx]} style={{...S.pinBox,borderColor:pinErr?"rgba(239,68,68,0.4)":(d?"rgba(79,142,247,0.4)":"rgba(255,255,255,0.12)")}} type="password" inputMode="numeric" maxLength={1} value={d} onChange={e=>handlePinDigit(idx,e.target.value)} onKeyDown={e=>handlePinKey(idx,e)} autoFocus={idx===0}/>)}</div>
        {pinErr&&<div style={S.err}>{pinErr}</div>}
        <button style={S.btnGrn} onClick={submitPin} disabled={pin.join("").length<4}>Validar PIN</button>
      </>)}
      {mode==="confirm"&&(<>
        <div style={{padding:"20px 0 12px"}}>
          <div style={{fontSize:36,marginBottom:8}}>⚠️</div>
          <div style={{color:"#f59e0b",fontWeight:600,fontSize:13,marginBottom:6}}>Confirmar sem validação</div>
          <div style={{color:"#475569",fontSize:12,lineHeight:1.6}}>Use apenas se câmera, código e PIN falharem.<br/>O GPS continuará registrando.</div>
        </div>
        <button style={S.btnY} onClick={()=>{stopCamera();onDetected(QR_TOKEN);}}>⚡ Confirmar mesmo assim</button>
      </>)}
      <div style={S.divider}><div style={S.divLine}/><div style={S.divTxt}>ou</div><div style={S.divLine}/></div>
      <button style={S.btnG} onClick={()=>{stopCamera();onCancel();}}>← Cancelar</button>
    </div>
  );
}

// ── CHECKIN MODAL ─────────────────────────────────────────────────────────────
function CheckinModal({ order, onClose, onSuccess, theme, isGlass, isMobile }) {
  const [step,setStep]     = useState("select_action");
  const [action,setAction] = useState(null);
  const [openChk,setOpenChk]=useState(null);
  const [location,setLoc]  = useState(null);
  const [notes,setNotes]   = useState("");
  const [sending,setSending]=useState(false);
  const [error,setError]   = useState("");
  const [result,setResult] = useState(null);
  const [loadingOpen,setLO]=useState(true);
  const [pinMode,setPinMode]=useState(false);
  const [pinValue,setPinVal]=useState("");
  const [offlineMsg,setOffMsg]=useState("");

  const now=new Date();
  const horaFmt=now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  const dataFmt=now.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});

  useEffect(()=>{
    if(!navigator.geolocation)return;
    const id=navigator.geolocation.watchPosition(p=>setLoc({lat:p.coords.latitude,lon:p.coords.longitude}),()=>{},{timeout:15000,enableHighAccuracy:true,maximumAge:0});
    return()=>navigator.geolocation.clearWatch(id);
  },[]);

  useEffect(()=>{
    async function checkOpen(){
      if(!navigator.onLine){setOpenChk(null);setLO(false);return;}
      try{const res=await fetch(`${API}/checkin/open`,{headers:{Authorization:`Bearer ${token()}`}});const data=await res.json();if(data.open&&String(data.order_id)===String(order.id))setOpenChk(data);else setOpenChk(null);}catch{}finally{setLO(false);}
    }
    checkOpen();const interval=setInterval(checkOpen,10000);return()=>clearInterval(interval);
  },[order.id]);

  function onQRDetected(text){if(text.trim()!==QR_TOKEN){setError("QR Code inválido.");setStep("select_action");return;}setError("");setStep("confirming");}
  function buildBody(){
    const base={lat:location?.lat||null,lon:location?.lon||null,notes:notes||null,qr_token:QR_TOKEN,pin:pinMode?pinValue:null,local_id:uuid()};
    if(action==="start")return{...base,kind:"start",client_id:order.client_id,order_id:order.id};
    return{...base,kind:"finish",checkin_id:openChk?.checkin_id,order_id:order.id};
  }

  async function confirmar(){
    setSending(true);setError("");setOffMsg("");
    const body=buildBody();
    if(!navigator.onLine){
      try{await enqueueCheckin(body);if(action==="start")await setOrderStatusOverlay(order.id,"in_progress");else await setOrderStatusOverlay(order.id,"done");setResult({action,offline:true});setStep("success");setOffMsg("Sem internet — registro salvo e será sincronizado.");onSuccess(result);}
      catch{setError("Não foi possível salvar offline.");}finally{setSending(false);}return;
    }
    try{
      const endpoint=action==="start"?`${API}/checkin/${order.client_id}/start`:`${API}/checkin/${openChk.checkin_id}/finish`;
      const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok){if(data.sem_coordenadas){setPinMode(true);setError("Cliente sem localização. Digite o PIN.");}else setError(data.msg||"Erro ao registrar.");return;}
      setResult({...data,action});setStep("success");onSuccess({...data,action});
    }catch(e){
      try{await enqueueCheckin(body);if(action==="start")await setOrderStatusOverlay(order.id,"in_progress");else await setOrderStatusOverlay(order.id,"done");setResult({action,offline:true});setStep("success");setOffMsg("Conexão instável — salvo offline.");onSuccess({action,offline:true});}
      catch{setError("Erro de conexão: "+(e.message||"verifique sua internet."));}
    }finally{setSending(false);}
  }

  const S={
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:"blur(6px)"},
    card:{width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",background:"#0a0f1e",border:"1px solid rgba(79,142,247,0.15)",borderRadius:24,padding:isMobile?"20px 16px":28,boxShadow:"0 24px 80px rgba(0,0,0,0.7)"},
    osBox:{background:"rgba(79,142,247,0.06)",border:"1px solid rgba(79,142,247,0.15)",borderRadius:12,padding:"10px 14px",marginBottom:16,textAlign:"center"},
    osNum:{color:"#4f8ef7",fontWeight:700,fontSize:"1rem"},
    osClient:{color:"#475569",fontSize:11,marginTop:2},
    btnBlue:{width:"100%",padding:"13px 0",background:"linear-gradient(135deg,#4f8ef7,#6366f1)",border:"none",borderRadius:12,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14,marginBottom:10,boxShadow:"0 4px 20px rgba(79,142,247,0.3)"},
    btnGreen:{width:"100%",padding:"13px 0",background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:12,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14,marginBottom:10},
    btnGhost:{width:"100%",padding:"11px 0",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#64748b",fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13,marginBottom:8},
    err:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:14},
    textarea:{width:"100%",padding:"11px 13px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:14,resize:"none"},
    pinInput:{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:10,color:"#e2e8f0",fontSize:20,fontFamily:"inherit",outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:"6px",marginBottom:12},
    time:{textAlign:"center",marginBottom:14},
    title:{fontWeight:700,fontSize:"1rem",color:"#e2e8f0"},
    close:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#64748b",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:14},
  };

  if(loadingOpen)return(<div style={S.overlay}><div style={S.card}><div style={{textAlign:"center",padding:"40px 0",color:"#475569"}}>Verificando check-in aberto...</div></div></div>);

  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={S.title}>📍 Registro de Serviço</div>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>
        <div style={S.osBox}>
          <div style={S.osNum}>{order.number}</div>
          <div style={S.osClient}>{order.client_name}</div>
        </div>

        {step==="select_action"&&(<>
          <div style={S.time}>
            <div style={{fontSize:"1.8rem",fontWeight:700,color:"#e2e8f0",letterSpacing:"-1px"}}>{horaFmt}</div>
            <div style={{fontSize:12,color:"#475569",textTransform:"capitalize"}}>{dataFmt}</div>
          </div>
          {!navigator.onLine&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",color:"#f59e0b",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:12,textAlign:"center"}}>📴 Offline — registro será sincronizado depois.</div>}
          {error&&<div style={S.err}>⚠️ {error}</div>}
          {openChk?(<>
            <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
              <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>⏱️ Serviço em andamento</div>
              <div style={{color:"#64748b",fontSize:12,marginTop:4}}>Entrada às {openChk.checkin_at?.slice(11,16)}</div>
            </div>
            <button style={S.btnGreen} onClick={()=>{setAction("finish");setStep("scanning");}}>✅ Finalizar serviço — Escanear QR</button>
          </>):(
            <button style={S.btnBlue} onClick={()=>{setAction("start");setStep("scanning");}}>📍 Iniciar serviço — Escanear QR</button>
          )}
          <button style={S.btnGhost} onClick={onClose}>← Fechar</button>
        </>)}

        {step==="scanning"&&<QRScanner action={action} clientCode={order.client_id} onDetected={onQRDetected} onCancel={()=>setStep("select_action")}/>}

        {step==="confirming"&&(<>
          <div style={S.time}>
            <span style={{display:"inline-block",padding:"4px 14px",borderRadius:20,fontSize:10,fontWeight:800,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8,background:action==="start"?"rgba(79,142,247,0.15)":"rgba(34,197,94,0.15)",color:action==="start"?"#4f8ef7":"#22c55e"}}>
              {action==="start"?"📍 CHECK-IN · ENTRADA":"✅ CHECK-OUT · SAÍDA"}
            </span>
            <div style={{fontSize:"1.8rem",fontWeight:700,color:"#e2e8f0",letterSpacing:"-1px"}}>{horaFmt}</div>
            <div style={{fontSize:12,color:"#475569",textTransform:"capitalize"}}>{dataFmt}</div>
          </div>
          {action==="finish"&&openChk&&<div style={{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#4ade80",textAlign:"center"}}>Entrada às {openChk.checkin_at?.slice(11,16)}</div>}
          <textarea style={S.textarea} rows={2} placeholder={action==="start"?"Observação de entrada (opcional)":"Observação de saída (opcional)"} value={notes} onChange={e=>setNotes(e.target.value)}/>
          {pinMode&&<div style={{marginBottom:14}}><div style={{color:"#f59e0b",fontSize:12,fontWeight:600,marginBottom:6,textAlign:"center"}}>🔑 PIN do encarregado</div><input style={S.pinInput} type="number" inputMode="numeric" placeholder="000000" value={pinValue} onChange={e=>setPinVal(e.target.value.slice(0,6))} autoFocus/></div>}
          <div style={{fontSize:12,marginBottom:14,padding:"8px 12px",borderRadius:8,background:location?"rgba(34,197,94,0.08)":"rgba(245,158,11,0.08)",border:`1px solid ${location?"rgba(34,197,94,0.2)":"rgba(245,158,11,0.2)"}`,color:location?"#4ade80":"#f59e0b"}}>
            {location?`📍 GPS ativo — lat: ${location.lat.toFixed(5)}`:"⏳ Aguardando GPS..."}
          </div>
          {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",padding:"12px 16px",borderRadius:10,fontSize:13,marginBottom:14}}><div style={{fontWeight:700,marginBottom:4}}>⚠️ Atenção</div><div>{error}</div>{!pinMode&&<button style={{marginTop:10,width:"100%",padding:"8px 0",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#f87171",fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:12}} onClick={()=>{setError("");setStep("scanning");}}>← Tentar novamente</button>}</div>}
          {(!error||pinMode)&&(<>
            <button style={{...(action==="start"?S.btnBlue:S.btnGreen),opacity:(sending||!location)?0.6:1,cursor:(sending||!location)?"not-allowed":"pointer"}} onClick={confirmar} disabled={sending||!location||(pinMode&&pinValue.length<4)}>
              {sending?"Registrando...":!location?"Aguardando GPS...":pinMode?"✓ Validar PIN":action==="start"?"✓ Confirmar entrada":"✓ Confirmar saída"}
            </button>
            {!pinMode&&<button style={S.btnGhost} onClick={()=>setStep("scanning")} disabled={sending}>← Escanear novamente</button>}
          </>)}
        </>)}

        {step==="success"&&(
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:52,marginBottom:12}}>{result?.offline?"⏳":result?.action==="start"?"📍":"✅"}</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,marginBottom:6,color:result?.offline?"#f59e0b":result?.action==="start"?"#4f8ef7":"#22c55e"}}>
              {result?.offline?"Registro salvo!":result?.action==="start"?"Check-in registrado!":"Serviço concluído!"}
            </div>
            {offlineMsg&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 14px",margin:"12px auto",fontSize:12,color:"#f59e0b"}}>{offlineMsg}</div>}
            {!result?.offline&&result?.action==="finish"&&result?.duration_str&&(
              <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:14,padding:"14px 20px",margin:"14px auto",display:"inline-block"}}>
                <div style={{color:"#475569",fontSize:11,marginBottom:2}}>Duração</div>
                <div style={{color:"#22c55e",fontSize:"1.7rem",fontWeight:800}}>{result.duration_str}</div>
              </div>
            )}
            <div style={{color:"#475569",fontSize:12,marginTop:8}}>{dataFmt} às {horaFmt}</div>
            <button style={S.btnGhost} onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Orders() {
  const { theme, themeId } = useTheme();
  const isGlass    = themeId === "glass";
  const colorScheme= isGlass ? "light" : "dark";
  const isMobile   = useIsMobile();
  const navigate   = useNavigate();
  const rg         = isRG();

  const [sidebarOpen,   setSidebarOpen]  = useState(false);
  const [orders,        setOrders]       = useState([]);
  const [overlays,      setOverlays]     = useState({});
  const [clients,       setClients]      = useState([]);
  const [products,      setProducts]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [view,          setView]         = useState("list");
  const [editing,       setEditing]      = useState(null);
  const [form,          setForm]         = useState(EMPTY_FORM);
  const [items,         setItems]        = useState([]);
  const [deleteConfirm, setDeleteConfirm]= useState(null);
  const [toast,         setToast]        = useState(null);
  const [filterStatus,  setFilterStatus] = useState("all");
  const [search,        setSearch]       = useState("");
  const [checkinOrder,  setCheckinOrder] = useState(null);
  const [detailOrder,   setDetailOrder]  = useState(null);
  const [orderCheckins, setOrderCheckins]= useState([]);
  const [loadingChk,    setLoadingChk]   = useState(false);

  // Para check-in por semana dentro do cartão RG
  const [checkinSemana, setCheckinSemana]= useState(null); // { order, semanaIdx, action }

  const pollingRef = useRef(null);

  const CACHE_TTL = 60000;
  function cacheGet(k){try{const r=sessionStorage.getItem(k);if(!r)return null;const{data,ts}=JSON.parse(r);if(Date.now()-ts>CACHE_TTL){sessionStorage.removeItem(k);return null;}return data;}catch{return null;}}
  function cacheSet(k,d){try{sessionStorage.setItem(k,JSON.stringify({data:d,ts:Date.now()}));}catch{}}
  function cacheInvalidate(k){try{sessionStorage.removeItem(k);}catch{}}

  async function loadOverlays(){try{setOverlays(await getOrderOverlays());}catch{setOverlays({});}}

  async function fetchOrders(){
    try{const res=await fetch(`${API}/orders`,{headers:{Authorization:`Bearer ${token()}`}});if(res.status===401){localStorage.removeItem("token");navigate("/");return;}const data=await res.json();const list=Array.isArray(data)?data:[];setOrders(list);cacheSet("sv_orders",list);}catch{}
    await loadOverlays();
  }

  async function fetchAll(){
    setLoading(true);
    const co=cacheGet("sv_orders"),cc=cacheGet("sv_clients"),cp=cacheGet("sv_products");
    if(co)setOrders(co);if(cc)setClients(cc);if(cp)setProducts(cp);
    if(co&&cc&&cp)setLoading(false);
    await loadOverlays();
    if(!navigator.onLine){setLoading(false);return;}
    try{
      const h={Authorization:`Bearer ${token()}`};
      const resO=await fetch(`${API}/orders`,{headers:h});
      if(resO.status===401){localStorage.removeItem("token");navigate("/");return;}
      const dataO=await resO.json();const ords=Array.isArray(dataO)?dataO:[];setOrders(ords);cacheSet("sv_orders",ords);
      try{const r=await fetch(`${API}/clients`,{headers:h});const d=await r.json();const c=Array.isArray(d)?d:[];setClients(c);cacheSet("sv_clients",c);}catch{}
      try{const r=await fetch(`${API}/products`,{headers:h});const d=await r.json();const p=Array.isArray(d)?d:[];setProducts(p);cacheSet("sv_products",p);}catch{}
    }catch{showToast("Erro ao carregar ordens.","error");}finally{setLoading(false);}
  }

  async function fetchOrderCheckins(orderId){
    setLoadingChk(true);
    try{const res=await fetch(`${API}/orders/${orderId}/checkins`,{headers:{Authorization:`Bearer ${token()}`}});const data=await res.json();setOrderCheckins(Array.isArray(data)?data:[]);}catch{setOrderCheckins([]);}finally{setLoadingChk(false);}
  }

  useEffect(()=>{
    fetchAll();
    pollingRef.current=setInterval(fetchOrders,15000);
    const onOnline=()=>{syncNow().then(()=>fetchOrders());};
    window.addEventListener("online",onOnline);
    window.addEventListener("sv_synced",fetchOrders);
    return()=>{clearInterval(pollingRef.current);window.removeEventListener("online",onOnline);window.removeEventListener("sv_synced",fetchOrders);};
  },[]);

  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3500);}
  function effectiveStatus(o){return overlays[String(o.id)]||o.status;}

  // ── CRIAR O.S (RG) ──────────────────────────────────────────────────────────
  async function handleCriarRG(cliente, cardData) {
    if(!navigator.onLine){showToast("Criar O.S precisa de internet.","warn");return;}
    const payload={
      client_id: parseInt(cliente.id),
      status:"open", notes: cardData.obs || "",
      payment_terms:"", discount:0, items:[],
    };
    try{
      const res=await fetch(`${API}/orders`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(payload)});
      if(res.ok){
        const data=await res.json();
        // Salvar cartão associado
        if(data.id){
          try{
            await fetch(`${API}/limpeza/card/${data.id}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify({card:cardData})});
          }catch{}
          localStorage.setItem(`sv_rg_card_${data.id}`,JSON.stringify(cardData));
        }
        cacheInvalidate("sv_orders");showToast("O.S criada!");setView("list");fetchAll();
      }else{const err=await res.json();showToast(err.msg||"Erro ao criar O.S.","error");}
    }catch{showToast("Erro de conexão.","error");}
  }

  // ── SUBMIT FORM PADRÃO (não-RG) ──────────────────────────────────────────────
  function addItem(){setItems(p=>[...p,{product_id:"",name:"",unit:"un",qty:1,price:0,total:0}]);}
  function removeItem(idx){setItems(p=>p.filter((_,i)=>i!==idx));}
  function updateItem(idx,fld,value){setItems(p=>{const n=[...p];n[idx]={...n[idx],[fld]:value};if(fld==="qty"||fld==="price")n[idx].total=parseFloat(n[idx].qty||0)*parseFloat(n[idx].price||0);return n;});}
  function selectProduct(idx,pid){const p=products.find(p=>String(p.id)===String(pid));if(!p)return;setItems(prev=>{const n=[...prev];n[idx]={...n[idx],product_id:p.id,name:p.name,unit:p.unit||"un",price:p.price,total:parseFloat(n[idx].qty||1)*p.price};return n;});}

  const subtotal=items.reduce((s,i)=>s+parseFloat(i.qty||0)*parseFloat(i.price||0),0);
  const discountAmt=subtotal*(parseFloat(form.discount||0)/100);
  const total=subtotal-discountAmt;

  async function handleSubmit(e){
    e.preventDefault();
    if(!form.client_id){showToast("Selecione um cliente.","error");return;}
    if(!navigator.onLine){showToast("Criar O.S precisa de internet.","warn");return;}
    const payload={...form,client_id:parseInt(form.client_id),discount:parseFloat(form.discount||0),items};
    const url=editing?`${API}/orders/${editing.id}`:`${API}/orders`;
    const method=editing?"PUT":"POST";
    try{const res=await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(payload)});if(res.ok){cacheInvalidate("sv_orders");showToast(editing?"O.S atualizada!":"O.S criada!");setView("list");fetchAll();}else{const err=await res.json();showToast(err.msg||"Erro.","error");}}catch{showToast("Erro de conexão.","error");}
  }

  async function changeStatus(o,status){
    if(!navigator.onLine){showToast("Mudar status precisa de internet.","warn");return;}
    try{await fetch(`${API}/orders/${o.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify({status})});cacheInvalidate("sv_orders");fetchOrders();}catch{showToast("Erro ao alterar status.","error");}
  }

  async function handleDelete(id){
    if(!navigator.onLine){showToast("Exclusão precisa de internet.","warn");setDeleteConfirm(null);return;}
    try{const res=await fetch(`${API}/orders/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}});if(res.ok){showToast("O.S removida.");setDeleteConfirm(null);cacheInvalidate("sv_orders");fetchAll();}else showToast("Erro ao remover.","error");}catch{showToast("Erro de conexão.","error");}
  }

  function openDetailOrder(o){setDetailOrder(o);fetchOrderCheckins(o.id);}

  const filtered=orders.filter(o=>{
    const st=effectiveStatus(o);
    return (filterStatus==="all"||st===filterStatus)&&
      (o.number.toLowerCase().includes(search.toLowerCase())||o.client_name.toLowerCase().includes(search.toLowerCase()));
  });
  const countBy=(s)=>orders.filter(o=>effectiveStatus(o)===s).length;

  // ── ESTILOS PADRÃO (não-RG) ──────────────────────────────────────────────────
  const inputStyle={background:theme.bgInput,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`,borderRadius:10,padding:"10px 14px",color:theme.textPrimary,fontSize:"0.9rem",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s",colorScheme,...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"})};
  const selectStyle={...inputStyle,cursor:"pointer"};
  const modalBg=isGlass?{backdropFilter:"blur(18px) saturate(180%)",WebkitBackdropFilter:"blur(18px) saturate(180%)",background:"rgba(255,255,255,0.55)",border:"1px solid rgba(255,255,255,0.6)"}:{background:theme.bgModal,border:`1px solid ${theme.borderCard}`};
  const btnPrimary={background:theme.primaryGrad,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:600,cursor:"pointer",fontSize:"0.9rem",boxShadow:`0 4px 15px ${theme.primary}33`};
  const btnSecondary={background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard,color:theme.textSecondary,border:`1px solid ${isGlass?"rgba(255,255,255,0.5)":theme.borderCard}`,borderRadius:10,padding:"10px 20px",fontWeight:600,cursor:"pointer",fontSize:"0.9rem"};
  const formCard={background:isGlass?"rgba(255,255,255,0.2)":theme.bgCard,border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,borderRadius:14,padding:24,marginBottom:24,...(isGlass&&{backdropFilter:"blur(18px) saturate(180%)",WebkitBackdropFilter:"blur(18px) saturate(180%)"})};
  const sectionLabel={fontSize:"11px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:theme.textMuted,margin:"0 0 14px 2px"};
  const fieldStyle={display:"flex",flexDirection:"column",gap:6};
  const labelStyle={color:theme.textSecondary,fontSize:"0.8rem",fontWeight:600};

  // ── FORM VIEW ────────────────────────────────────────────────────────────────
  if (view === "form") {
    if (rg) return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
        <div style={{flex:1,padding:isMobile?"72px 16px 40px":"32px 36px",overflowY:"auto",
          background:RGT.pageBg,minHeight:"100vh"}}>
          <div style={{marginBottom:20}}>
            <button style={{background:"rgba(255,255,255,0.8)",border:`1px solid ${RGT.verdeBd}`,
              borderRadius:8,padding:"7px 16px",fontWeight:600,cursor:"pointer",
              color:RGT.verde,fontSize:"0.85rem",marginBottom:12}}
              onClick={()=>setView("list")}>← Voltar</button>
          </div>
          <div style={{maxWidth:680,margin:"0 auto"}}>
            <RestauraGlassCardForm clients={clients} isMobile={isMobile}
              onCancel={()=>setView("list")} onSubmit={handleCriarRG}/>
          </div>
        </div>
      </PageLayout>
    );

    return (
      <PageLayout>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
        <div style={{flex:1,padding:isMobile?"72px 16px 40px":"32px 36px",overflowY:"auto",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <button style={{...btnSecondary,marginBottom:12,fontSize:"0.82rem"}} onClick={()=>setView("list")}>← Voltar</button>
            <h1 style={{fontSize:isMobile?"1.3rem":"1.75rem",fontWeight:700,margin:0,color:theme.textPrimary}}>
              {editing?`Editar O.S — ${editing.number}`:"Nova Ordem de Serviço"}
            </h1>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formCard}>
              <p style={sectionLabel}>📋 Dados da O.S</p>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:16}}>
                <div style={{...fieldStyle,gridColumn:isMobile?"1":"1 / -1"}}>
                  <label style={labelStyle}>Cliente *</label>
                  <select style={selectStyle} required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                    <option value="">— Selecione o cliente —</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}><label style={labelStyle}>Status</label>
                  <select style={selectStyle} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}><label style={labelStyle}>Desconto (%)</label>
                  <input style={inputStyle} type="number" min="0" max="100" step="0.1" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}/></div>
                <div style={fieldStyle}><label style={labelStyle}>Pagamento</label>
                  <input style={inputStyle} placeholder="Ex: Pix no ato" value={form.payment_terms} onChange={e=>setForm({...form,payment_terms:e.target.value})}/></div>
                <div style={{...fieldStyle,gridColumn:isMobile?"1":"1 / -1"}}><label style={labelStyle}>Observações</label>
                  <textarea style={{...inputStyle,resize:"vertical",minHeight:70}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
              </div>
            </div>
            <div style={formCard}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <p style={{...sectionLabel,marginBottom:0}}>📦 Itens</p>
                <button type="button" style={{...btnSecondary,fontSize:"0.82rem",padding:"7px 14px"}} onClick={addItem}>+ Adicionar Item</button>
              </div>
              {items.length===0?<div style={{textAlign:"center",color:theme.textMuted,padding:"32px 0"}}>Nenhum item. Clique em "+ Adicionar Item".</div>:(
                <>
                  {items.map((item,idx)=>(
                    <div key={idx} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 1fr 1fr 1.5fr 1.5fr 36px",gap:10,marginBottom:16,padding:isMobile?"16px":"0"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        <select style={{...selectStyle,marginBottom:4}} value={item.product_id||""} onChange={e=>selectProduct(idx,e.target.value)}><option value="">— Selecione —</option>{products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}</select>
                        <input style={{...inputStyle,fontSize:"0.8rem"}} placeholder="Ou descreva manualmente" value={item.name} onChange={e=>updateItem(idx,"name",e.target.value)}/>
                      </div>
                      <div><input style={inputStyle} value={item.unit} onChange={e=>updateItem(idx,"unit",e.target.value)}/></div>
                      <div><input style={inputStyle} type="number" min="1" step="0.01" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)}/></div>
                      <div><input style={inputStyle} type="number" min="0" step="0.01" value={item.price} onChange={e=>updateItem(idx,"price",e.target.value)}/></div>
                      <div style={{display:"flex",alignItems:"center",color:theme.income,fontWeight:700}}>{fmt(parseFloat(item.qty||0)*parseFloat(item.price||0))}</div>
                      <button type="button" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,cursor:"pointer",color:"#ef4444",width:36,height:36}} onClick={()=>removeItem(idx)}>✕</button>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${theme.borderCard}`,marginTop:8,paddingTop:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:theme.textSecondary}}>Subtotal</span><span>{fmt(subtotal)}</span></div>
                    {parseFloat(form.discount)>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#ef4444"}}><span>Desconto ({form.discount}%)</span><span>- {fmt(discountAmt)}</span></div>}
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"1.2rem",fontWeight:700,color:theme.primary,borderTop:`1px solid ${theme.borderCard}`,paddingTop:12,marginTop:4}}><span>TOTAL</span><span>{fmt(total)}</span></div>
                  </div>
                </>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginBottom:48,flexDirection:isMobile?"column":"row"}}>
              <button type="button" style={{...btnSecondary,width:isMobile?"100%":"auto"}} onClick={()=>setView("list")}>Cancelar</button>
              <button type="submit" style={{...btnPrimary,width:isMobile?"100%":"auto"}}>{editing?"Salvar Alterações":"Criar O.S"}</button>
            </div>
          </form>
        </div>
        {toast&&<div style={{position:"fixed",bottom:28,right:28,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:600,fontSize:"0.9rem",zIndex:9999,background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":theme.primaryGrad}}>{toast.msg}</div>}
      </PageLayout>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <style>{`
        .card3d-os{background:${"`"}${"{"}rg?RGT.cardBg:(isGlass?"rgba(255,255,255,0.22)":theme.bgCard)${"}"}`+"`"+`;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(18px);transition:transform 0.35s ease,box-shadow 0.35s ease;transform:perspective(700px) rotateX(5deg) rotateY(-3deg);box-shadow:0 20px 48px rgba(0,0,0,0.15);position:relative;overflow:hidden;cursor:default;}
        .card3d-os:hover{transform:perspective(700px) rotateX(0) rotateY(0) translateZ(20px) translateY(-10px);}
        .table3d-os{background:rgba(255,255,255,0.7);border:1px solid rgba(26,138,60,0.2);border-radius:16px;overflow-x:auto;-webkit-overflow-scrolling:touch;backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);}
        .os-row:hover{background:rgba(26,138,60,0.05)!important;}
        @media(max-width:768px){.card3d-os{transform:none!important;}.card3d-os:hover{transform:translateY(-6px)!important;}}
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
      <div style={{flex:1,padding:isMobile?"72px 16px 40px":"32px 36px",overflowY:"auto",position:"relative",zIndex:1,background:rg?RGT.pageBg:"transparent",minHeight:rg?"100vh":"auto"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {rg?<LogoRG size={isMobile?44:56}/>:<img src={logoGif} alt="logo" style={{width:isMobile?44:60,height:isMobile?44:60,objectFit:"contain"}}/>}
            <div>
              <h1 style={{fontSize:isMobile?"20px":"1.75rem",fontWeight:700,margin:0,color:rg?RGT.verde:theme.textPrimary}}>{rg?"Ordens de Serviço":"Pedidos / O.S"}</h1>
              <p style={{color:rg?RGT.textSub:theme.textMuted,margin:"4px 0 0",fontSize:"0.85rem"}}>{rg?"Restaura Glass · Limpeza de vidros":"Gerencie suas ordens de serviço"}</p>
            </div>
          </div>
          <button style={rg?{background:RGT.verde,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:"0.9rem"}:{...btnPrimary,whiteSpace:"nowrap"}}
            onClick={()=>{setEditing(null);setForm(EMPTY_FORM);setItems([]);setView("form");}}>
            + Nova O.S
          </button>
        </div>

        {!navigator.onLine&&<div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",padding:"10px 16px",borderRadius:10,fontSize:13,marginBottom:20}}>📴 Offline — check-ins salvos, sincroniza ao reconectar.</div>}

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:16,marginBottom:28}}>
          {[
            {icon:"📋",label:"Total",value:orders.length,color:rg?RGT.verde:theme.primary,border:rg?RGT.verdeBd:`${theme.primary}44`},
            {icon:"🔵",label:"Abertas",value:countBy("open"),color:"#3b82f6",border:"rgba(59,130,246,0.3)"},
            {icon:"🟡",label:"Em andamento",value:countBy("in_progress"),color:"#f59e0b",border:"rgba(245,158,11,0.3)"},
            {icon:"✅",label:"Concluídas",value:countBy("done"),color:"#22c55e",border:"rgba(34,197,94,0.3)"},
          ].map((c,i)=>(
            <div key={i} className="card3d-os" style={{border:`1px solid ${c.border}`}}>
              <div style={{fontSize:"1.5rem"}}>{c.icon}</div>
              <div>
                <div style={{color:rg?RGT.textSub:theme.textMuted,fontSize:"0.75rem",marginBottom:2}}>{c.label}</div>
                <div style={{color:c.color,fontWeight:700,fontSize:isMobile?"1rem":"1.15rem"}}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
          <input style={{...inputStyle,...(rg&&{background:"rgba(255,255,255,0.85)",border:`1px solid ${RGT.verdeBd}`,color:RGT.text}),width:isMobile?"100%":"280px"}} type="text" placeholder="🔍 Buscar por número ou cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["all",...Object.keys(STATUS_MAP)].map(s=>(
              <button key={s} style={{background:filterStatus===s?(rg?`${RGT.verde}22`:`${theme.primary}33`):"rgba(255,255,255,0.75)",color:filterStatus===s?(rg?RGT.verde:theme.textActive):(rg?RGT.textSub:theme.textMuted),border:filterStatus===s?`1px solid ${rg?RGT.verde:theme.primary}`:`1px solid ${rg?RGT.verdeBd:theme.borderCard}`,borderRadius:8,padding:"6px 14px",fontSize:"0.82rem",cursor:"pointer"}} onClick={()=>setFilterStatus(s)}>
                {s==="all"?"Todos":STATUS_MAP[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="table3d-os">
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0",color:rg?RGT.textSub:theme.textMuted}}>Carregando...</div>
          ):filtered.length===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 0",gap:12,color:rg?RGT.textSub:theme.textMuted}}>
              <span style={{fontSize:"2rem"}}>📋</span>
              <p>{search?"Nenhuma O.S encontrada":"Nenhuma O.S cadastrada ainda"}</p>
            </div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem",minWidth:isMobile?"580px":"unset"}}>
              <thead>
                <tr>
                  {(isMobile?["Número","Cliente","Status","Check-in","Ações"]:["Número","Cliente","Origem","Total","Criado em","Status","Check-in","Ações"]).map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"12px 16px",color:rg?RGT.textSub:theme.textMuted,fontWeight:600,fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.05em",background:rg?"rgba(255,255,255,0.5)":"transparent",borderBottom:`1px solid ${rg?RGT.verdeBd:theme.borderCard}`,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=>{
                  const effStatus=effectiveStatus(o);
                  const st=STATUS_MAP[effStatus]||STATUS_MAP.open;
                  const isOverlay=!!overlays[String(o.id)];
                  const podeCheckin=effStatus==="open"||effStatus==="in_progress";
                  return(
                    <tr key={o.id} className="os-row" style={{borderBottom:`1px solid ${rg?RGT.verdeBd:theme.border}`,transition:"background 0.15s"}}>
                      <td style={{padding:"12px 16px",verticalAlign:"middle"}}>
                        <button style={{background:"none",border:"none",fontWeight:700,color:rg?RGT.verde:theme.primary,cursor:"pointer",fontSize:"0.88rem",padding:0,textDecoration:"underline"}} onClick={()=>openDetailOrder(o)}>{o.number}</button>
                      </td>
                      <td style={{padding:"12px 16px",verticalAlign:"middle"}}>
                        <div style={{fontWeight:600,color:rg?RGT.text:theme.textPrimary}}>{o.client_name}</div>
                      </td>
                      {!isMobile&&<td style={{padding:"12px 16px",verticalAlign:"middle"}}><span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:"0.72rem",fontWeight:600,background:rg?RGT.verdePale:`${theme.primary}22`,color:rg?RGT.verde:theme.primary}}>{o.origin==="quote"?"🧾 Orçamento":"✏️ Direta"}</span></td>}
                      {!isMobile&&<td style={{padding:"12px 16px",verticalAlign:"middle",fontWeight:700,color:rg?RGT.verde:theme.income}}>{fmt(o.total)}</td>}
                      {!isMobile&&<td style={{padding:"12px 16px",verticalAlign:"middle",color:rg?RGT.textSub:theme.textMuted}}>{fmtDate(o.created_at)}</td>}
                      <td style={{padding:"12px 16px",verticalAlign:"middle"}}>
                        {isOverlay?(
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,fontSize:"0.72rem",fontWeight:600,color:st.color,background:st.bg}}>{st.label} <span style={{fontSize:9}}>⏳</span></span>
                        ):(
                          <select style={{border:"none",borderRadius:20,padding:"4px 10px",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",outline:"none",color:st.color,background:st.bg}} value={o.status} onChange={e=>changeStatus(o,e.target.value)}>
                            {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{padding:"12px 16px",verticalAlign:"middle"}}>
                        {podeCheckin?(
                          <button style={{background:effStatus==="in_progress"?"rgba(34,197,94,0.12)":(rg?`${RGT.verde}15`:"rgba(79,142,247,0.12)"),border:`1px solid ${effStatus==="in_progress"?"rgba(34,197,94,0.3)":(rg?RGT.verdeBd:"rgba(79,142,247,0.3)")}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,color:effStatus==="in_progress"?"#22c55e":(rg?RGT.verde:"#4f8ef7"),whiteSpace:"nowrap"}}
                            onClick={()=>setCheckinOrder(o)}>
                            {effStatus==="in_progress"?"✅ Finalizar":"📍 Check-in"}
                          </button>
                        ):<span style={{fontSize:"0.75rem",color:rg?RGT.textSub:theme.textMuted}}>—</span>}
                      </td>
                      <td style={{padding:"12px 16px",verticalAlign:"middle"}}>
                        <div style={{display:"flex",gap:6}}>
                          <button style={{background:rg?"rgba(255,255,255,0.8)":`${theme.primary}22`,border:`1px solid ${rg?RGT.verdeBd:`${theme.primary}44`}`,borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:"0.9rem"}} onClick={()=>{if(!rg){setEditing(o);setForm({client_id:o.client_id,status:o.status,notes:o.notes||"",payment_terms:o.payment_terms||"",discount:o.discount||0});setItems(o.items||[]);setView("form");}else openDetailOrder(o);}}>✏️</button>
                          <button style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:"0.9rem"}} onClick={()=>setDeleteConfirm(o)}>🗑️</button>
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

      {checkinOrder&&<CheckinModal order={checkinOrder} isGlass={isGlass} isMobile={isMobile} theme={theme} onClose={()=>setCheckinOrder(null)} onSuccess={()=>{cacheInvalidate("sv_orders");loadOverlays();fetchOrders();showToast("Registro salvo!");setTimeout(()=>setCheckinOrder(null),1500);}}/>}

      {checkinSemana&&<CheckinModal order={checkinSemana.order} isGlass={isGlass} isMobile={isMobile} theme={theme} onClose={()=>setCheckinSemana(null)} onSuccess={(result)=>{cacheInvalidate("sv_orders");loadOverlays();fetchOrders();showToast(result?.action==="start"?"Check-in registrado!":"Serviço concluído!");setCheckinSemana(null);}}/>}

      {detailOrder&&rg&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:999,backdropFilter:"blur(6px)",padding:isMobile?"8px":"24px",overflowY:"auto"}} onClick={()=>setDetailOrder(null)}>
          <div style={{width:"100%",maxWidth:700,background:RGT.pageBg,borderRadius:20,padding:isMobile?"16px":"24px",margin:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center"}}>
              <div style={{fontSize:"0.75rem",color:RGT.textSub}}>Toque fora para fechar</div>
              <button style={{background:"rgba(255,255,255,0.8)",border:`1px solid ${RGT.verdeBd}`,borderRadius:8,padding:"6px 14px",fontWeight:600,cursor:"pointer",color:RGT.verde,fontSize:"0.82rem"}} onClick={()=>setDetailOrder(null)}>✕ Fechar</button>
            </div>
            <RestauraGlassCard order={detailOrder} theme={theme} isMobile={isMobile}
              onCheckinClick={(idx,action)=>setCheckinSemana({order:detailOrder,semanaIdx:idx,action})}
              checkinSemanaIdx={checkinSemana?.semanaIdx}/>
          </div>
        </div>
      )}

      {detailOrder&&!rg&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(4px)",padding:16}} onClick={()=>setDetailOrder(null)}>
          <div style={{...modalBg,borderRadius:20,padding:isMobile?"20px 16px":28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontWeight:700,fontSize:"1.1rem",color:theme.textPrimary}}>{detailOrder.number}</div>
                <div style={{fontSize:12,color:theme.textMuted}}>{detailOrder.client_name}</div>
              </div>
              <button style={{background:theme.bgCard,border:"none",color:theme.textPrimary,width:32,height:32,borderRadius:8,cursor:"pointer"}} onClick={()=>setDetailOrder(null)}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[{label:"Status",value:STATUS_MAP[effectiveStatus(detailOrder)]?.label},{label:"Total",value:fmt(detailOrder.total)},{label:"Criado em",value:fmtDate(detailOrder.created_at)},{label:"Concluído",value:fmtDate(detailOrder.finished_at)}].map((f,i)=>(
                <div key={i} style={{background:theme.bgCard,border:`1px solid ${theme.borderCard}`,borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:theme.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{f.label}</div>
                  <div style={{fontSize:"0.9rem",fontWeight:600,color:theme.textPrimary}}>{f.value||"—"}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:theme.textMuted,marginBottom:12}}>📍 Registros ({orderCheckins.length})</div>
            {loadingChk?<div style={{color:theme.textMuted,textAlign:"center",padding:20}}>Carregando...</div>
            :orderCheckins.length===0?<div style={{color:theme.textMuted,textAlign:"center",padding:20}}>Nenhum registro ainda.</div>
            :orderCheckins.map((chk,i)=>(
              <div key={i} style={{background:theme.bgCard,border:`1px solid ${theme.borderCard}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><div style={{fontSize:12,color:theme.textMuted}}>Colaborador</div><div style={{fontWeight:600,color:theme.textPrimary}}>{chk.user_name||"—"}</div></div>
                  {chk.duration_str&&<div style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8,padding:"4px 12px",textAlign:"center"}}><div style={{fontSize:10,color:"#64748b"}}>Duração</div><div style={{fontWeight:700,color:"#22c55e"}}>{chk.duration_str}</div></div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  <div><div style={{color:theme.textMuted}}>📍 Entrada</div><div style={{fontWeight:600,color:theme.textPrimary}}>{chk.checkin_at?chk.checkin_at.replace("T"," ").slice(0,16):"—"}</div></div>
                  <div><div style={{color:theme.textMuted}}>🏁 Saída</div><div style={{fontWeight:600,color:theme.textPrimary}}>{chk.checkout_at?chk.checkout_at.replace("T"," ").slice(0,16):"Em andamento..."}</div></div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:16}}>
              <button style={btnSecondary} onClick={()=>setDetailOrder(null)}>Fechar</button>
              {(effectiveStatus(detailOrder)==="open"||effectiveStatus(detailOrder)==="in_progress")&&<button style={btnPrimary} onClick={()=>{setDetailOrder(null);setCheckinOrder(detailOrder);}}>{effectiveStatus(detailOrder)==="in_progress"?"✅ Finalizar":"📍 Check-in"}</button>}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(4px)"}} onClick={()=>setDeleteConfirm(null)}>
          <div style={{background:rg?RGT.cardBg:theme.bgModal,border:"1px solid rgba(239,68,68,0.3)",backdropFilter:rg?RGT.cardBlur:"none",WebkitBackdropFilter:rg?RGT.cardBlur:"none",borderRadius:18,padding:isMobile?"24px 20px":32,width:isMobile?"92%":"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <h2 style={{margin:"0 0 12px",fontSize:"1.1rem",fontWeight:700,color:"#ef4444"}}>Excluir O.S</h2>
            <p style={{color:rg?RGT.textSub:theme.textSecondary,marginBottom:24}}>Excluir <strong>{deleteConfirm.number}</strong> de <strong>{deleteConfirm.client_name}</strong>?</p>
            <div style={{display:"flex",gap:12,justifyContent:"flex-end",flexDirection:isMobile?"column":"row"}}>
              <button style={{background:"rgba(255,255,255,0.8)",border:`1px solid ${rg?RGT.verdeBd:theme.borderCard}`,borderRadius:8,padding:"10px 20px",fontWeight:600,cursor:"pointer",color:rg?RGT.text:theme.textSecondary,width:isMobile?"100%":"auto"}} onClick={()=>setDeleteConfirm(null)}>Cancelar</button>
              <button style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",width:isMobile?"100%":"auto"}} onClick={()=>handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:isMobile?16:28,right:isMobile?16:28,left:isMobile?16:"auto",color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:600,fontSize:"0.9rem",zIndex:9999,boxShadow:"0 8px 30px rgba(0,0,0,0.4)",background:toast.type==="error"?"#ef4444":toast.type==="warn"?"#f59e0b":(rg?RGT.verde:theme.primaryGrad),textAlign:isMobile?"center":"left"}}>{toast.msg}</div>}
    </PageLayout>
  );
}
