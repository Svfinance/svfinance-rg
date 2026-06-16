# 05_estado.md — svfinance-rg
> Estado da sessão corrente. Atualizado por Opus no início e fim de cada sessão.
> Son Coder não toca este arquivo.

---

## Sessão atual

**Data:** 15/06/2026
**Repo foco:** svfinance-rg
**Tarefa ativa:** PR7 — QRScanner cleanup + Sidebar mobile (seletor de estilo)
**Modelo/effort:** SonCoder/high (bug com race condition assíncrona + análise cross-file)

---

## Estado no início desta sessão (15/06)

**Migration HEAD:** `pin_cliente_add_01`
**Branch:** `main`

**Contexto:** retomada do roteiro de teste a partir do bug crítico deixado em 12/06 — "Escanear novamente" pisca a tela quando há erro fixado — seguido do segundo bug crítico: seletor de estilo da Sidebar não funciona em mobile.

---

## Diagnóstico desta sessão

### Bug 1 — "Escanear novamente" pisca a tela (RESOLVIDO — aplicar PR7)

**Causa raiz:** `QRScanner.jsx` não tinha proteção contra detecções disparadas **após desmontagem do componente**. O `useEffect` só rodava `stopCamera()` no cleanup ligado à troca de `mode` — mas quando `CheckinModal` desmonta/remonta o `QRScanner` inteiro via `voltarParaScanner()` → `setStep("scanning")`, o loop de leitura da instância anterior podia disparar `onDetected` numa janela entre o unmount e o reset efetivo da câmera.

Mesmo mecanismo do PR6 (sessão 11-12/06), mas disparado pelo botão "← Escanear novamente" em vez de "✓ Sim, estou no local". O `stepRef` do PR6 não cobria esse caso porque `voltarParaScanner()` já setava `step = "scanning"` *antes* da detecção órfã chegar.

### Bug 2 — Sidebar mobile: seletor de modelo não funciona (DIAGNOSTICADO — fix pendente de aplicação)

**Causa raiz:** em `Sidebar.jsx`, `getMobileStyle()` e `setMobileStyleLS()` existem mas são funções locais **sem `export`**. `Settings.jsx` só tem acesso às versões exportadas (`getSidebarStyle`, `setSidebarStyleLS` — as de **desktop**). Resultado: o seletor em mobile estava chamando a função de desktop, sem efeito no `SidebarMobile`.

Bug em aberto desde 11/06 (3ª sessão), nunca diagnosticado porque `Settings.jsx` nunca tinha sido enviado para análise.

---

## O que foi entregue nesta sessão

### PR7 — `QRScanner.jsx` (entregue, aplicar)
- `cleanupRef` (ref booleana) setada `true`:
  - No cleanup do `useEffect` de desmontagem total (novo `useEffect([])`)
  - No cleanup do `useEffect` de troca de `mode`
- Callback de `decodeFromConstraints` checa `if (cleanupRef.current) return` **antes** de `onDetected` — detecções pós-desmontagem descartadas na origem.

### PR7 — `CheckinModal.jsx` (entregue, aplicar)
- `transitingRef` setado `true` por 350ms dentro de `voltarParaScanner()`.
- `onQRDetected` com três guards em sequência:
  ```js
  if (stepRef.current !== "scanning") return;   // PR6
  if (transitingRef.current) return;              // PR7 — novo
  if (loadingOpen) return;
  ```
- `voltarParaScanner()` também reseta `confirmandoRef.current = false`.

### Fix documentado — `Sidebar.jsx` (NÃO aplicado ainda — aguarda Settings.jsx)
```js
// Localizar:
const MOBILE_STYLE_KEY = "sv_mobile_style";
function getMobileStyle()    { return localStorage.getItem(MOBILE_STYLE_KEY) || "dock"; }
function setMobileStyleLS(s) { localStorage.setItem(MOBILE_STYLE_KEY, s); window.dispatchEvent(new Event("sv_mobile_style_changed")); }

// Substituir por:
const MOBILE_STYLE_KEY = "sv_mobile_style";
export function getMobileStyle()    { return localStorage.getItem(MOBILE_STYLE_KEY) || "dock"; }
export function setMobileStyleLS(s) { localStorage.setItem(MOBILE_STYLE_KEY, s); window.dispatchEvent(new Event("sv_mobile_style_changed")); }

export function setStyleAdaptive(s) {
  if (window.innerWidth <= 768) setMobileStyleLS(s);
  else setSidebarStyleLS(s);
}
```

