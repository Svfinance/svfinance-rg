import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

export default function CheckinPin() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients]     = useState([]);
  const [clientId, setClientId]   = useState("");
  const [generated, setGenerated] = useState(null);
  const [actives, setActives]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {});
    loadActives();
  }, []);

  // Countdown do PIN gerado
  useEffect(() => {
    if (!generated) return;
    const exp = new Date(generated.expires_at + "Z").getTime();
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((exp - Date.now()) / 1000));
      setCountdown(left);
      if (left <= 0) { clearInterval(tick); setGenerated(null); loadActives(); }
    }, 1000);
    return () => clearInterval(tick);
  }, [generated]);

  async function loadActives() {
    try {
      const r = await fetch(`${API}/checkin/pin/active`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      setActives(d.items || []);
    } catch {}
  }

  async function gerarPin() {
    if (!clientId) { setError("Selecione um cliente."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/checkin/pin/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ client_id: parseInt(clientId) }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.msg || "Erro ao gerar PIN."); return; }
      setGenerated(d);
      loadActives();
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  }

  const card = {
    background: isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard,
    border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius: 16, padding: 28, marginBottom: 24,
    ...(isGlass && { backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)" }),
  };
  const input = {
    background: theme.bgInput, border: `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderInput}`,
    borderRadius: 10, padding: "12px 14px", color: theme.textPrimary, fontSize: "0.95rem",
    outline: "none", width: "100%", boxSizing: "border-box", colorScheme: isGlass ? "light" : "dark",
  };
  const btn = {
    background: theme.primaryGrad, color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", marginTop: 16,
  };

  function fmtLeft(s) {
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  }

  return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 8px", color: theme.textPrimary }}>
          🔑 Autorização de Check-in
        </h1>
        <p style={{ color: theme.textMuted, margin: "0 0 28px", fontSize: "0.9rem" }}>
          Gere um PIN temporário para liberar o check-in de clientes sem localização cadastrada.
          O GPS do colaborador será salvo como local oficial do cliente.
        </p>

        <div style={card}>
          <label style={{ color: theme.textSecondary, fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 8 }}>
            Cliente
          </label>
          <select style={{ ...input, cursor: "pointer" }} value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Selecione o cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {error && <div style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>⚠️ {error}</div>}
          <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} onClick={gerarPin} disabled={loading}>
            {loading ? "Gerando..." : "Gerar PIN temporário"}
          </button>
        </div>

        {generated && (
          <div style={{ ...card, textAlign: "center", border: "1px solid rgba(79,142,247,0.4)" }}>
            <div style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>
              PIN para <strong style={{ color: theme.textPrimary }}>{generated.client_name}</strong>
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "12px", color: theme.primary, fontFamily: "monospace" }}>
              {generated.pin}
            </div>
            <div style={{ color: countdown < 60 ? "#f59e0b" : theme.textMuted, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              Expira em {fmtLeft(countdown)}
            </div>
            <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 12 }}>
              Informe este PIN ao colaborador. Uso único.
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: theme.textMuted, marginBottom: 14 }}>
            PINs ativos ({actives.length})
          </div>
          {actives.length === 0 ? (
            <div style={{ color: theme.textMuted, fontSize: 13 }}>Nenhum PIN ativo no momento.</div>
          ) : actives.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.15)" : theme.border}` }}>
              <span style={{ color: theme.textPrimary, fontFamily: "monospace", fontWeight: 700 }}>{p.pin}</span>
              <span style={{ color: theme.textMuted, fontSize: 13 }}>cliente #{p.client_id}</span>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}