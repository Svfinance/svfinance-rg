// src/contexts/PlanContext.jsx
// ─────────────────────────────────────────────────────────────
// Controla o plano do usuário e expõe helpers para feature gating.
// Durante o beta, TUDO está liberado — o gating é apenas visual
// (mostra cadeado mas não bloqueia de verdade).
// Quando quiser ativar o bloqueio real, mude BETA_MODE para false.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react"

const BETA_MODE = true // true = tudo liberado, visual only

// ── Definição dos planos ──────────────────────────────────────
export const PLANS = {
  free: {
    label: "Free",
    color: "#06d6a0",
    features: {
      dashboard:           true,
      transactions:        true,   // limitado a 100/mês (backend)
      bills:               true,
      clients:             true,   // limitado a 50 (backend)
      products:            true,   // limitado a 20 (backend)
      services:            true,   // ilimitado em todos
      orders:              true,
      quotes:              true,   // sem PDF personalizado
      quotesPdf:           false,  // PDF com logo própria
      goals:               true,   // limitado a 1 meta
      goalsUnlimited:      false,
      stock:               true,   // básico
      stockFull:           false,
      dre:                 true,   // ver, sem exportar
      dreExport:           false,
      cashflow:            true,   // ver, sem exportar
      cashflowExport:      false,
      analytics:           true,   // parcial
      analyticsFull:       false,
      exportCsv:           false,
      exportExcel:         false,
      exportPdf:           false,
      importData:          true,   // 1 importação
      importUnlimited:     false,
      team:                false,  // só 1 admin
      commissions:         false,
      alerts:              true,   // básico
      alertsFull:          false,
      reports:             true,   // básico
      reportsFull:         false,
    }
  },
  pro: {
    label: "Pro",
    color: "#4f8ef7",
    features: {
      dashboard:           true,
      transactions:        true,
      bills:               true,
      clients:             true,
      products:            true,
      services:            true,
      orders:              true,
      quotes:              true,
      quotesPdf:           true,
      goals:               true,
      goalsUnlimited:      true,
      stock:               true,
      stockFull:           true,
      dre:                 true,
      dreExport:           true,
      cashflow:            true,
      cashflowExport:      true,
      analytics:           true,
      analyticsFull:       true,
      exportCsv:           true,
      exportExcel:         false,  // Business only
      exportPdf:           true,
      importData:          true,
      importUnlimited:     true,
      team:                true,   // até 5 usuários
      commissions:         true,
      alerts:              true,
      alertsFull:          true,
      reports:             true,
      reportsFull:         true,
    }
  },
  business: {
    label: "Business",
    color: "#7c3aed",
    features: {
      dashboard:           true,
      transactions:        true,
      bills:               true,
      clients:             true,
      products:            true,
      services:            true,
      orders:              true,
      quotes:              true,
      quotesPdf:           true,
      goals:               true,
      goalsUnlimited:      true,
      stock:               true,
      stockFull:           true,
      dre:                 true,
      dreExport:           true,
      cashflow:            true,
      cashflowExport:      true,
      analytics:           true,
      analyticsFull:       true,
      exportCsv:           true,
      exportExcel:         true,
      exportPdf:           true,
      importData:          true,
      importUnlimited:     true,
      team:                true,   // ilimitado
      commissions:         true,
      alerts:              true,
      alertsFull:          true,
      reports:             true,
      reportsFull:         true,
    }
  }
}

// Qual plano é necessário para cada feature
export const FEATURE_PLAN = {
  quotesPdf:       "Pro",
  goalsUnlimited:  "Pro",
  stockFull:       "Pro",
  dreExport:       "Pro",
  cashflowExport:  "Pro",
  analyticsFull:   "Pro",
  exportCsv:       "Pro",
  exportExcel:     "Business",
  exportPdf:       "Pro",
  importUnlimited: "Pro",
  team:            "Pro",
  commissions:     "Pro",
  alertsFull:      "Pro",
  reportsFull:     "Pro",
}

