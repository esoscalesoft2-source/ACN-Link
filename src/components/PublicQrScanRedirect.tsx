import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../lib/apiBase";

/**
 * SPA fallback for Smart QR scans. Prefer server 302 on GET /q/:code;
 * if the SPA loads, resolve destination via public API (no login).
 */
export default function PublicQrScanRedirect() {
  const { code } = useParams<{ code: string }>();
  const [message, setMessage] = useState("Opening destination…");
  const [canRetry, setCanRetry] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const publicCode = String(code || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (!publicCode) {
        setMessage("This QR link is invalid.");
        setCanRetry(false);
        return;
      }

      setMessage("Opening destination…");
      setCanRetry(false);

      try {
        const response = await fetch(apiUrl(`/api/public/qr/${encodeURIComponent(publicCode)}`), {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => null)) as {
          targetUrl?: string;
          error?: string;
          status?: string;
        } | null;

        if (cancelled) return;

        if (!response.ok || !payload?.targetUrl) {
          setMessage(
            payload?.status === "Paused"
              ? "This QR code is paused."
              : payload?.error || "QR code not found."
          );
          setCanRetry(true);
          return;
        }

        window.location.replace(payload.targetUrl);
      } catch {
        if (!cancelled) {
          setMessage("Could not open destination. Check your connection and try again.");
          setCanRetry(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        <p className="text-xs text-slate-400">ACN Link Smart QR</p>
        {canRetry ? (
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
