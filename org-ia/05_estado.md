# 05_estado.md — svfinance-rg
> Estado da sessão corrente. Atualizado por Opus no início e fim de cada sessão.
> Son Coder não toca este arquivo.

---

## Sessão atual

**Data:** 19/06/2026
**Repo foco:** svfinance-rg
**Tarefa ativa:** Bug 3 + responsividade Settings encerrados — aguardando teste em produção
**Modelo/effort:** SonCoder/high

---

## Estado no início desta sessão (18/06)

**Migration HEAD:** `pin_cliente_add_01`
**Branch:** `main`

**Contexto:** PR7 e PR8 já em produção (commits d0de93e e 9bc6a17). Roteiro de validação
pendente. Dois novos itens implementados nesta sessão.

---

## O que foi entregue nesta sessão (continuação 18/06)

### Bug 3 — Sidebar mobile / seletor de estilo (`Sidebar.jsx` + `Settings.jsx`)

**Causa raiz:** `handleSidebarStyle` em `Settings.jsx` chamava `setSidebarStyleLS(s)` — grava em
`sv_sidebar_style` e dispara `sv_sidebar_style_changed`. `SidebarMobile` ouve `sv_mobile_style_changed`
e lê de `sv_mobile_style`. Nunca se cruzavam: Settings não afetava o sidebar no mobile.

**Fix:**
- `Sidebar.jsx`: `getMobileStyle` e `setMobileStyleLS` exportados; `setStyleAdaptive` adicionado
  (detecta `window.innerWidth <= 768` e chama o setter correto).
- `Settings.jsx`:
  - Import: `setSidebarStyleLS` removido → `getMobileStyle` + `setStyleAdaptive` adicionados.
  - State init: `getSidebarStyle()` → `isMobile ? getMobileStyle() : getSidebarStyle()`.
  - `handleSidebarStyle`: `setSidebarStyleLS(s)` → `setStyleAdaptive(s)`; evento manual removido
    (já despachado internamente por `setSidebarStyleLS` / `setMobileStyleLS`).

**Fix adicional (Bug 3b — 19/06):** Settings exibia opções desktop no mobile. `dock_concave` e
`vertical` renderizavam o mesmo painel lateral no `SidebarMobile` (else branch), dando impressão
de que nada mudava.
- `MOBILE_STYLES` exportado de `Sidebar.jsx`
- `Settings.jsx`: `isMobile ? MOBILE_STYLES : DESKTOP_STYLES` no picker de estilos
- Grid mobile: `1fr 1fr` (5 opções: Dock / Lateral / Dir. Lateral / Bottom Sheet / Top Bar)
- Grid desktop: `repeat(3,1fr)` (3 opções: Lateral / Horizontal / Côncavo)

---

### Responsividade Settings.jsx (`Settings.jsx`)

**Problema:** layout sem `maxWidth` esticava em 4K/ultrawide; sem breakpoint tablet causava
Endereço Fiscal com 3 colunas apertadas em 769–1024px.

**Fix:**
- Hook `useIsTablet()` adicionado (769–1024px), variável `isTablet` no componente
- Wrapper `maxWidth: 1400px, margin: "0 auto"` em todo o conteúdo do Settings
- Endereço Fiscal: `1fr 1fr 1fr` → `isTablet ? "1fr 1fr" : "1fr 1fr 1fr"`
- Demais grids de 2 colunas mantidos no tablet (aceitáveis em ~475px por coluna)

---

## O que foi entregue nesta sessão

### PR9 — Checkout com validação de GPS (`CheckinModal.jsx`)

**Causa raiz:** `onQRDetected` enviava checkout direto para `confirming`, pulando
`confirming_location`. O colaborador finalizava serviço sem confirmar presença no local.

**Fix:**
- `setStep(action === "start" ? "confirming_location" : "confirming")` → `setStep("confirming_location")`
- Mensagem de erro do botão "Não, estou no local errado" virou action-aware:
  `"❌ ${action === "start" ? "Check-in" : "Check-out"} cancelado."`
- Texto do botão "Sim, estou no local de [X]" já era genérico — sem ajuste necessário.

---

### PR10 — Timer retry no scanner + PIN de autorização (`QRScanner.jsx` + `CheckinModal.jsx`)

**QRScanner.jsx:**
- `showRetry` state adicionado
- Timer de erro ajustado de 25s → 30s; ao disparar: `setCamErr` + `setShowRetry(true)`
- Cleanup reseta `showRetry` ao trocar de modo
- Botão "↩ Escanear novamente" aparece apenas quando `showRetry === true` (após 30s sem leitura)

**CheckinModal.jsx:**
- Botão "← Escanear novamente" removido de `confirming_location`
- Botão "← Escanear novamente" removido de `confirming`
- `ErroFixo` em `confirming` perdeu `onTentarNovamente` → `voltarParaScanner` (era o caminho remanescente)
- Substituído por botão "🔑 Solicitar PIN de autorização" → `setPinMode(true)`, visível quando `error && !pinMode`

---

## Arquivos alterados nesta sessão (comitados)

```
src/components/restaura/CheckinModal.jsx  ← PR9 + PR10
src/components/restaura/QRScanner.jsx     ← PR10
src/components/layout/Sidebar.jsx         ← Bug 3 + Bug 3b (MOBILE_STYLES export)
src/pages/Settings.jsx                    ← Bug 3 + Bug 3b + responsividade
org-ia/05_estado.md                       ← este arquivo
```

---

## Status dos bugs / features

