// src/contexts/NichoContext.jsx
// ─────────────────────────────────────────────────────────────
// Adapta labels, ícones e módulos visíveis conforme o nicho
// selecionado pelo usuário no cadastro (business_type).
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react"

// ── Definição dos nichos ──────────────────────────────────────
export const NICHOS = {
  generic: {
    key: "generic",
    label: "Genérico",
    icon: "⚡",
    color: "#4f8ef7",
    desc: "Sistema completo para qualquer negócio",
    labels: {
      orders:      "Pedidos",
      order:       "Pedido",
      newOrder:    "Novo Pedido",
      orderPrefix: "PED",
      servicePrefix: "OS",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Produtos",
      product:     "Produto",
      sales:       "Vendas",
    },
    modules: ["dashboard","transactions","bills","analytics","dre","cashflow","products","quotes","orders","clients","team","commissions","goals","import","reports","settings"],
  },

  contador: {
    key: "contador",
    label: "Contador",
    icon: "🧮",
    color: "#4f8ef7",
    desc: "Multi-empresa, relatórios e importação",
    labels: {
      orders:      "Serviços",
      order:       "Serviço",
      newOrder:    "Novo Serviço",
      orderPrefix: "OS",
      servicePrefix: "OS",
      clients:     "Empresas",
      client:      "Empresa",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Serviços",
      product:     "Serviço",
      sales:       "Atendimentos",
    },
    modules: ["dashboard","transactions","bills","analytics","dre","cashflow","quotes","orders","clients","team","goals","import","reports","settings"],
  },

  barbeiro: {
    key: "barbeiro",
    label: "Barbeiro / Salão",
    icon: "✂️",
    color: "#f59e0b",
    desc: "Caixa, comissões e clientes recorrentes",
    labels: {
      orders:      "Atendimentos",
      order:       "Atendimento",
      newOrder:    "Novo Atendimento",
      orderPrefix: "AT",
      servicePrefix: "AT",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Produtos / Serviços",
      product:     "Item",
      sales:       "Atendimentos",
    },
    modules: ["dashboard","transactions","bills","analytics","cashflow","products","orders","clients","team","commissions","goals","reports","settings"],
  },

  mototaxi: {
    key: "mototaxi",
    label: "Mototaxi / Transporte",
    icon: "🛵",
    color: "#22c55e",
    desc: "Corridas, entradas diárias e custos",
    labels: {
      orders:      "Corridas",
      order:       "Corrida",
      newOrder:    "Nova Corrida",
      orderPrefix: "COR",
      servicePrefix: "COR",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Serviços",
      product:     "Serviço",
      sales:       "Corridas",
    },
    modules: ["dashboard","transactions","bills","analytics","cashflow","orders","clients","goals","reports","settings"],
  },

  estetica: {
    key: "estetica",
    label: "Designer de Unhas / Estética",
    icon: "💅",
    color: "#ec4899",
    desc: "Agendamentos, serviços e fluxo de caixa",
    labels: {
      orders:      "Agendamentos",
      order:       "Agendamento",
      newOrder:    "Novo Agendamento",
      orderPrefix: "AG",
      servicePrefix: "AG",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Serviços / Produtos",
      product:     "Item",
      sales:       "Agendamentos",
    },
    modules: ["dashboard","transactions","bills","cashflow","products","orders","clients","team","commissions","goals","reports","settings"],
  },

  restaurante: {
    key: "restaurante",
    label: "Restaurante / Lanchonete",
    icon: "🍔",
    color: "#ef4444",
    desc: "Estoque, vendas e DRE para food",
    labels: {
      orders:      "Pedidos",
      order:       "Pedido",
      newOrder:    "Novo Pedido",
      orderPrefix: "PED",
      servicePrefix: "PED",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Cardápio",
      service:     "Item",
      products:    "Cardápio / Insumos",
      product:     "Item",
      sales:       "Vendas",
    },
    modules: ["dashboard","transactions","bills","analytics","dre","cashflow","products","orders","clients","team","goals","reports","settings"],
  },

  loja: {
    key: "loja",
    label: "Loja / Comércio",
    icon: "🛒",
    color: "#8b5cf6",
    desc: "Estoque, vendas e orçamentos",
    labels: {
      orders:      "Pedidos",
      order:       "Pedido",
      newOrder:    "Novo Pedido",
      orderPrefix: "PED",
      servicePrefix: "OS",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Produtos",
      product:     "Produto",
      sales:       "Vendas",
    },
    modules: ["dashboard","transactions","bills","analytics","dre","cashflow","products","quotes","orders","clients","team","commissions","goals","import","reports","settings"],
  },

  marceneiro: {
    key: "marceneiro",
    label: "Marceneiro / Micro",
    icon: "🪵",
    color: "#92400e",
    desc: "Orçamentos, serviços e controle de custos",
    labels: {
      orders:      "Ordens de Serviço",
      order:       "Ordem de Serviço",
      newOrder:    "Nova OS",
      orderPrefix: "OS",
      servicePrefix: "OS",
      clients:     "Clientes",
      client:      "Cliente",
      services:    "Serviços",
      service:     "Serviço",
      products:    "Materiais / Serviços",
      product:     "Item",
      sales:       "Serviços",
    },
    modules: ["dashboard","transactions","bills","cashflow","products","quotes","orders","clients","goals","reports","settings"],
  },
}

// ─────────────────────────────────────────────────────────────
const NichoContext = createContext(null)

export function NichoProvider({ children }) {
  const [nichoKey, setNichoKey] = useState("generic")

  useEffect(() => {
    const stored = localStorage.getItem("sv_nicho")
    if (stored && NICHOS[stored]) setNichoKey(stored)
  }, [])

  const nicho = NICHOS[nichoKey] || NICHOS.generic

  // Labels com fallback para o genérico
  function label(key) {
    return nicho.labels?.[key] || NICHOS.generic.labels[key] || key
  }

  // Verifica se um módulo está ativo para o nicho
  function hasModule(mod) {
    return nicho.modules.includes(mod)
  }

  // Atualiza o nicho (chamar após login ou settings)
  function updateNicho(key) {
    if (NICHOS[key]) {
      setNichoKey(key)
      localStorage.setItem("sv_nicho", key)
    }
  }

  return (
    <NichoContext.Provider value={{ nicho, nichoKey, label, hasModule, updateNicho, NICHOS }}>
      {children}
    </NichoContext.Provider>
  )
}

export function useNicho() {
  const ctx = useContext(NichoContext)
  if (!ctx) throw new Error("useNicho deve ser usado dentro de <NichoProvider>")
  return ctx
}