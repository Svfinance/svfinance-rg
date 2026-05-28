import { useState, useEffect } from "react";
import { useOffline } from "../offline/useOffline";
import { applyUpdate } from "../offline/registerSW";

export default function OfflineBar() {
  const { online, pending } = useOffline();
  const [updateReg, setUpdateReg] = useState(null);

  useEffect(() => {
    const onUpdate = (e) => setUpdateReg(e.detail.reg);
    window.addEventListener("sv-update-ready", onUpdate);
    return () => window.removeEventListener("sv-update-ready", onUpdate);
  }, []);

  // Banner de nova versão tem prioridade
  if (updateReg) {
    return (
      <div style={barStyle("#4f8ef7")}>
        🔄 Nova versão disponível
        <button style={btnStyle} onClick={() => applyUpdate(updateReg)}>Recarregar</button>
      </div>
    );
  }

  if (!online) {
    return (
      <div style={barStyle("#f59e0b")}>
        📴 Offline {pending > 0 ? `· ${pending} check-in(s) pendente(s)` : "· dados podem estar desatualizados"}
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div style={barStyle("#22c55e")}>
        ⏳ Sincronizando {pending} check-in(s)...
      </div>
    );
  }

  return null;
}

function barStyle(bg) {
  return {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
    background: bg, color: "#fff", fontSize: 13, fontWeight: 600,
    padding: "8px 16px", textAlign: "center",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
  };
}
const btnStyle = {
  background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: 8, color: "#fff", fontWeight: 700, padding: "4px 12px",
  cursor: "pointer", fontFamily: "inherit", fontSize: 12,
};