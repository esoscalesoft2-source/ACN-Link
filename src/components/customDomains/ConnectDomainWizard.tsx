import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { BioPage, CustomDomain, CustomDomainPlatformConfig } from "../../types";
import { analyzeDomain, type DomainAnalysis, type DomainConnectResult } from "../../lib/domainApi";
import {
  buildDnsRecordSet,
  customDomainValidationError,
  formatDnsVerifyError,
  getCustomDomainKind,
  getDnsZoneDomain
} from "../../lib/customDomainDns";
import { isValidHostname, normaliseHostname } from "../../storage/publishStorage";
import SearchablePagePicker from "./SearchablePagePicker";
import DnsRecordsTable from "./DnsRecordsTable";
import { useDomainInputPreview } from "./useDomainInputPreview";
import { getProviderBranding } from "../../lib/dnsProviderBranding";
import { getAccessToken, isPreviewToken } from "../../lib/authApi";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, Globe, Loader2, X } from "lucide-react";

type WizardPhase = "domain" | "connecting" | "manual" | "success";

interface ConnectDomainWizardProps {
  open: boolean;
  pages: BioPage[];
  linkedDomainsByPageId: Map<string, CustomDomain>;
  platformConfig: CustomDomainPlatformConfig | null;
  resumeDomain?: CustomDomain | null;
  onClose: () => void;
  onConnectDomain: (
    domainName: string,
    pageId: string,
    options?: { cloudflareApiToken?: string }
  ) => Promise<DomainConnectResult>;
  onVerify: (
    id: string,
    options?: { skipPageSync?: boolean }
  ) => Promise<import("../../lib/domainApi").DomainVerifyResult>;
  onFinished: (result: { domain: CustomDomain; connected: boolean; pending?: boolean }) => void;
}

function isDomainLive(domain: CustomDomain) {
  return (
    domain.status === "Verified" ||
    domain.status === "DNS Verified" ||
    domain.status === "Provisioning SSL"
  );
}

