# svfinance-rg

> Frontend React de implementação customizada — **SV Soluções**.
> Instância piloto: **Restaura Glass** (`restauraglass.svfinance.com.br`).

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-VitePWA-5A0FC8?logo=pwa)](https://vite-pwa-org.netlify.app)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## Sobre

Template base para implementações **SV Soluções** — ERPs customizados por nicho com alta margem e recorrência mensal. Cada nova empresa implementada via SV Soluções nasce como fork/cópia deste repo.

A instância atual serve a **Restaura Glass** (limpeza e restauração de vidros), nicho `clean` com módulos operacionais específicos: cartão de serviço mensal, check-in presencial com QR + GPS, e controle de ocorrências.

**URL de produção:** `https://restauraglass.svfinance.com.br`

---

## Diferenças vs svfinance-app

| Aspecto | svfinance-app | svfinance-rg |
|---|---|---|
| Público | SaaS self-service | Implementação sob contrato |
| Tema padrão | Azul escuro (`blue`) | Verde limpo (`clean`) |
| Sidebar | Flat sem grupos | Grupos: Operacional / Financeiro / Relatórios |
| PWA | Não | ✅ VitePWA autoUpdate |
| Módulo cartão RG | Não | ✅ LimpezaServiceCard |
| Check-in QR + GPS | Compartilhado | Customizado para field service |
| `isRG()` | Nunca | Sempre true (por hostname) |

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 19 + Vite | Framework e bundler |
| VitePWA | PWA com autoUpdate por hash de build |
| React Router DOM | Roteamento SPA |
| @zxing/browser | Leitura QR Code (check-in presencial) |
| Estilos inline JS | Sem Tailwind, sem CSS modules |

---

## Estrutura

```
src/
├── App.jsx
├── services/api.js
├── utils/
│   └── isRG.js              # Detecção por hostname (importar daqui)
├── contexts/
│   ├── ThemeContext.jsx      # CACHE_VERSION="rg-v3"
│   ├── NichoContext.jsx
│   └── PlanContext.jsx
├── themes/
│   └── themes.js             # DEFAULT_THEME="clean"
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx       # isRG embutido diretamente aqui
│   │   └── PageLayout.jsx
│   └── restaura/
│       ├── RGBackground.jsx
│       └── WifiAccess.jsx    # (pendente)
└── pages/
    ├── Orders.jsx            # Cartão RG + 4 botões de ocorrência
    ├── Clients.jsx           # Filtro de frequência + botão cartão
    └── ...
```

---

## Configuração local

```bash
git clone git@github.com:Svfinance/svfinance-rg.git
cd svfinance-rg
npm install
npm run dev
```

---

## Criando nova implementação SV Soluções

1. Fork deste repo → `svfinance-novaempresa`
2. Alterar `DEFAULT_THEME` em `themes/themes.js`
3. Ajustar hostname em `utils/isRG.js`
4. Customizar módulos do nicho
5. Configurar DNS e Vercel para o novo subdomínio
6. Registrar nova empresa no banco (`company_id` novo)
7. Atualizar `org-ia/00_blueprint.md` do svfinance-api

---

## Regras críticas

```javascript
// isRG: SEMPRE por hostname — nunca company_id ou localStorage
const isRG = window.location.hostname.includes('restauraglass');

// No Sidebar.jsx: isRG embutido diretamente (não importar externamente)
// Import externo causa erro MIME no Vite em produção

// CACHE_VERSION: incrementar ao alterar assets cacheados pelo PWA
// Atual: "rg-v3"
```

---

## Cliente ativo

| Cliente | company_id | Nicho |
|---|---|---|
| Restaura Glass | 20 | Limpeza e restauração de vidros |
