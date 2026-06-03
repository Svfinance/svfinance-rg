// Adicionar este script em public/cache-bust.js
// e referenciar no index.html ANTES dos outros scripts:
// <script src="/cache-bust.js"></script>

(function() {
  var VERSION = "rg-v3";
  if (localStorage.getItem("sv_tv") !== VERSION) {
    // Limpar sv_theme para forçar o tema padrão
    localStorage.removeItem("sv_theme");
    // Não limpa token, company_id etc — só o tema
  }
  // Forçar atualização do Service Worker se existir
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(reg) { reg.update(); });
    });
  }
})();