**Bloqueado:** `Settings.jsx` ainda não foi analisado. Sem ele não dá para confirmar qual chamada exata precisa trocar para `setMobileStyleLS` ou `setStyleAdaptive`.

---

## Arquivos alterados nesta sessão (pendentes de aplicar no repo real)

```
src/components/restaura/QRScanner.jsx     ← PR7 (cleanupRef) — pronto para aplicar
src/components/restaura/CheckinModal.jsx  ← PR7 (transitingRef + reset confirmandoRef) — pronto para aplicar
src/components/Sidebar.jsx                ← fix documentado, NÃO aplicado (aguarda Settings.jsx)
```

---

## Regras de trabalho ativas (specíficas deste repo, além do sv-protocol)

- **Regra CTRL+H:** nenhum find-and-replace é proposto sem antes confirmar o texto exato no arquivo atual (string pode ter divergido desde a última leitura).
- **Diagnóstico antes de código:** todo bug é rastreado até a causa raiz (linha por linha do fluxo assíncrono) antes de qualquer fix.
- **Guard layering:** bugs de duplo disparo/detecção órfã exigem múltiplas refs em camadas (componente + callback) — um guard único não basta com race conditions assíncronas. Padrão atual: `stepRef` (PR6) + `transitingRef` (PR7) + `confirmandoRef` (PR4) coexistindo no mesmo componente.
- **Teste limpo:** O.S nova a cada rodada de teste (O.S "suja" confunde estado) + limpar `localStorage`/`sessionStorage`/`IndexedDB` antes de retestar.

---

## Pontos de atenção válidos (carregar para toda sessão futura no svfinance-rg)

1. `RAIO_CHECKIN_METROS=3` no Render é **temporário** — mudar para 25 só depois de validar GPS real dos clientes (ainda não validado)
2. Migration HEAD: `pin_cliente_add_01`
3. O.S "suja" de testes antigos confunde estado — sempre criar O.S nova para retestar
4. Conta de teste `contazero@teste.com.br` (senha 123456) — remover antes de onboarding de clientes reais
5. `isRG()` sempre por hostname — nunca `company_id`; embutido em `Sidebar.jsx` como `_isRGHost()`, importado de `../utils/isRG` no resto do código
6. Antes de qualquer CTRL+H: sempre confirmar o trecho exato do arquivo atual

---

## Próximo passo exato (ordem de execução)

```
1. Aplicar PR7 em QRScanner.jsx e CheckinModal.jsx (código já pronto acima)
2. Enviar Settings.jsx para o Claude Code analisar — sem ele o bug 2 não fecha
3. Aplicar o fix em Sidebar.jsx + a chamada correta em Settings.jsx
4. Testar roteiro:
   a. Forçar erro fixo na tela (check-in fora do raio)
   b. Clicar "← Escanear novamente" → scanner deve abrir limpo, sem piscar
   c. Repetir 3x para garantir que não é intermitente
5. Testar check-out completo da O.S desta sessão (finish → 200 + duração na tela)
6. Mudar RAIO_CHECKIN_METROS de 3 para 25 no Render — só após validar GPS real
7. Seguir para múltiplos endereços/filiais (migration enderecos_filiais_01,
   down_revision = pin_cliente_add_01)
```

---

## Decisões tomadas nesta sessão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Guard em camadas (cleanupRef + transitingRef + stepRef) | Um único guard global de "scanner ocupado" | Race conditions assíncronas do scanner de QR não são cobertas por um guard só — cada camada intercepta um timing diferente |
| Exportar funções de mobile separadas em vez de unificar com desktop | Unificar getSidebarStyle para detectar mobile internamente | Manter funções desktop/mobile separadas evita side-effects cruzados; `setStyleAdaptive()` decide qual usar, sem misturar a lógica interna das duas |
