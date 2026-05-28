import { useState, useEffect, useCallback } from "react";
import { queueCount } from "./offlineDB";
import { syncNow } from "./syncEngine";

export function useOffline() {
  const [online, setOnline]   = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    setPending(await queueCount());
  }, []);

  useEffect(() => {
    const on  = () => { setOnline(true);  syncNow().then(refresh); };
    const off = () => setOnline(false);
    const done = () => refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("sv-sync-done", done);
    refresh();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("sv-sync-done", done);
    };
  }, [refresh]);

  return { online, pending, refresh };
}