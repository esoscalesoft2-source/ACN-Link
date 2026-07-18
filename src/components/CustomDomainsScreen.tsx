import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { screenToPath } from "../navigation";
import { ScreenId } from "../types";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit3,
  ExternalLink,
  Globe,
  HelpCircle,
  Loader2,
  PlugZap,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff
} from "lucide-react";
import type { BioPage, CustomDomain, CustomDomainPlatformConfig } from "../types";
import { syncLocalPageDocumentToServer } from "../storage/bioBuilderStorage";
import {
  fetchCustomDomainPlatformConfig,
  testDomainConnection,
  type DomainConnectionTest
} from "../lib/domainApi";
import { buildDnsRecordSet } from "../lib/customDomainDns";
import {
  canOpenCustomDomainInBrowser,
  domainStatusTone,
  getDomainConnectionLabel,
  getDomainConnectionState,
  getDomainStatusLabel,
  isCustomDomainPublicReady,
  isDomainDnsLinked
} from "../lib/customDomainStatus";
import ConnectDomainWizard from "./customDomains/ConnectDomainWizard";
import CustomDomainSetupGuide from "./customDomains/CustomDomainSetupGuide";
import DomainDnsPanel from "./customDomains/DomainDnsPanel";
import RemoveDomainDialog from "./customDomains/RemoveDomainDialog";
import PageShell, { PageHeader, SectionCard, Workspace } from "./layout/PageShell";