| Item | Status |
|---|---|
| Bug 1 — "Escanear novamente" pisca / trava | ✅ Comitado (PR7) |
| Bug 2 — LED câmera não apagava após scan | ✅ Comitado (PR8) |
| PR9 — GPS no checkout | ✅ Comitado — **aguardando teste em produção** |
| PR10 — Timer retry + PIN de autorização | ✅ Comitado — **aguardando teste em produção** |
| Bug 3 — Sidebar mobile / seletor de estilo | ✅ Comitado (d427a9a) |
| Responsividade Settings (tablet + 4K) | ✅ Comitado (d427a9a) |

---

## Roteiro de teste em produção (pendente — todos os PRs)

```
PR7 + PR8 (scanner):
  1. Abrir O.S nova → Iniciar serviço → Escanear QR
  2. Na tela "Você está no local correto?" → clicar "Sim" → confirmar entrada
  3. Fechar modal → confirmar LED da câmera apaga
  4. Reabrir modal → câmera inicia do zero

PR9 (GPS no checkout):
  5. Com check-in aberto → "Finalizar serviço — Escanear QR"
  6. Escanear → tela "Você está no local correto?" deve aparecer (novidade)
  7. Confirmar → checkout registrado normalmente
  8. Forçar erro de raio → tela de erro aparece com botão "🔑 Solicitar PIN"

PR10 (timer + PIN):
  9. Abrir scanner → aguardar 30s sem escanear → erro + botão "↩ Escanear novamente" aparecem
  10. Clicar "↩ Escanear novamente" → câmera reinicia limpa
  11. Forçar fora do raio no check-in → botão "🔑 Solicitar PIN de autorização" aparece
  12. Clicar → campo de PIN aparece e fluxo existente funciona normalmente
```

---

## Próximo passo exato (ordem de execução)

```
1. Testar roteiro acima em produção (restauraglass.svfinance.com.br)
2. Mudar RAIO_CHECKIN_METROS de 3 para 25 no Render — só após validar GPS real
3. Seguir para múltiplos endereços/filiais (migration enderecos_filiais_01,
   down_revision = pin_cliente_add_01)
```

---

## Pontos de atenção válidos (carregar para toda sessão futura no svfinance-rg)

1. `RAIO_CHECKIN_METROS=3` no Render é **temporário** — mudar para 25 só depois de validar GPS real dos clientes (ainda não validado)
2. Migration HEAD: `pin_cliente_add_01`
3. O.S "suja" de testes antigos confunde estado — sempre criar O.S nova para retestar
4. Conta de teste `contazero@teste.com.br` (senha 123456) — remover antes de onboarding de clientes reais
5. `isRG()` sempre por hostname — nunca `company_id`; embutido em `Sidebar.jsx` como `_isRGHost()`, importado de `../utils/isRG` no resto do código
6. Antes de qualquer CTRL+H: sempre confirmar o trecho exato do arquivo atual
7. **@zxing/browser v0.2.0 não tem `reset()`** — o método correto de parada é `controls.stop()` (retorno de `decodeFromConstraints`)
8. `sem_coordenadas` → `setPinMode(true)` já é ativado diretamente em `confirmar()` — botão "🔑 Solicitar PIN" não aparece nesse caso porque `pinMode` já é `true`

---

---

## Decisões tomadas (acumulado)

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Guard em camadas (cleanupRef + transitingRef + stepRef) | Um único guard global de "scanner ocupado" | Race conditions assíncronas do scanner de QR não são cobertas por um guard só — cada camada intercepta um timing diferente |
| Exportar funções de mobile separadas em vez de unificar com desktop | Unificar getSidebarStyle para detectar mobile internamente | Manter funções desktop/mobile separadas evita side-effects cruzados; `setStyleAdaptive()` decide qual usar, sem misturar a lógica interna das duas |
| `controls.stop()` em vez de `reader.reset()` | Manter `reader.reset()` com fallback manual | `reset()` não existe na API — `controls.stop()` é o único caminho correto documentado pelo @zxing/browser |
| `<video>` sempre no DOM via `display: none` | Patch em `videoElement.play` para suprimir AbortError | DOM persistence elimina a causa raiz; patch seria monkey-patching de API do browser |
| `confirming_location` para checkout também | Manter checkout direto no confirming | Consistência de auditoria — checkout sem confirmação de local era ponto cego |
| Botão "🔑 Solicitar PIN" no lugar de "↩ Escanear novamente" | Manter Escanear novamente como fallback | Fora do raio, escanear de novo não resolve — PIN é o único desbloqueio válido |
| Timer retry 30s com `showRetry` state | Sempre mostrar botão de retry | Evita distração visual — botão só aparece quando câmera realmente falhou |
| `setStyleAdaptive` no Settings em vez de `setSidebarStyleLS` direto | Manter chamada desktop e adicionar chamada mobile separada | Uma função única detecta viewport e grava na chave correta — evita duplicidade de lógica |
| Settings mostra `MOBILE_STYLES` no mobile em vez de opções desktop | Manter opções únicas para todos | Opções desktop (dock_concave) não existem em MOBILE_STYLES — visual sem efeito real no mobile |
| `maxWidth: 1400px` no wrapper do Settings | maxWidth por seção | Um único wrapper cobre todos os cards de uma vez; 1400px cobre resoluções de notebook e monitores comuns sem cortar |
| `useIsTablet` como hook separado de `useIsMobile` | Ternário inline ou media query CSS | Mesma convenção do `useIsMobile` já existente — consistência no padrão do arquivo |