function progressIndex(phase: WizardPhase): number {
  if (phase === "domain") return 0;
  if (phase === "connecting") return 2;
  if (phase === "manual") return 3;
  return 4;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ConnectDomainWizard({
  open,
  pages,
  linkedDomainsByPageId,
  platformConfig,
  resumeDomain,
  onClose,
  onConnectDomain,
  onVerify,
  onFinished
}: ConnectDomainWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>("domain");
  const [domainName, setDomainName] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageSelectionConfirmed, setPageSelectionConfirmed] = useState(false);
  const [pendingPage, setPendingPage] = useState<BioPage | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedDomain, setConnectedDomain] = useState<CustomDomain | null>(null);
  const [analysis, setAnalysis] = useState<DomainAnalysis | null>(null);
  const [connectStep, setConnectStep] = useState(0);
  const [connectStatus, setConnectStatus] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCfToken, setShowCfToken] = useState(false);
  const [dnsAutoProvisioned, setDnsAutoProvisioned] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [verifyMaxAttempts, setVerifyMaxAttempts] = useState(6);
  const connectStartedRef = useRef(false);

  const firstAvailablePageId = pages.find((page) => !linkedDomainsByPageId.has(page.id))?.id || "";
  const isResume = Boolean(resumeDomain);
  const isPreviewSession = isPreviewToken(getAccessToken());
  const previewSessionMessage =
    "You are in preview/demo mode. Custom domains need a full account — sign out, then log in with your email and password.";

  useEffect(() => {
    if (!open) return;
    if (resumeDomain) {
      setConnectedDomain(resumeDomain);
      setDomainName(resumeDomain.domainName);
      setPageId(resumeDomain.pageId || firstAvailablePageId);
      setPageSelectionConfirmed(Boolean(resumeDomain.pageId || firstAvailablePageId));
      setPendingPage(null);
      setPhase("connecting");
      void analyzeDomain(resumeDomain.domainName)
        .then(setAnalysis)
        .catch(() =>
          setAnalysis({
            domainName: resumeDomain.domainName,
            providerId: "unknown",
            providerName: "DNS Provider",
            nameservers: []
          })
        );
    } else {
      setPhase("domain");
      setDomainName("");
      setPageId("");
      setPageSelectionConfirmed(false);
      setPendingPage(null);
      setConnectedDomain(null);
      setAnalysis(null);
    }
    setFormError("");
    setConnectStep(0);
    setConnectStatus("");
    setVerifyError(null);
    setCloudflareApiToken("");
    setShowAdvanced(false);
    setShowCfToken(false);
    setDnsAutoProvisioned(false);
    setVerifyAttempt(0);
    setVerifyMaxAttempts(6);
    connectStartedRef.current = false;
  }, [open, resumeDomain, firstAvailablePageId]);

  useEffect(() => {
    if (!open || phase !== "connecting" || connectStartedRef.current) return;
    connectStartedRef.current = true;

    if (isResume && connectedDomain) {
      void runVerifyLoop(connectedDomain);
      return;
    }
    if (!pageId || !pageSelectionConfirmed) {
      connectStartedRef.current = false;
      return;
    }
    void runConnectFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, isResume, connectedDomain?.id, pageId, pageSelectionConfirmed]);

  const activeHostname = connectedDomain?.domainName || normaliseHostname(domainName);
  const dnsSet = useMemo(() => {
    if (!platformConfig || !activeHostname) return null;
    return buildDnsRecordSet(activeHostname, platformConfig.aRecordTarget, {
      cnameTarget: platformConfig.cnameTarget
    });
  }, [activeHostname, platformConfig]);

  const inputPreview = useDomainInputPreview(domainName, dnsSet, phase === "domain" && !isResume);
  const isCloudflareProvider =
    inputPreview.providerId === "cloudflare" || analysis?.providerId === "cloudflare";
  const autoDnsEnabled = Boolean(platformConfig?.autoDnsViaCloudflare);

  // Users only add A (root) or CNAME (subdomain). Ownership TXT is never shown.
  const dnsRecords = useMemo(() => (dnsSet ? dnsSet.records : []), [dnsSet]);

  const providerBranding = getProviderBranding(
    analysis?.providerId || inputPreview.providerId || "unknown",
    analysis?.providerName || inputPreview.providerName || undefined
  );
  const providerName = providerBranding.displayName;
  const providerHelpUrl =
    platformConfig?.registrars.find((item) => item.id === analysis?.providerId)?.dnsHelpUrl ||
    platformConfig?.registrars.find((item) => item.name === providerName)?.dnsHelpUrl ||
    platformConfig?.registrars[0]?.dnsHelpUrl;

  const requestPageSelection = (page: BioPage) => {
    setPendingPage(page);
  };

  const confirmPageSelection = () => {
    if (!pendingPage) return;
    setPageId(pendingPage.id);
    setPageSelectionConfirmed(true);
    setPendingPage(null);
    setFormError("");
  };

  const cancelPageSelection = () => {
    setPendingPage(null);
  };

  const runVerifyLoop = async (domain: CustomDomain) => {
    const maxAttempts = 6;
    setVerifyMaxAttempts(maxAttempts);
    setConnectStep(3);
    setVerifyAttempt(1);
    setConnectStatus(`Verifying connection… (1/${maxAttempts})`);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const stepNum = attempt + 1;
      setVerifyAttempt(stepNum);
      setConnectStatus(`Verifying connection… (${stepNum}/${maxAttempts})`);

      try {
        const verifyResult = await onVerify(domain.id, { skipPageSync: true });
        const updated = verifyResult.domain;
        setConnectedDomain(updated);

        const dnsOk = verifyResult.dns?.verified || isDomainLive(updated);
        const registeredOnAcn =
          updated.status === "Verified" ||
          updated.status === "DNS Verified" ||
          updated.status === "Provisioning SSL";

        if (dnsOk || updated.status === "Verified") {
          setVerifyError(null);
          setConnectStatus("Connected!");
          setPhase("success");
          return;
        }

        if (registeredOnAcn && attempt >= maxAttempts - 1) {
          setVerifyError(null);
          setConnectStatus("Registered — SSL may take a few minutes.");
          setPhase("success");
          return;
        }

        if (attempt < maxAttempts - 1) {
          setConnectStatus(`Waiting for DNS… (${stepNum}/${maxAttempts})`);
          await sleep(4000);
        } else {
          setVerifyError(
            formatDnsVerifyError(
              activeHostname,
              verifyResult.dns?.message || updated.errorMessage || updated.setupHint,
              platformConfig?.aRecordTarget || ""
            ) || "DNS not detected yet. Add the CNAME in Cloudflare, then Check again."
          );
          setPhase("manual");
        }
      } catch (error) {
        if (attempt >= maxAttempts - 1) {
          setVerifyError(error instanceof Error ? error.message : "Verification failed.");
          setPhase("manual");
        } else {
          setConnectStatus(`Waiting for DNS… (${stepNum}/${maxAttempts})`);
          await sleep(4000);
        }
      }
    }
  };

  const runConnectFlow = async () => {
    const hostname = normaliseHostname(domainName);
    setIsSubmitting(true);
    setVerifyError(null);
    setConnectStep(0);
    setConnectStatus("Registering with ACN Link…");

    try {
      const token = cloudflareApiToken.trim();
      const useAutoDns = autoDnsEnabled && isCloudflareProvider && token;

      setConnectStep(1);
      if (useAutoDns) {
        setConnectStatus("Updating DNS at Cloudflare…");
      } else {
        setConnectStatus("Registering SSL on ACN Link…");
      }

      const result = await onConnectDomain(hostname, pageId, {
        cloudflareApiToken: useAutoDns ? token : undefined
      });
      setConnectedDomain(result.domain);
      setDnsAutoProvisioned(Boolean(result.dnsAutoProvisioned));
      setConnectStep(2);

      if (result.dnsProvisionMessage && !result.dnsAutoProvisioned && useAutoDns) {
        setVerifyError(result.dnsProvisionMessage);
      }

      await runVerifyLoop(result.domain);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not connect this domain.");
      setPhase("domain");
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
      setFormError("Enter a valid root domain or subdomain, for example yourbrand.com or app.yourbrand.com.");
      return;
    }
    if (!pageId || !pageSelectionConfirmed) {
      setFormError("Choose which published page should open on this address and confirm with Yes.");
      return;
    }
    const linkedDomain = linkedDomainsByPageId.get(pageId);
    if (linkedDomain) {
      setFormError(`That page is already connected to ${linkedDomain.domainName}.`);
      return;
    }
    setFormError("");
    setPhase("connecting");
  };

  const finishWizard = async () => {
    const domainRecord = connectedDomain;
    if (!domainRecord) return;

    onFinished({ domain: domainRecord, connected: isDomainLive(domainRecord), pending: false });
    onClose();
  };

  if (!open) return null;

  const dnsZoneDomain = getDnsZoneDomain(activeHostname);
  const domainKind = getCustomDomainKind(activeHostname);
  const activeDot = progressIndex(phase);

  return (
    <div className="acn-modal-backdrop acn-workflow-modal-backdrop">
      <div className="acn-domain-wizard animate-in fade-in zoom-in-95 duration-200">
        <header className="acn-domain-wizard__header">
          {phase !== "domain" && phase !== "success" && (
            <button
              type="button"
              className="acn-domain-wizard__back"
              onClick={() => {
                if (phase === "manual" || phase === "connecting") setPhase("domain");
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
          <button type="button" className="acn-domain-wizard__close" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {phase === "domain" && (
          <form onSubmit={submitDomain} className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__hero">
              <div className="acn-domain-wizard__hero-icon">
                <Globe className="h-7 w-7" />
              </div>
              <h2 className="acn-domain-wizard__title">Connect your domain to ACN Link</h2>
              <p className="acn-domain-wizard__lead">
                One step — ACN registers SSL and updates DNS for you.
              </p>
            </div>

            {isPreviewSession && (
              <div className="acn-domain-wizard__alert" role="status">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{previewSessionMessage}</span>
              </div>
            )}

            <label className="acn-domain-wizard__label" htmlFor="wizard-domain">
              Your website address (domain)
            </label>
            <input
              id="wizard-domain"
              autoFocus
              value={domainName}
              onChange={(event) => setDomainName(event.target.value)}
              placeholder="yourbrand.com or app.yourbrand.com"
              className="acn-domain-wizard__input"
            />
            {inputPreview.validationError && domainName.trim() && (
              <p className="mt-2 text-xs text-rose-600">{inputPreview.validationError}</p>
            )}
            {inputPreview.isValid && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {inputPreview.checking ? "Checking…" : "Ready"}
                </span>
                {inputPreview.kindLabel && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {inputPreview.kindLabel}
                  </span>
                )}
                {inputPreview.providerName && (
                  <span className="text-[11px] text-slate-500">DNS at {inputPreview.providerName}</span>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="acn-domain-wizard__label">
                Which published page should open on{" "}
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

            {autoDnsEnabled && isCloudflareProvider && inputPreview.isValid && (
              <div className="mt-3">
                <button
                  type="button"
                  className="acn-domain-wizard__link"
                  onClick={() => setShowCfToken((current) => !current)}
                >
                  {showCfToken
                    ? "Hide Cloudflare auto-DNS (optional)"
                    : "Auto-update DNS at Cloudflare (optional)"}
                </button>
                {showCfToken && (
                  <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                    <label className="acn-domain-wizard__label" htmlFor="wizard-cf-token">
                      Cloudflare API token
                    </label>
                    <p className="mt-1 text-xs text-slate-600">
                      Paste once with <strong>Zone → DNS → Edit</strong> permission.
                    </p>
                    <input
                      id="wizard-cf-token"
                      type="password"
                      autoComplete="off"
                      value={cloudflareApiToken}
                      onChange={(event) => setCloudflareApiToken(event.target.value)}
                      placeholder="Cloudflare API token"
                      className="acn-domain-wizard__input mt-2"
                    />
                    <a
                      href="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="acn-domain-wizard__provider-manual-link mt-2 inline-flex items-center gap-1 text-xs"
                    >
                      How to create a token <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {autoDnsEnabled && inputPreview.isValid && !isCloudflareProvider && !inputPreview.checking && (
              <p className="mt-3 text-xs text-slate-600">
                DNS at <strong>{inputPreview.providerName || "your provider"}</strong> — ACN will set up SSL
                automatically.
              </p>
            )}

            {showAdvanced && dnsSet && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold text-slate-700">DNS records (advanced)</p>
                <div className="mt-3">
                  <DnsRecordsTable records={dnsSet.records} readOnly compact />
                </div>
              </div>
            )}

            {inputPreview.isValid && (
              <button
                type="button"
                className="acn-domain-wizard__link mt-3"
                onClick={() => setShowAdvanced((current) => !current)}
              >
                {showAdvanced ? "Hide DNS details" : "Show DNS details (advanced)"}
              </button>
            )}

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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connect
            </button>
          </form>
        )}

        {phase === "connecting" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__analyze-art" aria-hidden />
            <h2 className="acn-domain-wizard__title">Connecting {activeHostname}</h2>
            <p className="acn-domain-wizard__lead">{connectStatus || "Please wait…"}</p>
            <ul className="acn-domain-wizard__checklist">
              <li>
                {connectStep >= 1 ? (
                  <Check className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                )}
                Registered with ACN Link
              </li>
              <li>
                {connectStep >= 2 ? (
                  <Check className="h-4 w-4 text-indigo-600" />
                ) : connectStep >= 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <span className="inline-block h-4 w-4 rounded-full bg-slate-200" />
                )}
                {dnsAutoProvisioned
                  ? "DNS updated at Cloudflare"
                  : connectStep >= 2
                    ? "SSL registered on ACN Link"
                    : connectStep >= 1
                      ? "Registering SSL on ACN Link…"
                      : "SSL on ACN Link"}
              </li>
              <li>
                {connectStep >= 3 ? (
                  phase === "success" ? (
                    <Check className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  )
                ) : (
                  <span className="inline-block h-4 w-4 rounded-full bg-slate-200" />
                )}
                Verifying connection
                {connectStep >= 3 && phase === "connecting" && verifyAttempt > 0
                  ? ` (${verifyAttempt}/${verifyMaxAttempts})`
                  : ""}
              </li>
            </ul>
            {connectStep >= 3 && phase === "connecting" && verifyAttempt > 0 && (
              <p className="mt-3 text-center text-xs text-slate-500">
                Step {verifyAttempt} of {verifyMaxAttempts} — checking DNS and SSL
              </p>
            )}
            {connectedDomain && connectStep >= 2 && phase === "connecting" && (
              <button
                type="button"
                className="acn-domain-wizard__link mt-4"
                onClick={() => {
                  onFinished({ domain: connectedDomain, connected: false, pending: true });
                  onClose();
                }}
              >
                Close — finish in background
              </button>
            )}
          </div>
        )}

        {phase === "manual" && dnsSet && (
          <div className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__info-banner">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>One more step at your DNS provider</span>
            </div>

            <h2 className="acn-domain-wizard__title">Add these records at {providerName}</h2>
            <p className="acn-domain-wizard__lead">
              ACN Link is already set up on our side. Add the records below at{" "}
              <strong>{dnsZoneDomain}</strong> in {providerName}, then we&apos;ll detect them automatically.
            </p>
            {domainKind === "root" && (
              <p className="acn-domain-wizard__lead mt-2 text-sm">
                Root domain: one <strong>A</strong> record for <strong>@</strong> → platform IP.
              </p>
            )}
            {domainKind === "subdomain" && (
              <p className="acn-domain-wizard__lead mt-2 text-sm">
                Subdomain: one <strong>CNAME</strong> for <strong>{dnsSet.records[0]?.hostDisplay}</strong> →{" "}
                {platformConfig?.cnameTarget || "acnlink.mindflo.today"}.
              </p>
            )}

            <DnsRecordsTable records={dnsRecords} readOnly />

            {providerHelpUrl && (
              <a
                href={providerHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="acn-domain-wizard__provider-link mt-3 inline-flex"
              >
                Open {providerName} DNS help <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {verifyError && <p className="acn-domain-wizard__error">{verifyError}</p>}

            <button
              type="button"
              disabled={isSubmitting || !connectedDomain}
              className="acn-domain-wizard__primary"
              onClick={() => connectedDomain && void runVerifyLoop(connectedDomain)}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Check again
            </button>
            <button
              type="button"
              className="acn-domain-wizard__link mt-2"
              onClick={() => {
                if (!connectedDomain) return;
                onFinished({ domain: connectedDomain, connected: false, pending: true });
                onClose();
              }}
            >
              I&apos;ll wait — close for now
            </button>
          </div>
        )}

        {phase === "success" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__success-icon">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="acn-domain-wizard__title">Connected!</h2>
            <p className="acn-domain-wizard__lead">
              <strong>{activeHostname}</strong> is linked to ACN Link. HTTPS may take a few minutes to finish
              worldwide.
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
          <div className="acn-domain-remove-dialog animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
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