interface CustomDomainsScreenProps {
  domains: CustomDomain[];
  pages: BioPage[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => Promise<void>;
  onConnectDomain: (domainName: string, pageId: string) => Promise<CustomDomain>;
  onVerifyDomain: (id: string) => Promise<CustomDomain>;
  onDeleteDomain: (id: string) => Promise<void>;
  onEditPage: (pageId: string, options?: { fromCustomDomain?: boolean }) => void;
}

function ConnectionIndicator({ domain }: { domain: CustomDomain }) {
  const state = getDomainConnectionState(domain);
  const label = getDomainConnectionLabel(domain);
  const Icon = state === "live" ? Wifi : state === "connecting" ? Clock : WifiOff;

  return (
    <span className={`acn-domains-lovable__connection acn-domains-lovable__connection--${state}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function ConnectionTestResult({ test }: { test: DomainConnectionTest }) {
  return (
    <div className={`acn-domains-lovable__test-result acn-domains-lovable__test-result--${test.connectionState}`}>
      <p className="acn-domains-lovable__test-result-summary">{test.summary}</p>
      <ul className="acn-domains-lovable__test-result-checks">
        <li className={test.dnsVerified ? "is-ok" : "is-bad"}>
          DNS {test.dnsVerified ? "OK" : "not ready"} — {test.dnsMessage}
        </li>
        <li className={test.servesAcn ? "is-ok" : test.dnsVerified ? "is-warn" : "is-bad"}>
          ACN Link {test.servesAcn ? "reachable" : "not reachable yet"}
        </li>
        {!test.sslAutomatic && test.dnsVerified && !test.servesAcn && (
          <li className="is-warn">Automatic SSL is not configured on the platform — DNS must route traffic to ACN Link.</li>
        )}
      </ul>
      {test.nextStep && <p className="acn-domains-lovable__test-result-next">{test.nextStep}</p>}
    </div>
  );
}

function statusBadge(domain: CustomDomain) {
  const tone = domainStatusTone(domain);
  const verified = domain.status === "Verified";
  const failed = domain.status === "Error" || domain.providerStatus === "error";
  const provisioning = domain.status === "Provisioning SSL";
  const pending = domain.status === "Pending DNS";
  const dnsVerified = domain.status === "DNS Verified";
  const Icon = verified ? CheckCircle : failed ? AlertCircle : provisioning || pending ? Loader2 : dnsVerified ? Clock : Clock;
  return (
    <span className={`acn-domains-lovable__status acn-domains-lovable__status--${tone}`}>
      <Icon className={`h-3.5 w-3.5 ${provisioning || pending ? "animate-spin" : ""}`} />
      {getDomainStatusLabel(domain)}
    </span>
  );
}

export default function CustomDomainsScreen({
  domains,
  pages,
  isLoading,
  loadError,
  onReload,
  onConnectDomain,
  onVerifyDomain,
  onDeleteDomain,
  onEditPage
}: CustomDomainsScreenProps) {
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [resumeDomain, setResumeDomain] = useState<CustomDomain | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CustomDomain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "ok" | "error" } | null>(null);
  const [platformConfig, setPlatformConfig] = useState<CustomDomainPlatformConfig | null>(null);
  const [platformConfigLoading, setPlatformConfigLoading] = useState(true);
  const [expandedDnsIds, setExpandedDnsIds] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);
  const [connectionTests, setConnectionTests] = useState<Record<string, DomainConnectionTest>>({});

  const loadPlatformConfig = React.useCallback(async () => {
    setPlatformConfigLoading(true);
    try {
      setPlatformConfig(await fetchCustomDomainPlatformConfig());
    } catch {
      setPlatformConfig(null);
    } finally {
      setPlatformConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlatformConfig();
  }, [loadPlatformConfig]);

  useEffect(() => {
    if (!wizardOpen) return;
    document.body.classList.add("acn-connect-domain-modal-open");
    return () => document.body.classList.remove("acn-connect-domain-modal-open");
  }, [wizardOpen]);

  const linkedDomainsByPageId = useMemo(() => {
    const map = new Map<string, CustomDomain>();
    for (const domain of domains) {
      if (domain.pageId) map.set(domain.pageId, domain);
    }
    return map;
  }, [domains]);

  const platformUrl = platformConfig?.platformUrl || "acnlink.mindflo.today";

  const triggerToast = (message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const pageName = (id: string) => pages.find((page) => page.id === id)?.title || "Bio page";

  const domainStats = useMemo(() => {
    let live = 0;
    let connecting = 0;
    let offline = 0;
    for (const domain of domains) {
      const state = getDomainConnectionState(domain);
      if (state === "live") live += 1;
      else if (state === "connecting") connecting += 1;
      else offline += 1;
    }
    return { total: domains.length, live, connecting, offline };
  }, [domains]);

  const toggleDnsPanel = (domainId: string) => {
    setExpandedDnsIds((current) => {
      const next = new Set(current);
      if (next.has(domainId)) next.delete(domainId);
      else next.add(domainId);
      return next;
    });
  };

  const openLiveWebsite = async (domain: CustomDomain) => {
    if (!canOpenCustomDomainInBrowser(domain)) {
      triggerToast("Verify DNS first — Open is available after DNS is verified.", "error");
      return;
    }

    const page = pages.find((item) => item.id === domain.pageId);
    await syncLocalPageDocumentToServer(domain.pageId, page?.slug);
    window.open(`https://${domain.domainName}`, "_blank", "noopener,noreferrer");
  };

  const editLinkedPage = (domain: CustomDomain) => {
    const page = pages.find((item) => item.id === domain.pageId);
    if (!page) {
      triggerToast("Linked page not found. Refresh and try again.", "error");
      return;
    }
    const params = new URLSearchParams({ edit: domain.pageId, source: "domain" });
    navigate(`${screenToPath(ScreenId.BIO_PAGES)}?${params.toString()}`);
    onEditPage(domain.pageId, { fromCustomDomain: true });
  };

  const testConnection = async (domain: CustomDomain) => {
    setTestingId(domain.id);
    try {
      const page = pages.find((item) => item.id === domain.pageId);
      await syncLocalPageDocumentToServer(domain.pageId, page?.slug);
      const { test, domain: updated } = await testDomainConnection(domain.id);
      setConnectionTests((current) => ({ ...current, [domain.id]: test }));
      await onReload();
      if (updated.status === "Verified") {
        triggerToast(`${updated.domainName} is live — connection OK.`, "ok");
      } else if (test.connectionState === "connecting") {
        triggerToast(`${updated.domainName}: DNS OK, waiting for traffic to reach ACN Link.`, "error");
      } else {
        triggerToast(test.nextStep || test.summary, "error");
      }
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Connection test failed.", "error");
    } finally {
      setTestingId(null);
    }
  };

  const verifyDomain = async (domain: CustomDomain) => {
    setVerifyingId(domain.id);
    try {
      const page = pages.find((item) => item.id === domain.pageId);
      await syncLocalPageDocumentToServer(domain.pageId, page?.slug);
      const updated = await onVerifyDomain(domain.id);
      if (updated.status === "Verified") {
        triggerToast(`${updated.domainName} is live with HTTPS.`);
      } else if (isDomainDnsLinked(updated)) {
        triggerToast(`${updated.domainName} DNS verified. SSL may take a few minutes.`);
      } else {
        triggerToast(updated.setupHint || updated.errorMessage || "DNS not detected yet.", "error");
      }
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Verification failed.", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setDeletingId(removeTarget.id);
    try {
      await onDeleteDomain(removeTarget.id);
      triggerToast(`"${removeTarget.domainName}" removed.`);
      setRemoveTarget(null);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Unable to remove domain.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Custom Domains"
        subtitle="Connect your domain or subdomain so visitors open your bio page on your brand address."
        actions={
          <a
            href="https://github.com"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
            onClick={(event) => event.preventDefault()}
            title="See docs/custom-domains-production.md in the project"
          >
            <HelpCircle className="h-4 w-4" /> How domains work
          </a>
        }
      />

      {loadError && (
        <div className="acn-banner-error">
          <span>{loadError}</span>
          <button type="button" onClick={() => void onReload()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="acn-domains-lovable">
        <SectionCard>
          <Workspace>
            <div className="acn-domains-lovable__section">
              <div>
                <h3 className="acn-domains-lovable__heading">Default ACN Link address</h3>
                <p className="acn-domains-lovable__desc">Your platform URL before adding a custom domain.</p>
              </div>
              <a
                href={`https://${platformUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="acn-domains-lovable__domain-link"
              >
                <Globe className="h-4 w-4" />
                {platformUrl}
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </div>

            <div className="acn-domains-lovable__divider" />

            <div className="acn-domains-lovable__section">
              <div>
                <h3 className="acn-domains-lovable__heading">Connected domains</h3>
                <p className="acn-domains-lovable__desc">View, verify, or remove domains linked to your bio pages.</p>
                {domains.length > 0 && (
                  <p className="acn-domains-lovable__stats">
                    {domainStats.total} domain{domainStats.total === 1 ? "" : "s"} ·{" "}
                    <span className="acn-domains-lovable__stats-live">{domainStats.live} live</span> ·{" "}
                    <span className="acn-domains-lovable__stats-connecting">{domainStats.connecting} connecting</span> ·{" "}
                    <span className="acn-domains-lovable__stats-offline">{domainStats.offline} offline</span>
                  </p>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading domains…
              </div>
            ) : domains.length === 0 ? (
              <CustomDomainSetupGuide
                config={platformConfig}
                hasPages={pages.length > 0}
                onConnect={() => {
                  setResumeDomain(null);
                  setWizardOpen(true);
                }}
              />
            ) : (
              <ul className="acn-domains-lovable__list">
                {domains.map((domain) => {
                  const dnsSet =
                    platformConfig &&
                    buildDnsRecordSet(domain.domainName, platformConfig.aRecordTarget, {
                      cnameTarget: platformConfig.cnameTarget,
                      platformUrl: platformConfig.platformUrl
                    });
                  const dnsExpanded = expandedDnsIds.has(domain.id);
                  const publicReady = isCustomDomainPublicReady(domain);
                  const canOpen = canOpenCustomDomainInBrowser(domain);
                  const dnsLinked = isDomainDnsLinked(domain);
                  const connectionTest = connectionTests[domain.id];
                  return (
                    <li key={domain.id} className="acn-domains-lovable__row">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {canOpen ? (
                            <button
                              type="button"
                              onClick={() => void openLiveWebsite(domain)}
                              className={`acn-domains-lovable__domain-name ${
                                publicReady ? "acn-domains-lovable__domain-name--live" : "acn-domains-lovable__domain-name--open"
                              }`}
                              title="Open website in new tab"
                            >
                              {domain.domainName}
                            </button>
                          ) : (
                            <span className="acn-domains-lovable__domain-name">{domain.domainName}</span>
                          )}
                          <ConnectionIndicator domain={domain} />
                          {statusBadge(domain)}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Opens: {pageName(domain.pageId)} · {dnsSet?.records.length || 1} DNS record
                          {(dnsSet?.records.length || 1) === 1 ? "" : "s"} required
                        </p>
                        {(domain.setupHint || domain.errorMessage) && (
                          <p
                            className={`mt-1 text-xs ${
                              domain.errorMessage && !dnsLinked ? "text-rose-600" : "text-slate-600"
                            }`}
                          >
                            {domain.setupHint || domain.errorMessage}
                          </p>
                        )}
                        {dnsSet && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => toggleDnsPanel(domain.id)}
                              className="acn-domains-lovable__dns-toggle"
                              aria-expanded={dnsExpanded}
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dnsExpanded ? "rotate-180" : ""}`} />
                              {dnsExpanded ? "Hide DNS" : "Show DNS"}
                            </button>
                            {dnsExpanded && (
                              <DomainDnsPanel records={dnsSet.records} aRecordTarget={platformConfig!.aRecordTarget} />
                            )}
                          </div>
                        )}
                        {connectionTest && <ConnectionTestResult test={connectionTest} />}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Test connection"
                          disabled={testingId === domain.id || verifyingId === domain.id}
                          onClick={() => void testConnection(domain)}
                          className="acn-domains-lovable__icon-btn"
                        >
                          {testingId === domain.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlugZap className="h-4 w-4" />
                          )}
                        </button>
                        {!publicReady && (
                          <button
                            type="button"
                            title="Verify DNS"
                            disabled={verifyingId === domain.id}
                            onClick={() => void verifyDomain(domain)}
                            className="acn-domains-lovable__icon-btn"
                          >
                            <RefreshCw className={`h-4 w-4 ${verifyingId === domain.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                        {dnsLinked && (
                          <button
                            type="button"
                            title="Edit linked bio page"
                            onClick={() => editLinkedPage(domain)}
                            className="acn-domains-lovable__icon-btn"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        {canOpen && (
                          <button
                            type="button"
                            title="Open website in new tab"
                            onClick={() => void openLiveWebsite(domain)}
                            className={`acn-domains-lovable__icon-btn ${
                              publicReady
                                ? "acn-domains-lovable__icon-btn--live"
                                : "acn-domains-lovable__icon-btn--open"
                            }`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove domain"
                          disabled={deletingId === domain.id}
                          onClick={() => setRemoveTarget(domain)}
                          className="acn-domains-lovable__icon-btn acn-domains-lovable__icon-btn--danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="acn-domains-lovable__divider" />

            <div className="acn-domains-lovable__section">
              <div>
                <h3 className="acn-domains-lovable__heading">Add existing domain</h3>
                <p className="acn-domains-lovable__desc">Connect a website address you already own.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResumeDomain(null);
                  setWizardOpen(true);
                }}
                disabled={pages.length === 0}
                className="acn-domains-lovable__outline-btn"
                title={pages.length === 0 ? "Publish a bio page first" : undefined}
              >
                {domains.length > 0 ? "Connect Another Domain" : "Connect Domain"}
              </button>
            </div>
          </Workspace>
        </SectionCard>

        {!platformConfigLoading && platformConfig && (
          <aside className="acn-domains-lovable__aside">
            <h4 className="font-bold text-slate-900">How it works</h4>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              {platformConfig.steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="font-bold text-indigo-600">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                <strong>Root domain</strong> (yourbrand.com): add two A records at your registrar:
              </p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                <li>
                  Host <code>www</code> → <code>{platformConfig.aRecordTarget}</code>
                </li>
                <li>
                  Host <code>@</code> → <code>{platformConfig.aRecordTarget}</code>
                </li>
              </ul>
              <p className="mt-3">
                <strong>Subdomain</strong> (studio.yourbrand.com): add one CNAME record:
              </p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                <li>
                  Host <code>studio</code> →{" "}
                  <code>{platformConfig.cnameTarget || platformConfig.platformUrl}</code>
                </li>
              </ul>
              <p className="mt-2">After verification, your connected address opens your bio page.</p>
            </div>
          </aside>
        )}
      </div>

      {wizardOpen &&
        createPortal(
          <ConnectDomainWizard
            open={wizardOpen}
            pages={pages}
            linkedDomainsByPageId={linkedDomainsByPageId}
            platformConfig={platformConfig}
            resumeDomain={resumeDomain}
            onClose={() => {
              setWizardOpen(false);
              setResumeDomain(null);
            }}
            onVerify={onVerifyDomain}
            onConnectDomain={onConnectDomain}
            onFinished={({ domain, connected, pending }) => {
              if (pending) {
                setWizardOpen(false);
                setResumeDomain(null);
                return;
              }

              setWizardOpen(false);
              setResumeDomain(null);
              void onReload();

              window.setTimeout(() => {
                if (connected) {
                  triggerToast(`${domain.domainName} connected successfully.`, "ok");
                } else {
                  triggerToast("Connection failed.", "error");
                }
              }, 100);
            }}
          />,
          document.body
        )}

      {removeTarget &&
        createPortal(
          <RemoveDomainDialog
            domainName={removeTarget.domainName}
            onCancel={() => setRemoveTarget(null)}
            onConfirm={() => void confirmRemove()}
            isRemoving={deletingId === removeTarget.id}
          />,
          document.body
        )}

      {toast &&
        createPortal(
          <div
            className={`acn-toast acn-toast--portal ${
              toast.tone === "error" ? "acn-toast--error" : toast.tone === "ok" ? "acn-toast--success" : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>,
          document.body
        )}
    </PageShell>
  );
}
