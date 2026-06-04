// src/utils/isRG.js
// Helper único para detectar se o frontend é da Restaura Glass
// Baseado no hostname — nunca depende de localStorage ou company_id
// Usado em TODOS os arquivos do finance-control-solucoes

export function isRG() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "restauraglass.svfinance.com.br" ||
    host === "solucoes.svfinance.com.br"      ||
    host === "localhost"                        ||
    host === "127.0.0.1"
  );
}