import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Cloud, Loader2, Link2Off, RefreshCw } from "lucide-react";
import {
  beginCloudflareConnect,
  disconnectCloudflareConnection,
  fetchDomainPreferences
} from "../../lib/domainApi";

type Props = {
  /** Used when starting reconnect OAuth from this card */
  sampleDomain?: string;
  samplePageId?: string;
};

/**
 * Multi-tenant Cloudflare connection status for the logged-in ACN user.
 * Tokens never appear here — only connection status.
 */
export default function CloudflareConnectionCard({ sampleDomain, samplePageId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [oauthEnabled, setOauthEnabled] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await fetchDomainPreferences();
      setOauthEnabled(Boolean(prefs.cloudflareOAuthEnabled));
      const cf = prefs.connections.find((c) => c.providerId === "cloudflare");
      setConnected(Boolean(cf?.connected && cf.hasToken));
      setAccountId(cf?.providerAccountId || null);
      setConnectedAt(cf?.connectedAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Cloudflare status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onConnect = async () => {
    if (!sampleDomain || !samplePageId) {
      setError("Open Connect Domain and enter your domain to authorize Cloudflare.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const begin = await beginCloudflareConnect(sampleDomain, samplePageId);
      if (begin.mode === "oauth" && begin.authorizeUrl) {
        window.location.href = begin.authorizeUrl;
        return;
      }
      if (begin.mode === "ready") {
        await reload();
        return;
      }
      setError(begin.mode === "manual" ? begin.message : "Cloudflare connect is unavailable.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed.");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectCloudflareConnection();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50/80 via-white to-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F6821F]/15 text-[#F6821F]">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Cloudflare account</h3>
              {loading ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                </span>
              ) : connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Not connected
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
              ACN Link uses <strong>your</strong> Cloudflare account to add DNS automatically — never the
              platform owner&apos;s account. Manual DNS remains available anytime.
            </p>
            {connected && accountId ? (
              <p className="mt-1 text-[11px] text-slate-500">
                Account · {accountId.slice(0, 8)}…{accountId.slice(-4)}
                {connectedAt ? ` · since ${new Date(connectedAt).toLocaleDateString()}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {connected ? (
            <>
              <button
                type="button"
                disabled={busy || !oauthEnabled}
                onClick={() => void onConnect()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Reconnect
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDisconnect()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <Link2Off className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || !oauthEnabled}
              onClick={() => void onConnect()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F6821F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e07416] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
              Connect Cloudflare
            </button>
          )}
        </div>
      </div>
      {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
      {!oauthEnabled && !loading ? (
        <p className="mt-3 text-xs text-amber-700">
          Connect Cloudflare OAuth is not configured on the server yet. You can still add domains with
          manual DNS steps.
        </p>
      ) : null}
    </div>
  );
}
