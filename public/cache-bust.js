// public/cache-bust.js
(function () {
  var VERSION = "rg-v3";
  if (localStorage.getItem("sv_tv") !== VERSION) {
    localStorage.removeItem("sv_theme");
    localStorage.removeItem("sv_tv");
    localStorage.setItem("sv_tv", VERSION);
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) { reg.update(); });
    });
  }
})();