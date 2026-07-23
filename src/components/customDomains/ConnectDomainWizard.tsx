import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  BioPage,
  CustomDomain,
  CustomDomainPlatformConfig,
  DnsProviderCapability,
  DnsProviderId
} from "../../types";
import {
  analyzeDomain,
  beginCloudflareConnect,
  fetchDomainPreferences,
  saveDomainPreferences,
  type DomainAnalysis,
  type DomainConnectResult
} from "../../lib/domainApi";
import {
  buildDnsRecordSet,
  customDomainValidationError,
  getCustomDomainKind,
  getDnsZoneDomain
} from "../../lib/customDomainDns";
import { isValidHostname, normaliseHostname } from "../../storage/publishStorage";
import SearchablePagePicker from "./SearchablePagePicker";
import DnsRecordsTable from "./DnsRecordsTable";
import { useDomainInputPreview } from "./useDomainInputPreview";
import { getProviderBranding } from "../../lib/dnsProviderBranding";
import { getAccessToken, isPreviewToken } from "../../lib/authApi";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

type WizardPhase = "domain" | "provider" | "connect" | "verifying" | "manual" | "success";

export type CloudflareOAuthBootstrap = {
  domainName: string;
  pageId: string;
  connected: boolean;
  error?: string;
};

interface ConnectDomainWizardProps {
  open: boolean;
  pages: BioPage[];
  linkedDomainsByPageId: Map<string, CustomDomain>;
  platformConfig: CustomDomainPlatformConfig | null;
  resumeDomain?: CustomDomain | null;
  /** After Cloudflare OAuth redirect — continue without asking for a token. */
  oauthBootstrap?: CloudflareOAuthBootstrap | null;
  onClose: () => void;
  onConnectDomain: (
    domainName: string,
    pageId: string,
    options?: {
      cloudflareApiToken?: string;
      accessToken?: string;
      dnsProviderId?: string;
      rememberProvider?: boolean;
    }
  ) => Promise<DomainConnectResult>;
  onVerify: (
    id: string,
    options?: { skipPageSync?: boolean }
  ) => Promise<import("../../lib/domainApi").DomainVerifyResult>;
  /** Remove an incomplete setup so it never appears as Offline in history. */
  onDiscardIncomplete?: (domainId: string) => Promise<void>;
  onFinished: (result: { domain: CustomDomain; connected: boolean; pending?: boolean }) => void;
}

const DEFAULT_PROVIDERS: DnsProviderCapability[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    supportsAutoDns: true,
    supportsOAuth: false,
    logoUrl: "/dns-providers/cloudflare.svg",
    helpUrl: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/",
    blurb: "One click — we add DNS for you automatically."
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/godaddy.svg",
    helpUrl: "https://www.godaddy.com/help/add-a-cname-record-19236",
    blurb: "Simple copy steps for GoDaddy."
  },
  {
    id: "hostinger",
    name: "Hostinger",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/hostinger.svg",
    helpUrl: "https://support.hostinger.com/en/articles/1583227-how-to-manage-dns-records-in-hpanel",
    blurb: "Simple copy steps for Hostinger."
  },
  {
    id: "namecheap",
    name: "Namecheap",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/namecheap.svg",
    helpUrl:
      "https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/",
    blurb: "Simple copy steps for Namecheap."
  },
  {
    id: "porkbun",
    name: "Porkbun",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/porkbun.svg",
    helpUrl: "https://kb.porkbun.com/article/22-how-to-edit-dns-records",
    blurb: "Simple copy steps for Porkbun."
  },
  {
    id: "squarespace",
    name: "Squarespace",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/squarespace.svg",
    helpUrl: "https://support.squarespace.com/hc/en-us/articles/360002101888",
    blurb: "Simple copy steps for Squarespace Domains."
  },
  {
    id: "other",
    name: "Other",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/default.svg",
    helpUrl: "https://www.google.com/search?q=how+to+add+CNAME+DNS+record",
    blurb: "We'll show easy copy-and-paste steps."
  }
];

function isDomainLive(domain: CustomDomain) {
  return domain.status === "Verified";
}