// ─────────────────────────────────────────────────────────────
const PlanContext = createContext(null)

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState("free")

  // Lê o plano do localStorage (salvo após login)
  useEffect(() => {
    const stored = localStorage.getItem("sv_plan")
    if (stored && PLANS[stored]) setPlan(stored)

    // Escuta mudanças (ex: upgrade durante a sessão)
    const onStorage = () => {
      const p = localStorage.getItem("sv_plan")
      if (p && PLANS[p]) setPlan(p)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // ── Verifica se uma feature está disponível no plano atual ──
  function can(feature) {
    if (BETA_MODE) return true // beta: tudo liberado
    return PLANS[plan]?.features?.[feature] ?? false
  }

  // ── Retorna o plano mínimo necessário para a feature ──
  function requiredPlan(feature) {
    return FEATURE_PLAN[feature] || "Pro"
  }

  // ── Atualiza o plano (chamar após login ou upgrade) ──
  function updatePlan(newPlan) {
    if (PLANS[newPlan]) {
      setPlan(newPlan)
      localStorage.setItem("sv_plan", newPlan)
    }
  }

  return (
    <PlanContext.Provider value={{ plan, can, requiredPlan, updatePlan, BETA_MODE }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error("usePlan deve ser usado dentro de <PlanProvider>")
  return ctx
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: FeatureGate
// Uso: <FeatureGate feature="exportCsv"><BotaoExportar /></FeatureGate>
// Se bloqueado: mostra o children com overlay de cadeado.
// Se liberado: renderiza normalmente.
// ─────────────────────────────────────────────────────────────
export function FeatureGate({ feature, children, showLock = true }) {
  const { can, requiredPlan } = usePlan()

  if (can(feature)) return children

  if (!showLock) return null

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <div style={{ opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <UpgradeOverlay plan={requiredPlan(feature)} feature={feature} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: UpgradeBadge
// Uso inline: <button disabled={!can("exportCsv")}> + <UpgradeBadge feature="exportCsv" />
// ─────────────────────────────────────────────────────────────
export function UpgradeBadge({ feature }) {
  const { can, requiredPlan } = usePlan()
  if (can(feature)) return null
  const plan = requiredPlan(feature)
  const color = plan === "Business" ? "#7c3aed" : "#4f8ef7"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 8px", marginLeft: 6,
      verticalAlign: "middle"
    }}>
      🔒 {plan}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: UpgradeModal
// Modal elegante ao clicar em feature bloqueada
// ─────────────────────────────────────────────────────────────
export function UpgradeModal({ feature, onClose }) {
  const { requiredPlan } = usePlan()
  const plan = requiredPlan(feature)
  const color = plan === "Business" ? "#7c3aed" : "#4f8ef7"

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)"
    }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(135deg, #0d1424, #080c14)",
        border: `1px solid ${color}44`,
        borderRadius: 20, padding: "40px 36px", maxWidth: 400, width: "90%",
        textAlign: "center", position: "relative",
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${color}22`
      }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>

        <div style={{
          display: "inline-block", fontSize: 11, fontWeight: 700,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color, background: `${color}22`, border: `1px solid ${color}33`,
          borderRadius: 20, padding: "4px 14px", marginBottom: 16
        }}>
          Plano {plan}
        </div>

        <h2 style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: "1.3rem",
          fontWeight: 700, color: "#f0f4ff", marginBottom: 10
        }}>
          Funcionalidade exclusiva
        </h2>

        <p style={{
          color: "rgba(255,255,255,0.5)", fontSize: "0.88rem",
          lineHeight: 1.7, marginBottom: 28
        }}>
          Esta função está disponível no plano <strong style={{ color }}>{plan}</strong>.
          Aguarde o lançamento dos planos pagos — você pode entrar na lista de espera agora.
        </p>

        <a
          href="https://svfinance.com.br#newsletter"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block", width: "100%", padding: "13px",
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            color: "#fff", fontWeight: 700, fontSize: "14px",
            borderRadius: 50, textDecoration: "none", marginBottom: 12,
            boxShadow: `0 4px 20px ${color}44`
          }}
        >
          Entrar na lista de espera →
        </a>

        <button onClick={onClose} style={{
          width: "100%", padding: "12px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50,
          color: "rgba(255,255,255,0.4)", fontWeight: 600,
          fontSize: "13px", cursor: "pointer"
        }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE interno: overlay do FeatureGate
// ─────────────────────────────────────────────────────────────
function UpgradeOverlay({ plan, feature }) {
  const [showModal, setShowModal] = useState(false)
  const color = plan === "Business" ? "#7c3aed" : "#4f8ef7"

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        title={`Disponível no plano ${plan}`}
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", borderRadius: 8,
          background: `rgba(8,12,20,0.6)`,
          backdropFilter: "blur(2px)",
          border: `1px solid ${color}33`,
          transition: "all 0.2s"
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: `${color}22`, border: `1px solid ${color}44`,
          borderRadius: 20, padding: "6px 14px"
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.5px" }}>
            Plano {plan}
          </span>
        </div>
      </div>
      {showModal && <UpgradeModal feature={feature} onClose={() => setShowModal(false)} />}
    </>
  )
}