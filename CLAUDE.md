# CLAUDE.md — svfinance-rg
> Schema operacional sv-protocol v1.0. Regras transversais em `~/.claude/CLAUDE.md` global.
> Este arquivo cobre o frontend de implementação — template base para SV Soluções.
> Instância piloto: Restaura Glass (restauraglass.svfinance.com.br · company_id=20).

---

## Projeto

- **Nome:** svfinance-rg
- **Descrição:** Frontend React customizado para implementações SV Soluções.
  Template base que originou o Restaura Glass. Cada nova implementação
  (nova empresa via SV Soluções) nasce como fork/cópia deste repo
  com tema e módulos ajustados para o nicho do cliente.
- **sv-protocol:** v1.0
- **Repo:** github.com/Svfinance/svfinance-rg
- **Branch:** `main`

---

## Stack

- React 19 + Vite
- React Router DOM
- Recharts (gráficos)
- @zxing/browser (leitura QR Code — check-in)
- **VitePWA** configurado (autoUpdate, hash por build) — diferença do svfinance-app
- Estilos: inline JS objects — sem Tailwind
- Deploy: Vercel (automático via push na main)

---

## Topologia

| Ambiente | URL |
|---|---|
| Produção (Restaura Glass) | `https://restauraglass.svfinance.com.br` |
| Dev local | `http://localhost:5173` |
| Backend | `https://api.svfinance.com.br/api` |

---

## Estrutura

```
src/
  App.jsx
  services/
    api.js
  utils/
    isRG.js             # detecção por hostname — IMPORTAR DAQUI
  contexts/
    ThemeContext.jsx    # CACHE_VERSION="rg-v3"
    NichoContext.jsx
    PlanContext.jsx
  themes/
    themes.js           # DEFAULT_THEME="clean"
  components/
    layout/
      Sidebar.jsx       # isRG embutido DIRETAMENTE aqui (não importar externamente)
                        # grupos: OPERACIONAL / FINANCEIRO / RELATÓRIOS
      PageLayout.jsx
    restaura/
      RGBackground.jsx
      WifiAccess.jsx    # ⬜ pendente implementação
    PlanBadge.jsx
    CheckoutModal.jsx
  pages/
    Orders.jsx          # cartão RG + renovação + 4 botões ocorrência
    Clients.jsx         # filtro frequência + botão cartão
    ... (demais pages idênticas ao svfinance-app)
```

---

## Decisões críticas — não reabrir

```javascript
// isRG: SEMPRE por hostname — nunca company_id, nunca localStorage
// (localStorage falha antes do login no primeiro carregamento)
const isRG = window.location.hostname.includes('restauraglass');

// isRG no Sidebar.jsx: EMBUTIDO DIRETAMENTE — nunca importar externamente
// (import externo causava erro MIME no Vite em produção)
// Correto — dentro do próprio Sidebar.jsx:
const isRG = window.location.hostname.includes('restauraglass');

// Tema padrão: clean (verde #16a34a) — hardcoded para este repo
// CACHE_VERSION: "rg-v3" — incrementar ao mudar assets cacheados pelo PWA
```

---

## Diferenças vs svfinance-app

| Aspecto | svfinance-app | svfinance-rg |
|---|---|---|
| isRG() | nunca | sempre true (hostname) |
| Sidebar | flat, sem grupos | grupos Operacional/Financeiro/Relatórios |
| Orders.jsx | modal padrão | cartão RG + renovação + 4 ocorrências |
| Tema padrão | blue | clean (verde #16a34a) |
| VitePWA | não | ✅ autoUpdate |
| CACHE_VERSION | — | rg-v3 |
| components/restaura/ | não existe | ✅ RGBackground, WifiAccess |

---

## Cliente ativo

| Cliente | company_id | Login | Nicho |
|---|---|---|---|
| Restaura Glass | 20 | blindex_limp@hotmail.com | limpeza e restauração de vidros |

**LimpezaServiceCard:** cartão mensal RG — 4 ocorrências: fechou / remarcou / nao_compareceu / mudou_ponto.
**CheckinPin:** PIN 6 dígitos temporário (5min) para check-in sem GPS.
**pin_cliente:** PIN 4 dígitos permanente do cliente.

---

## Como criar nova implementação SV Soluções

1. Fazer fork deste repo: `svfinance-novaempresa`
2. Alterar `DEFAULT_THEME` em `themes.js`
3. Ajustar `isRG.js` para o novo hostname
4. Customizar módulos específicos do nicho
5. Criar novo registro no banco (`company_id` novo)
6. Configurar DNS e Vercel para o novo subdomínio
7. Atualizar `00_blueprint.md` do svfinance-api com a nova instância

---

## Ordem de leitura na retomada

1. `./scripts/health-check.sh` (no svfinance-api)
2. `org-ia/05_estado.md` do svfinance-api
3. `org-ia/04_backlog.md` do svfinance-api
4. `git log --oneline -5` aqui