function progressIndex(phase: WizardPhase): number {
  if (phase === "domain") return 0;
  if (phase === "provider" || phase === "connect") return 1;
  if (phase === "verifying") return 2;
  if (phase === "manual") return 3;
  return 4;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyDnsPendingError(hostname: string) {
  return `DNS for ${hostname} is not visible yet. Confirm the record below, wait about a minute, then check again.`;
}

function friendlyHttpsPendingError(hostname: string) {
  return `DNS looks good for ${hostname}. Secure HTTPS is still activating (usually 1–3 minutes). Keep this open and check again — you do not need to re-add DNS.`;
}

function friendlyDomainMissingError() {
  return "This setup was closed or removed. Click Cancel, then Connect Domain again.";
}

export default function ConnectDomainWizard({
  open,
  pages,
  linkedDomainsByPageId,
  platformConfig,
  resumeDomain,
  oauthBootstrap,
  onClose,
  onConnectDomain,
  onVerify,
  onDiscardIncomplete,
  onFinished
}: ConnectDomainWizardProps) {
  const discardingRef = useRef(false);
  const [phase, setPhase] = useState<WizardPhase>("domain");
  const [domainName, setDomainName] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageSelectionConfirmed, setPageSelectionConfirmed] = useState(false);
  const [pendingPage, setPendingPage] = useState<BioPage | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedDomain, setConnectedDomain] = useState<CustomDomain | null>(null);
  const [analysis, setAnalysis] = useState<DomainAnalysis | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<DnsProviderId | "">("");
  const [preferredProviderId, setPreferredProviderId] = useState<string | null>(null);
  const [providerHasSavedToken, setProviderHasSavedToken] = useState(false);
  const [rememberProvider] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [dnsAutoProvisioned, setDnsAutoProvisioned] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [verifyMaxAttempts, setVerifyMaxAttempts] = useState(8);
  const [verifyStage, setVerifyStage] = useState(0);
  const [autoDnsReady, setAutoDnsReady] = useState(false);
  const [dnsConfirmed, setDnsConfirmed] = useState(false);
  const connectStartedRef = useRef(false);
  const verifyLoopIdRef = useRef(0);

  const firstAvailablePageId = pages.find((page) => !linkedDomainsByPageId.has(page.id))?.id || "";
  const isResume = Boolean(resumeDomain);
  const isPreviewSession = isPreviewToken(getAccessToken());
  const previewSessionMessage =
    "You are in preview mode. Sign in with your email and password to connect a domain.";

  const providers = platformConfig?.dnsProviders?.length
    ? platformConfig.dnsProviders
    : DEFAULT_PROVIDERS;

  const selectedProvider =
    providers.find((item) => item.id === selectedProviderId) ||
    DEFAULT_PROVIDERS.find((item) => item.id === selectedProviderId) ||
    null;

  useEffect(() => {
    if (!open) return;
    if (resumeDomain) {
      setConnectedDomain(resumeDomain);
      setDomainName(resumeDomain.domainName);
      setPageId(resumeDomain.pageId || firstAvailablePageId);
      setPageSelectionConfirmed(Boolean(resumeDomain.pageId || firstAvailablePageId));
      setPendingPage(null);
      setSelectedProviderId((resumeDomain.dnsProviderId as DnsProviderId) || "other");
      setPhase("verifying");
      void analyzeDomain(resumeDomain.domainName)
        .then(setAnalysis)
        .catch(() =>
          setAnalysis({
            domainName: resumeDomain.domainName,
            providerId: "unknown",
            providerName: "DNS host",
            nameservers: []
          })
        );
    } else if (oauthBootstrap?.domainName && oauthBootstrap.pageId) {
      setDomainName(oauthBootstrap.domainName);
      setPageId(oauthBootstrap.pageId);
      setPageSelectionConfirmed(true);
      setPendingPage(null);
      setConnectedDomain(null);
      setSelectedProviderId("cloudflare");
      setAutoDnsReady(oauthBootstrap.connected);
      setProviderHasSavedToken(oauthBootstrap.connected);
      setFormError(oauthBootstrap.error || "");
      setPhase(oauthBootstrap.connected ? "verifying" : "connect");
    } else {
      setPhase("domain");
      setDomainName("");
      setPageId("");
      setPageSelectionConfirmed(false);
      setPendingPage(null);
      setConnectedDomain(null);
      setAnalysis(null);
      setSelectedProviderId("");
    }
    if (!oauthBootstrap?.error) setFormError("");
    setVerifyError(null);
    setDnsAutoProvisioned(false);
    setVerifyAttempt(0);
    setVerifyMaxAttempts(8);
    setVerifyStage(0);
    if (!oauthBootstrap) {
      setProviderHasSavedToken(false);
      setAutoDnsReady(false);
    }
    connectStartedRef.current = false;

    void fetchDomainPreferences()
      .then((prefs) => {
        setPreferredProviderId(prefs.preferredDnsProvider);
        if (!resumeDomain && !oauthBootstrap && prefs.preferredDnsProvider) {
          setSelectedProviderId(prefs.preferredDnsProvider as DnsProviderId);
        }
        const saved = prefs.connections.find(
          (item) => item.providerId === "cloudflare" && item.hasToken
        );
        if (saved) {
          setProviderHasSavedToken(true);
          setAutoDnsReady(true);
        }
      })
      .catch(() => {
        /* preferences optional */
      });
  }, [open, resumeDomain, oauthBootstrap, firstAvailablePageId]);

  useEffect(() => {
    if (!open || phase !== "verifying" || connectStartedRef.current) return;
    connectStartedRef.current = true;

    if (isResume && connectedDomain) {
      void runVerifyLoop(connectedDomain);
      return;
    }
    if (!pageId || !pageSelectionConfirmed || !selectedProviderId) {
      connectStartedRef.current = false;
      return;
    }
    void runConnectFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, isResume, connectedDomain?.id, pageId, pageSelectionConfirmed, selectedProviderId]);

  const activeHostname = connectedDomain?.domainName || normaliseHostname(domainName);
  const dnsSet = useMemo(() => {
    if (!platformConfig || !activeHostname) return null;
    return buildDnsRecordSet(activeHostname, platformConfig.aRecordTarget, {
      cnameTarget: platformConfig.cnameTarget
    });
  }, [activeHostname, platformConfig]);

  const inputPreview = useDomainInputPreview(domainName, dnsSet, phase === "domain" && !isResume);
  const dnsRecords = useMemo(() => (dnsSet ? dnsSet.records : []), [dnsSet]);
  const providerBranding = getProviderBranding(
    selectedProviderId || analysis?.providerId || "unknown",
    selectedProvider?.name || analysis?.providerName
  );

  const requestPageSelection = (page: BioPage) => setPendingPage(page);
  const confirmPageSelection = () => {
    if (!pendingPage) return;
    setPageId(pendingPage.id);
    setPageSelectionConfirmed(true);
    setPendingPage(null);
    setFormError("");
  };
  const cancelPageSelection = () => setPendingPage(null);

  const discardIncompleteAndClose = async () => {
    if (discardingRef.current) return;
    discardingRef.current = true;
    const draft = connectedDomain;
    try {
      if (draft && !isDomainLive(draft) && onDiscardIncomplete) {
        await onDiscardIncomplete(draft.id);
      }
    } catch {
      /* best-effort cleanup */
    } finally {
      setConnectedDomain(null);
      onClose();
      discardingRef.current = false;
    }
  };

  const runVerifyLoop = async (domain: CustomDomain) => {
    const loopId = ++verifyLoopIdRef.current;
    // DNS checks first; once DNS is OK we wait longer for HTTPS/LIVE.
    let maxAttempts = 18;
    setVerifyMaxAttempts(maxAttempts);
    setVerifyStage(1);
    setVerifyAttempt(1);
    setIsSubmitting(true);
    setVerifyError(null);

    let sawDnsOk = dnsConfirmed;
    let lastHostname = domain.domainName;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (verifyLoopIdRef.current !== loopId) return;

        const stepNum = attempt + 1;
        setVerifyAttempt(stepNum);
        try {
          const verifyResult = await onVerify(domain.id, { skipPageSync: true });
          if (verifyLoopIdRef.current !== loopId) return;

          const updated = verifyResult.domain;
          lastHostname = updated.domainName;
          setConnectedDomain(updated);

          const dnsOk = Boolean(verifyResult.dns?.verified || updated.dnsVerifiedAt);
          if (dnsOk) {
            sawDnsOk = true;
            setDnsConfirmed(true);
            setVerifyStage(2);
            // Give HTTPS more time once DNS is confirmed.
            if (maxAttempts < 24) {
              maxAttempts = 24;
              setVerifyMaxAttempts(maxAttempts);
            }
          }
          if (
            updated.status === "Provisioning SSL" ||
            updated.status === "DNS Verified" ||
            updated.sslStatus === "active" ||
            updated.sslStatus === "pending" ||
            updated.sslStatus === "edge"
          ) {
            setVerifyStage(3);
          }
          if (updated.sslStatus === "active" || updated.sslStatus === "edge" || updated.status === "Verified") {
            setVerifyStage(4);
          }
          if (updated.status === "Verified") {
            setVerifyStage(5);
            setVerifyError(null);
            setPhase("success");
            return;
          }

          if (attempt < maxAttempts - 1) {
            await sleep(sawDnsOk ? 4000 : 5000);
          } else if (sawDnsOk) {
            // DNS is fine — do NOT send users back to "add DNS" with a red DNS error.
            setVerifyError(friendlyHttpsPendingError(lastHostname));
            setPhase("verifying");
            setVerifyStage(3);
          } else {
            setVerifyError(friendlyDnsPendingError(lastHostname));
            setPhase("manual");
          }
        } catch (error) {
          if (verifyLoopIdRef.current !== loopId) return;
          const message = error instanceof Error ? error.message : "";
          const errorCode =
            error && typeof error === "object" && "code" in error
              ? String((error as { code?: string }).code || "")
              : "";
          const missing =
            errorCode === "DOMAIN_NOT_FOUND" ||
            /not found|removed or expired/i.test(message);

          if (missing) {
            setVerifyError(friendlyDomainMissingError());
            setPhase("manual");
            return;
          }

          if (attempt >= maxAttempts - 1) {
            setVerifyError(
              sawDnsOk
                ? friendlyHttpsPendingError(lastHostname)
                : message || friendlyDnsPendingError(lastHostname)
            );
            setPhase(sawDnsOk ? "verifying" : "manual");
          } else {
            await sleep(sawDnsOk ? 4000 : 5000);
          }
        }
      }
    } finally {
      if (verifyLoopIdRef.current === loopId) {
        setIsSubmitting(false);
      }
    }
  };

  const runConnectFlow = async () => {
    const hostname = normaliseHostname(domainName);
    setIsSubmitting(true);
    setVerifyError(null);
    setVerifyStage(0);
    setDnsConfirmed(false);

    try {
      // Multi-tenant: auto DNS only with THIS user's Cloudflare OAuth — never platform env token.
      const useAutoDns =
        selectedProviderId === "cloudflare" && (autoDnsReady || providerHasSavedToken);
      let result: DomainConnectResult;
      try {
        result = await onConnectDomain(hostname, pageId, {
          dnsProviderId: selectedProviderId || "other",
          rememberProvider
        });
      } catch (connectError) {
        const message =
          connectError instanceof Error ? connectError.message : "Could not connect this domain.";
        // Stale incomplete row from a cancelled setup — remove and retry once.
        if (/already connected|already exists|DOMAIN_EXISTS/i.test(message) && onDiscardIncomplete) {
          try {
            const existing = await import("../../lib/domainApi").then((mod) => mod.fetchDomains());
            const stale = existing.find(
              (item) =>
                item.domainName === hostname &&
                item.status !== "Verified"
            );
            if (stale) {
              await onDiscardIncomplete(stale.id);
              result = await onConnectDomain(hostname, pageId, {
                dnsProviderId: selectedProviderId || "other",
                rememberProvider
              });
            } else {
              throw connectError;
            }
          } catch {
            throw connectError;
          }
        } else {
          throw connectError;
        }
      }
      setConnectedDomain(result.domain);
      setDnsAutoProvisioned(Boolean(result.dnsAutoProvisioned));
      setVerifyStage(1);

      if (result.dnsAutoProvisioned) {
        setVerifyStage(2);
        await runVerifyLoop(result.domain);
        return;
      }

      // Customer zone not on platform token → send them to Cloudflare approve (no token paste).
      if (
        selectedProviderId === "cloudflare" &&
        (result.needsOAuth || result.oauthAuthorizeUrl) &&
        result.oauthAuthorizeUrl
      ) {
        window.location.href = result.oauthAuthorizeUrl;
        return;
      }

      if (useAutoDns && selectedProviderId === "cloudflare") {
        // Last resort: try begin() for OAuth URL even when connect payload omitted it.
        try {
          const begin = await beginCloudflareConnect(hostname, pageId);
          if (begin.mode === "oauth" && begin.authorizeUrl) {
            window.location.href = begin.authorizeUrl;
            return;
          }
        } catch {
          /* fall through to manual */
        }
        setVerifyError(
          result.dnsProvisionMessage ||
            "We couldn't update DNS automatically. Follow the simple steps below — no API token needed."
        );
        setPhase("manual");
        return;
      }

      await runVerifyLoop(result.domain);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not connect this domain.");
      setPhase("provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDomain = (event: FormEvent) => {
    event.preventDefault();
    if (isPreviewSession) {
      setFormError(previewSessionMessage);
      return;
    }
    const hostname = normaliseHostname(domainName);
    const domainError = customDomainValidationError(hostname);
    if (domainError) {
      setFormError(domainError);
      return;
    }
    if (!isValidHostname(hostname)) {
      setFormError("Enter a website address like yourbrand.com or shop.yourbrand.com.");
      return;
    }
    if (!pageId || !pageSelectionConfirmed) {
      setFormError("Choose which page should open, then confirm with Yes.");
      return;
    }
    const linkedDomain = linkedDomainsByPageId.get(pageId);
    if (linkedDomain) {
      setFormError(`That page is already connected to ${linkedDomain.domainName}.`);
      return;
    }

    setFormError("");
    void analyzeDomain(hostname)
      .then((result) => {
        setAnalysis(result);
        if (!selectedProviderId && result.providerId && result.providerId !== "unknown") {
          const match = providers.find((item) => item.id === result.providerId);
          if (match) setSelectedProviderId(match.id);
        } else if (!selectedProviderId && preferredProviderId) {
          setSelectedProviderId(preferredProviderId as DnsProviderId);
        }
      })
      .catch(() => undefined);
    setPhase("provider");
  };

  const chooseProvider = async (provider: DnsProviderCapability) => {
    setSelectedProviderId(provider.id);
    setFormError("");
    try {
      await saveDomainPreferences(provider.id);
      setPreferredProviderId(provider.id);
    } catch {
      /* optional */
    }

    if (provider.id === "cloudflare") {
      // Show one-click confirm screen (no token). User taps Connect → setup starts.
      setPhase("connect");
      return;
    }
    if (provider.supportsAutoDns) {
      setPhase("connect");
      return;
    }
    setPhase("verifying");
  };

  const submitCloudflareConnect = async () => {
    setFormError("");
    setIsSubmitting(true);
    try {
      const hostname = normaliseHostname(domainName);
      if (!platformConfig?.cloudflareOAuthEnabled) {
        setFormError(
          "Cloudflare Connect is not configured on the server yet. Use Skip for manual DNS steps."
        );
        return;
      }
      const begin = await beginCloudflareConnect(hostname, pageId);
      if (begin.mode === "oauth" && begin.authorizeUrl) {
        // Customer must approve ACN Link on THEIR Cloudflare account.
        window.location.href = begin.authorizeUrl;
        return;
      }
      if (begin.mode === "ready") {
        setProviderHasSavedToken(true);
        setAutoDnsReady(true);
        setPhase("verifying");
        return;
      }
      if (begin.mode === "manual") {
        setFormError(begin.message);
        return;
      }
      setFormError("Could not start Cloudflare connect. Try Skip for manual steps.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not start Cloudflare connect."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishWizard = async () => {
    const domainRecord = connectedDomain;
    if (!domainRecord || !isDomainLive(domainRecord)) return;
    onFinished({ domain: domainRecord, connected: true, pending: false });
    onClose();
  };

  if (!open) return null;

  const dnsZoneDomain = getDnsZoneDomain(activeHostname);
  const domainKind = getCustomDomainKind(activeHostname);
  const activeDot = progressIndex(phase);
  const cnameTarget = platformConfig?.cnameTarget || "acnlink.mindflo.today";

  return (
    <div className="acn-modal-backdrop acn-workflow-modal-backdrop">
      <div className="acn-domain-wizard acn-domain-wizard--onboarding animate-in fade-in zoom-in-95 duration-200">
        <header className="acn-domain-wizard__header">
          {phase !== "domain" && phase !== "success" && phase !== "verifying" && (
            <button
              type="button"
              className="acn-domain-wizard__back"
              onClick={() => {
                if (phase === "provider") setPhase("domain");
                else if (phase === "connect") setPhase("provider");
                else if (phase === "manual") {
                  // Keep the setup — back to waiting, do not delete the domain.
                  setPhase(dnsConfirmed ? "verifying" : "provider");
                }
              }}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="acn-domain-wizard__progress" aria-hidden>
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className={`acn-domain-wizard__dot ${index <= activeDot ? "is-active" : ""} ${
                  index === activeDot ? "is-current" : ""
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            className="acn-domain-wizard__close"
            onClick={() => {
              if (phase === "success") {
                void finishWizard();
                return;
              }
              if (phase === "verifying" || phase === "manual" || connectedDomain) {
                void discardIncompleteAndClose();
                return;
              }
              onClose();
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {phase === "domain" && (
          <form onSubmit={submitDomain} className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__hero">
              <div className="acn-domain-wizard__hero-icon">
                <Globe className="h-7 w-7" />
              </div>
              <h2 className="acn-domain-wizard__title">Connect your domain</h2>
              <p className="acn-domain-wizard__lead">
                Use your own website address for your bio page. No technical setup needed — we guide you.
              </p>
            </div>

            {isPreviewSession && (
              <div className="acn-domain-wizard__alert" role="status">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{previewSessionMessage}</span>
              </div>
            )}

            <label className="acn-domain-wizard__label" htmlFor="wizard-domain">
              Your website address
            </label>
            <input
              id="wizard-domain"
              autoFocus
              value={domainName}
              onChange={(event) => setDomainName(event.target.value)}
              placeholder="shop.yourbrand.com"
              className="acn-domain-wizard__input"
            />
            {inputPreview.isValid && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Looks good
                </span>
                {inputPreview.kindLabel && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {inputPreview.kindLabel}
                  </span>
                )}
              </div>
            )}
            {inputPreview.validationError && domainName.trim() && (
              <p className="mt-2 text-xs text-rose-600">{inputPreview.validationError}</p>
            )}

            <div className="mt-4">
              <label className="acn-domain-wizard__label">
                Which page should open on{" "}
                <strong>{inputPreview.normalized || "this address"}</strong>?
              </label>
              <SearchablePagePicker
                pages={pages}
                value={pageId}
                onChange={setPageId}
                linkedDomainsByPageId={linkedDomainsByPageId}
                onSelectAttempt={requestPageSelection}
              />
            </div>

            {formError && <p className="acn-domain-wizard__error">{formError}</p>}

            <button
              type="submit"
              className="acn-domain-wizard__primary"
              disabled={
                isPreviewSession ||
                !pageSelectionConfirmed ||
                !pageId ||
                !inputPreview.isValid ||
                isSubmitting
              }
            >
              Continue
            </button>
          </form>
        )}

        {phase === "provider" && (
          <div className="acn-domain-wizard__body">
            <h2 className="acn-domain-wizard__title">Where is your domain managed?</h2>
            <p className="acn-domain-wizard__lead">
              Pick the company where you buy or manage <strong>{normaliseHostname(domainName)}</strong>.
              Not sure? Choose <strong>Other</strong>.
            </p>
            {analysis?.providerName && analysis.providerId !== "unknown" && (
              <p className="acn-domain-wizard__hint-pill">
                <Sparkles className="h-3.5 w-3.5" />
                We think this is {analysis.providerName}
              </p>
            )}
            {preferredProviderId && (
              <p className="mt-2 text-xs text-slate-500">
                Last used: {getProviderBranding(preferredProviderId).displayName}
              </p>
            )}

            <div className="acn-provider-grid" role="list">
              {providers.map((provider) => {
                const selected = selectedProviderId === provider.id;
                const suggested = analysis?.providerId === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    role="listitem"
                    className={`acn-provider-card ${selected ? "is-selected" : ""} ${
                      suggested ? "is-suggested" : ""
                    }`}
                    onClick={() => void chooseProvider(provider)}
                  >
                    <span className="acn-provider-card__logo-wrap" aria-hidden>
                      <img
                        src={provider.logoUrl}
                        alt=""
                        className="acn-provider-card__logo"
                        width={32}
                        height={32}
                      />
                    </span>
                    <span className="acn-provider-card__text">
                      <span className="acn-provider-card__name">{provider.name}</span>
                      <span className="acn-provider-card__blurb">{provider.blurb}</span>
                    </span>
                    {provider.supportsAutoDns && (
                      <span className="acn-provider-card__badge">Auto setup</span>
                    )}
                  </button>
                );
              })}
            </div>
            {formError && <p className="acn-domain-wizard__error">{formError}</p>}
          </div>
        )}

        {phase === "connect" && selectedProvider && (
          <div className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__hero">
              <img
                src={selectedProvider.logoUrl}
                alt=""
                className="acn-domain-wizard__provider-logo"
              />
              <h2 className="acn-domain-wizard__title">Connect Cloudflare</h2>
              <p className="acn-domain-wizard__lead">
                Tap the button below. You&apos;ll approve ACN Link in Cloudflare — then we add the DNS
                record and finish setup automatically. No API token. No copy-paste.
              </p>
            </div>

            <div className="acn-domain-wizard__auto-steps">
              <div>
                <ShieldCheck className="h-4 w-4" /> Approve Cloudflare (one click)
              </div>
              <div>
                <ShieldCheck className="h-4 w-4" /> We add DNS automatically
              </div>
              <div>
                <ShieldCheck className="h-4 w-4" /> Secure with HTTPS → LIVE
              </div>
            </div>

            {providerHasSavedToken && (
              <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Cloudflare is already connected. Continue to finish setup.
              </p>
            )}

            {formError && <p className="acn-domain-wizard__error">{formError}</p>}

            <button
              type="button"
              className="acn-domain-wizard__primary"
              disabled={isSubmitting}
              onClick={() => void submitCloudflareConnect()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {providerHasSavedToken ? "Continue setup" : "Connect Cloudflare"}
            </button>
            <button
              type="button"
              className="acn-domain-wizard__link mt-2"
              onClick={() => {
                setAutoDnsReady(false);
                setPhase("verifying");
              }}
            >
              Skip — I&apos;ll use simple copy steps
            </button>
          </div>
        )}

        {phase === "verifying" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__provider-logo-wrap mb-3">
              <img
                src={providerBranding.logoUrl}
                alt=""
                className="acn-domain-wizard__provider-logo-img"
                width={140}
                height={40}
              />
            </div>
            <h2 className="acn-domain-wizard__title">Setting up {activeHostname}</h2>
            <p className="acn-domain-wizard__lead">
              {isSubmitting
                ? `Checking… (${verifyAttempt}/${verifyMaxAttempts})`
                : verifyError
                  ? "Almost there — HTTPS is still finishing"
                  : "Starting setup…"}
            </p>
            <ul className="acn-domain-wizard__checklist acn-domain-wizard__checklist--pretty">
              {[
                "Checking DNS…",
                "DNS found",
                "Waiting for secure HTTPS…",
                "HTTPS ready",
                "LIVE"
              ].map((label, index) => {
                const done = verifyStage > index;
                const current = isSubmitting && verifyStage === index;
                return (
                  <li key={label} className={done ? "is-done" : current ? "is-current" : ""}>
                    {done ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full bg-slate-200" />
                    )}
                    {label}
                  </li>
                );
              })}
            </ul>
            {dnsAutoProvisioned && (
              <p className="mt-3 text-xs font-medium text-emerald-700">DNS updated automatically</p>
            )}
            {verifyError && <p className="acn-domain-wizard__error mt-3">{verifyError}</p>}
            {!isSubmitting && verifyError && connectedDomain && (
              <button
                type="button"
                className="acn-domain-wizard__primary mt-3"
                onClick={() => {
                  connectStartedRef.current = false;
                  void runVerifyLoop(connectedDomain);
                }}
              >
                Check again
              </button>
            )}
            <p className="mt-4 text-center text-xs text-slate-500">
              {dnsConfirmed
                ? "DNS is done. Waiting for HTTPS can take 1–3 minutes — keep this open."
                : "Please wait — your domain appears on Custom Domains only after LIVE is complete."}
            </p>
            <button
              type="button"
              className="acn-domain-wizard__link mt-3"
              onClick={() => void discardIncompleteAndClose()}
            >
              Cancel setup
            </button>
          </div>
        )}

        {phase === "manual" && dnsSet && (
          <div className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__info-banner">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>One easy step at {providerBranding.displayName}</span>
            </div>

            <h2 className="acn-domain-wizard__title">Add this record</h2>
            <p className="acn-domain-wizard__lead">
              Open your domain settings for <strong>{dnsZoneDomain}</strong>, then copy the values below.
              You don&apos;t need to understand DNS — just match Type, Name, and Value.
            </p>

            {domainKind === "subdomain" && (
              <p className="acn-domain-wizard__lead mt-2 text-sm">
                Type <strong>CNAME</strong> · Name{" "}
                <strong>{dnsSet.records[0]?.hostDisplay}</strong> · Value <strong>{cnameTarget}</strong>
              </p>
            )}
            {domainKind === "root" && (
              <p className="acn-domain-wizard__lead mt-2 text-sm">
                Type <strong>A</strong> · Name <strong>@</strong> · Value{" "}
                <strong>{platformConfig?.aRecordTarget}</strong>
              </p>
            )}

            <DnsRecordsTable records={dnsRecords} readOnly />

            <div className="acn-domain-wizard__help-row">
              {selectedProvider?.helpUrl && (
                <a
                  href={selectedProvider.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="acn-domain-wizard__help-chip"
                >
                  Open {providerBranding.displayName} guide <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <a
                href="https://www.youtube.com/results?search_query=how+to+add+cname+record"
                target="_blank"
                rel="noopener noreferrer"
                className="acn-domain-wizard__help-chip"
              >
                Video guide <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                className="acn-domain-wizard__help-chip"
                onClick={() => window.open("/#/contact-support", "_self")}
              >
                <MessageCircle className="h-3 w-3" /> Need help?
              </button>
            </div>

            {verifyError && <p className="acn-domain-wizard__error">{verifyError}</p>}
            {dnsAutoProvisioned && !verifyError && (
              <p className="mt-2 text-xs text-slate-600">
                We already tried to add this automatically. If check again still fails, confirm the
                record in Cloudflare is <strong>DNS only</strong> (gray cloud), not Proxied.
              </p>
            )}

            <button
              type="button"
              disabled={isSubmitting || !connectedDomain}
              className="acn-domain-wizard__primary"
              onClick={() => {
                if (!connectedDomain || isSubmitting) return;
                connectStartedRef.current = false;
                setVerifyError(null);
                setPhase("verifying");
                void runVerifyLoop(connectedDomain);
              }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Checking…" : "I added it — check again"}
            </button>
            <button
              type="button"
              className="acn-domain-wizard__link mt-2"
              onClick={() => void discardIncompleteAndClose()}
            >
              Cancel setup
            </button>
          </div>
        )}

        {phase === "success" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__success-icon">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="acn-domain-wizard__title">You&apos;re live!</h2>
            <p className="acn-domain-wizard__lead">
              <strong>{activeHostname}</strong> is connected and LIVE. It now appears on your Custom
              Domains page.
            </p>
            {pageId && (
              <p className="acn-domain-wizard__lead mt-4">
                Opens: <strong>{pages.find((page) => page.id === pageId)?.title || "Your bio page"}</strong>
              </p>
            )}
            <button
              type="button"
              disabled={!connectedDomain}
              className="acn-domain-wizard__primary"
              onClick={() => void finishWizard()}
            >
              Done
            </button>
          </div>
        )}
      </div>

      {pendingPage && (
        <div className="acn-modal-backdrop acn-page-confirm-backdrop">
          <div
            className="acn-domain-remove-dialog animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-bold text-slate-950">Confirm page selection</h3>
            <p className="mt-2 text-sm text-slate-600">
              Should <strong>{pendingPage.title}</strong> open when visitors go to{" "}
              <strong>{inputPreview.normalized || normaliseHostname(domainName)}</strong>?
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={cancelPageSelection} className="acn-domain-remove-dialog__cancel">
                No
              </button>
              <button type="button" onClick={confirmPageSelection} className="acn-domain-wizard__primary flex-1">
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
