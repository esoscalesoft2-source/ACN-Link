import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { BioPage, CustomDomain, CustomDomainPlatformConfig } from "../../types";
import { analyzeDomain, type DomainAnalysis } from "../../lib/domainApi";
import { buildDnsRecordSet, customDomainValidationError, getCustomDomainKind, getDnsZoneDomain } from "../../lib/customDomainDns";
import { isValidHostname, normaliseHostname } from "../../storage/publishStorage";
import SearchablePagePicker from "./SearchablePagePicker";
import DnsProviderBrand from "./DnsProviderBrand";
import { getProviderBranding } from "../../lib/dnsProviderBranding";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, Eye, EyeOff, Globe, Loader2, Lock, User, X } from "lucide-react";

type WizardPhase = "domain" | "analyzing" | "provider" | "dns" | "success";

interface ConnectDomainWizardProps {
  open: boolean;
  pages: BioPage[];
  linkedDomainsByPageId: Map<string, CustomDomain>;
  platformConfig: CustomDomainPlatformConfig | null;
  resumeDomain?: CustomDomain | null;
  onClose: () => void;
  onVerify: (id: string) => Promise<CustomDomain>;
  onComplete: (input: {
    domainName: string;
    pageId: string;
    existingDomain?: CustomDomain | null;
  }) => Promise<void>;
}

function progressIndex(phase: WizardPhase): number {
  if (phase === "domain") return 0;
  if (phase === "analyzing") return 1;
  if (phase === "provider") return 2;
  if (phase === "dns") return 3;
  return 4;
}

