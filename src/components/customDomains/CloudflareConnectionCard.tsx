import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Cloud,
  Info,
  Loader2,
  Link2Off,
  RefreshCw,
  X
} from "lucide-react";
import {
  beginCloudflareConnect,
  disconnectCloudflareConnection,
  fetchDomainPreferences
} from "../../lib/domainApi";

type Props = {
  sampleDomain?: string;
  samplePageId?: string;
};

/**
 * Compact Cloudflare control for Custom Domains header:
 * logo opens manage popup; (i) opens plain-English explanation.
 */
export default function CloudflareConnectionCard({ sampleDomain, samplePageId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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
      setError("Open Connect Domain first, then reconnect Cloudflare from here.");
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
    <>
      <div className="acn-cf-header-controls">
        <button
          type="button"
          className={`acn-cf-logo-btn ${connected ? "is-connected" : ""} ${loading ? "is-loading" : ""}`}
          onClick={() => {
            setInfoOpen(false);
            setManageOpen(true);
          }}
          title={connected ? "Cloudflare connected — manage" : "Connect Cloudflare"}
          aria-label={connected ? "Manage Cloudflare account" : "Connect Cloudflare account"}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#F6821F]" />
          ) : (
            <img src="/dns-providers/cloudflare.svg" alt="" className="acn-cf-logo-btn__img" width={28} height={28} />
          )}
          {connected && <span className="acn-cf-logo-btn__dot" aria-hidden />}
        </button>

        <button
          type="button"
          className="acn-cf-info-btn"
          onClick={() => {
            setManageOpen(false);
            setInfoOpen(true);
          }}
          title="What is this?"
          aria-label="Why Cloudflare account connection exists"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {manageOpen &&
        createPortal(
          <div className="acn-modal-backdrop" onClick={() => !busy && setManageOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="acn-cf-manage-title"
              className="acn-cf-manage-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="acn-cf-manage-dialog__close"
                onClick={() => setManageOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="acn-cf-manage-dialog__hero">
                <div className="acn-cf-manage-dialog__logo-wrap">
                  <img src="/dns-providers/cloudflare.svg" alt="" width={40} height={40} />
                </div>
                <h3 id="acn-cf-manage-title">Cloudflare account</h3>
                {connected ? (
                  <span className="acn-cf-manage-dialog__status is-on">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="acn-cf-manage-dialog__status is-off">Not connected</span>
                )}
                <p>
                  One connection for all your domains. ACN Link adds and removes DNS in{" "}
                  <strong>your</strong> Cloudflare — never the platform owner&apos;s account.
                </p>
                {connected && accountId ? (
                  <p className="acn-cf-manage-dialog__meta">
                    Account · {accountId.slice(0, 8)}…{accountId.slice(-4)}
                    {connectedAt ? ` · since ${new Date(connectedAt).toLocaleDateString()}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="acn-cf-manage-dialog__actions">
                {connected ? (
                  <>
                    <button
                      type="button"
                      disabled={busy || !oauthEnabled}
                      onClick={() => void onConnect()}
                      className="acn-cf-manage-dialog__btn acn-cf-manage-dialog__btn--secondary"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reconnect
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDisconnect()}
                      className="acn-cf-manage-dialog__btn acn-cf-manage-dialog__btn--danger"
                    >
                      <Link2Off className="h-4 w-4" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !oauthEnabled}
                    onClick={() => void onConnect()}
                    className="acn-cf-manage-dialog__btn acn-cf-manage-dialog__btn--primary"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                    Connect Cloudflare
                  </button>
                )}
              </div>

              {error ? <p className="acn-cf-manage-dialog__error">{error}</p> : null}
              {!oauthEnabled && !loading && !connected ? (
                <p className="acn-cf-manage-dialog__warn">
                  Cloudflare Connect is not available on this server yet. You can still add domains with
                  manual DNS steps.
                </p>
              ) : null}
            </div>
          </div>,
          document.body
        )}

      {infoOpen &&
        createPortal(
          <div className="acn-modal-backdrop" onClick={() => setInfoOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="acn-cf-info-title"
              className="acn-cf-info-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="acn-cf-manage-dialog__close"
                onClick={() => setInfoOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 id="acn-cf-info-title">Why connect Cloudflare?</h3>
              <p className="acn-cf-info-dialog__lead">
                This link lets ACN Link manage DNS for you — so you do not copy-paste records for every
                subdomain.
              </p>

              <div className="acn-cf-info-dialog__table-wrap">
                <table className="acn-cf-info-dialog__table">
                  <thead>
                    <tr>
                      <th>What you see</th>
                      <th>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Connected</td>
                      <td>ACN Link can add/remove DNS in your Cloudflare account.</td>
                    </tr>
                    <tr>
                      <td>Not connected</td>
                      <td>Use Connect Domain wizard, or add DNS manually.</td>
                    </tr>
                    <tr>
                      <td>Reconnect</td>
                      <td>Approve Cloudflare again (expired token, wrong account, or new permissions).</td>
                    </tr>
                    <tr>
                      <td>Disconnect</td>
                      <td>Remove access. Auto DNS stops; existing domains stay in ACN until you delete them.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="acn-cf-info-dialog__note">
                Tip: Connect once, then add many domains (shop.brand.com, link.brand.com, …). Each bio page
                still uses only one custom domain.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