export default function ConnectDomainWizard({
  open,
  pages,
  linkedDomainsByPageId,
  platformConfig,
  resumeDomain,
  onClose,
  onVerify,
  onComplete
}: ConnectDomainWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>("domain");
  const [domainName, setDomainName] = useState("");
  const [pageId, setPageId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedDomain, setConnectedDomain] = useState<CustomDomain | null>(null);
  const [analysis, setAnalysis] = useState<DomainAnalysis | null>(null);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [providerUsername, setProviderUsername] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [showProviderPassword, setShowProviderPassword] = useState(false);

  const firstAvailablePageId = pages.find((page) => !linkedDomainsByPageId.has(page.id))?.id || "";
  const isResume = Boolean(resumeDomain);

  useEffect(() => {
    if (!open) return;
    if (resumeDomain) {
      setConnectedDomain(resumeDomain);
      setDomainName(resumeDomain.domainName);
      setPageId(resumeDomain.pageId || firstAvailablePageId);
      setPhase("dns");
      void analyzeDomain(resumeDomain.domainName)
        .then(setAnalysis)
        .catch(async () => {
          const fallback = await analyzeDomain(resumeDomain.domainName).catch(() => null);
          setAnalysis(
            fallback ?? {
              domainName: resumeDomain.domainName,
              providerId: "unknown",
              providerName: "DNS Provider",
              nameservers: []
            }
          );
        });
    } else {
      setPhase("domain");
      setDomainName("");
      setPageId(firstAvailablePageId);
      setConnectedDomain(null);
      setAnalysis(null);
    }
    setFormError("");
    setAnalyzeStep(0);
    setCopiedIds(new Set());
    setVerifyError(null);
    setProviderUsername("");
    setProviderPassword("");
    setShowProviderPassword(false);
  }, [open, firstAvailablePageId, resumeDomain]);

  useEffect(() => {
    if (phase === "dns") {
      setCopiedIds(new Set());
      setVerifyError(null);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "analyzing" || isResume) return;
    let cancelled = false;

    const run = async () => {
      setAnalyzeStep(0);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      if (cancelled) return;
      setAnalyzeStep(1);

      try {
        const result = await analyzeDomain(normaliseHostname(domainName));
        if (cancelled) return;
        setAnalysis(result);
      } catch {
        if (cancelled) return;
        const fallback = await analyzeDomain(normaliseHostname(domainName)).catch(() => null);
        setAnalysis(
          fallback ?? {
            domainName: normaliseHostname(domainName),
            providerId: "unknown",
            providerName: "DNS Provider",
            nameservers: []
          }
        );
      }

      await new Promise((resolve) => window.setTimeout(resolve, 900));
      if (cancelled) return;
      setAnalyzeStep(2);

      await new Promise((resolve) => window.setTimeout(resolve, 800));
      if (cancelled) return;
      setPhase("provider");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [phase, domainName, isResume]);

  const activeHostname = connectedDomain?.domainName || normaliseHostname(domainName);
  const dnsSet = useMemo(() => {
    if (!platformConfig || !activeHostname) return null;
    return buildDnsRecordSet(activeHostname, platformConfig.aRecordTarget, {
      cnameTarget: platformConfig.cnameTarget,
      platformUrl: platformConfig.platformUrl
    });
  }, [activeHostname, platformConfig]);

  const providerBranding = getProviderBranding(analysis?.providerId || "unknown", analysis?.providerName);
  const providerName = providerBranding.displayName;
  const providerHelpUrl =
    platformConfig?.registrars.find((item) => item.id === analysis?.providerId)?.dnsHelpUrl ||
    platformConfig?.registrars.find((item) => item.name === providerName)?.dnsHelpUrl ||
    platformConfig?.registrars[0]?.dnsHelpUrl;

  const copyValue = async (recordId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIds((current) => new Set([...current, recordId]));
    } catch {
      setFormError("Copy failed — select the value and copy manually.");
    }
  };

  const submitDomain = (event: FormEvent) => {
    event.preventDefault();
    const hostname = normaliseHostname(domainName);
    const domainError = customDomainValidationError(hostname);
    if (domainError) {
      setFormError(domainError);
      return;
    }
    if (!isValidHostname(hostname)) {
      setFormError("Enter a valid domain or subdomain, for example yourbrand.com or studio.yourbrand.com.");
      return;
    }
    setFormError("");
    setPhase("analyzing");
  };

  const continueFromProvider = () => {
    setVerifyError(null);
    setCopiedIds(new Set());
    setPhase("dns");
  };

  const confirmDnsAdded = async () => {
    if (!allRecordsCopied) return;
    setVerifyError(null);
    setIsSubmitting(true);
    try {
      if (connectedDomain) {
        const updated = await onVerify(connectedDomain.id);
        setConnectedDomain(updated);
        if (
          updated.status === "Verified" ||
          updated.status === "DNS Verified" ||
          updated.status === "Provisioning SSL"
        ) {
          setPageId(updated.pageId || pageId || firstAvailablePageId);
          setPhase("success");
        } else {
          setVerifyError(
            updated.errorMessage ||
              updated.setupHint ||
              "DNS not detected yet. Wait a few minutes and try again."
          );
        }
        return;
      }

      setPageId(firstAvailablePageId);
      setPhase("success");
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishWizard = async () => {
    if (!pageId) {
      setFormError("Choose which published page should open on this address.");
      return;
    }
    const linkedDomain = linkedDomainsByPageId.get(pageId);
    if (linkedDomain && linkedDomain.id !== connectedDomain?.id) {
      setFormError(`That page is already connected to ${linkedDomain.domainName}.`);
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    try {
      await onComplete({
        domainName: activeHostname,
        pageId,
        existingDomain: connectedDomain
      });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to connect domain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const dnsZoneDomain = getDnsZoneDomain(activeHostname);
  const domainKind = getCustomDomainKind(activeHostname);
  const recordCount = dnsSet?.records.length || 0;
  const recordFullyCopied = (recordId: string) =>
    copiedIds.has(recordId) && copiedIds.has(`${recordId}-val`);
  const copiedRecordCount =
    dnsSet?.records.filter((record) => recordFullyCopied(record.id)).length || 0;
  const allRecordsCopied = recordCount > 0 && copiedRecordCount === recordCount;
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
                if (phase === "provider") setPhase(isResume ? "domain" : "domain");
                if (phase === "dns") setPhase(isResume ? "domain" : "provider");
                if (phase === "analyzing") setPhase("domain");
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
                <Globe className="h-8 w-8" />
              </div>
              <h2 className="acn-domain-wizard__title">What domain would you like to connect with ACN Link?</h2>
              <p className="acn-domain-wizard__lead">
                Enter the website address you already own. GoDaddy, Namecheap, Cloudflare, Hostinger, and others work
                the same way.
              </p>
            </div>

            <label className="acn-domain-wizard__label" htmlFor="wizard-domain">
              Your website address (domain)
            </label>
            <input
              id="wizard-domain"
              autoFocus
              value={domainName}
              onChange={(event) => setDomainName(event.target.value)}
              placeholder="yourbrand.com or studio.yourbrand.com"
              className="acn-domain-wizard__input"
            />
            <p className="mt-2 text-xs text-slate-500">
              Root domain example: <strong>yourbrand.com</strong> (A records for <strong>@</strong> and{" "}
              <strong>www</strong>). Subdomain example: <strong>studio.yourbrand.com</strong> or{" "}
              <strong>links.yourbrand.com</strong> (one CNAME record).
            </p>

            {formError && <p className="acn-domain-wizard__error">{formError}</p>}

            <button type="submit" className="acn-domain-wizard__primary">
              Continue
            </button>
          </form>
        )}

        {phase === "analyzing" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__analyze-art" aria-hidden />
            <h2 className="acn-domain-wizard__title">Analyzing your domain</h2>
            <ul className="acn-domain-wizard__checklist">
              <li>
                {analyzeStep >= 1 ? (
                  <Check className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                )}
                Analyzed <strong>{normaliseHostname(domainName)}</strong>
              </li>
              <li>
                {analyzeStep >= 2 ? (
                  <Check className="h-4 w-4 text-indigo-600" />
                ) : analyzeStep >= 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <span className="inline-block h-4 w-4 rounded-full bg-slate-200" />
                )}
                Detected DNS provider: <strong>{analysis?.providerName || "…"}</strong>
              </li>
              <li>
                {analyzeStep >= 2 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <span className="inline-block h-4 w-4 rounded-full bg-slate-200" />
                )}
                Getting your setup details
              </li>
            </ul>
          </div>
        )}

        {phase === "provider" && analysis && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--provider">
            <DnsProviderBrand
              providerId={analysis.providerId}
              providerName={analysis.providerName}
              domainName={analysis.domainName}
            />
            <p className="acn-domain-wizard__provider-lead">
              By logging in with your {providerName} details, you give us{" "}
              <strong>one-time permission</strong> to connect your domain.
            </p>

            <div className="acn-domain-wizard__provider-field">
              <User className="acn-domain-wizard__provider-field-icon" />
              <input
                id="provider-username"
                value={providerUsername}
                onChange={(event) => setProviderUsername(event.target.value)}
                placeholder="Username or Customer #"
                className="acn-domain-wizard__provider-input"
                autoComplete="username"
              />
            </div>

            <div className="acn-domain-wizard__provider-field">
              <Lock className="acn-domain-wizard__provider-field-icon" />
              <input
                id="provider-password"
                type={showProviderPassword ? "text" : "password"}
                value={providerPassword}
                onChange={(event) => setProviderPassword(event.target.value)}
                placeholder="Password"
                className="acn-domain-wizard__provider-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="acn-domain-wizard__provider-toggle"
                onClick={() => setShowProviderPassword((current) => !current)}
                aria-label={showProviderPassword ? "Hide password" : "Show password"}
              >
                {showProviderPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button type="button" className="acn-domain-wizard__provider-forgot">
              Forgot password?
            </button>

            <button type="button" className="acn-domain-wizard__primary" onClick={continueFromProvider}>
              Continue
            </button>

            <p className="acn-domain-wizard__provider-legal">
              ACN Link is not affiliated with or sponsored by {providerName}. {providerName} is a registered
              trademark used for identification only.
            </p>

            <p className="acn-domain-wizard__provider-manual">
              If you can&apos;t log in or you signed up with a social account, you&apos;ll need to{" "}
              <button type="button" className="acn-domain-wizard__provider-manual-link" onClick={continueFromProvider}>
                go to our manual setup
              </button>
              .
            </p>
          </div>
        )}

        {phase === "dns" && dnsSet && (
          <div className="acn-domain-wizard__body">
            <div className="acn-domain-wizard__info-banner">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Social login not supported</span>
            </div>

            <h2 className="acn-domain-wizard__title">Please add these records</h2>
            <p className="acn-domain-wizard__lead">
              Log in to <strong>{providerName}</strong> for <strong>{dnsZoneDomain}</strong>, open DNS settings, and add
              each row below.
            </p>
            {domainKind === "subdomain" && (
              <p className="acn-domain-wizard__lead mt-2 text-sm">
                Connecting <strong>{activeHostname}</strong> — add this record in the DNS zone for{" "}
                <strong>{dnsZoneDomain}</strong>.
              </p>
            )}

            <div className="acn-domain-wizard__dns-table">
              <div className="acn-domain-wizard__dns-head">
                <span>Record type</span>
                <span>Host name</span>
                <span>Required value</span>
              </div>
              {dnsSet.records.map((record) => (
                <div key={record.id} className="acn-domain-wizard__dns-row">
                  <span className="font-semibold">{record.type}</span>
                  <button
                    type="button"
                    className={`acn-domain-wizard__copy ${copiedIds.has(record.id) ? "is-copied" : ""}`}
                    onClick={() => void copyValue(record.id, record.hostLabel)}
                  >
                    {record.hostDisplay}
                    {copiedIds.has(record.id) ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    className={`acn-domain-wizard__copy ${copiedIds.has(`${record.id}-val`) ? "is-copied" : ""}`}
                    onClick={() => void copyValue(`${record.id}-val`, record.value)}
                  >
                    <span className="font-mono text-xs">{record.value}</span>
                    {copiedIds.has(`${record.id}-val`) ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

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

            <p className="acn-domain-wizard__footnote">
              After updating records at your provider, changes may take up to 48 hours to propagate worldwide.
            </p>

            <button
              type="button"
              disabled={!allRecordsCopied || isSubmitting}
              className={`acn-domain-wizard__primary ${allRecordsCopied ? "" : "is-disabled"}`}
              onClick={() => void confirmDnsAdded()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              I have added {copiedRecordCount}/{recordCount} records above to my domain&apos;s provider
            </button>
          </div>
        )}

        {phase === "success" && (
          <div className="acn-domain-wizard__body acn-domain-wizard__body--center">
            <div className="acn-domain-wizard__success-icon">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="acn-domain-wizard__title">You&apos;re all set!</h2>
            <p className="acn-domain-wizard__lead">
              If you set up the DNS records on the prior screen,{" "}
              <strong>{activeHostname}</strong> will be successfully connected.
            </p>

            <div className="mt-5 text-left">
              <label className="acn-domain-wizard__label">
                Which published page should open on this address?
              </label>
              <SearchablePagePicker
                pages={pages}
                value={pageId}
                onChange={setPageId}
                linkedDomainsByPageId={linkedDomainsByPageId}
              />
            </div>

            {formError && <p className="acn-domain-wizard__error">{formError}</p>}

            <button
              type="button"
              disabled={!pageId || isSubmitting}
              className="acn-domain-wizard__primary disabled:opacity-50"
              onClick={() => void finishWizard()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Done
            </button>
            <button type="button" className="acn-domain-wizard__link" onClick={() => setPhase("dns")}>
              &laquo; See records again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
