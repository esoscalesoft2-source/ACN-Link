import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { screenToPath } from "../navigation";
import { ScreenId } from "../types";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
  ChevronDown
} from "lucide-react";
import type { BioPage, CustomDomain, CustomDomainPlatformConfig } from "../types";
import { isValidHostname, normaliseHostname } from "../storage/publishStorage";
import { syncLocalPageDocumentToServer } from "../storage/bioBuilderStorage";
import { fetchCustomDomainPlatformConfig } from "../lib/domainApi";
import { buildDnsInstructions } from "../lib/customDomainDns";
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

function isDomainLive(domain: CustomDomain) {
  return domain.status === "Verified" || domain.status === "DNS Verified";
}

function matchesConnectPageSearch(page: BioPage, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [page.title, page.id, page.slug, page.status, page.handle || ""]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

interface SearchablePagePickerProps {
  pages: BioPage[];
  value: string;
  onChange: (pageId: string) => void;
  linkedDomainsByPageId: Map<string, CustomDomain>;
  placeholder?: string;
}

function SearchablePagePicker({
  pages,
  value,
  onChange,
  linkedDomainsByPageId,
  placeholder = "Choose your live page"
}: SearchablePagePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
    [pages]
  );

  const filteredPages = useMemo(
    () => sortedPages.filter((page) => matchesConnectPageSearch(page, query)),
    [sortedPages, query]
  );

  const availableCount = useMemo(
    () => pages.filter((page) => !linkedDomainsByPageId.has(page.id)).length,
    [pages, linkedDomainsByPageId]
  );

  const selectedPage = pages.find((page) => page.id === value);

  const trySelectPage = (page: BioPage) => {
    const linkedDomain = linkedDomainsByPageId.get(page.id);
    if (linkedDomain) {
      window.alert(
        `"${page.title}" is already connected to ${linkedDomain.domainName}.\n\nEach bio page can only be linked to one custom domain. Remove it from that domain first, or choose a different page.`
      );
      return;
    }
    onChange(page.id);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="acn-page-picker" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="acn-page-picker__trigger w-full text-left flex items-center justify-between gap-2"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`acn-page-picker__trigger-label truncate ${selectedPage ? "" : "is-placeholder"}`}>
          {selectedPage ? `${selectedPage.title} (${selectedPage.status})` : placeholder}
        </span>
        <ChevronDown
          className={`acn-page-picker__chevron h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="acn-page-picker__menu">
          <div className="acn-page-picker__search">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search page name, ID, slug, or status…"
              className="acn-page-picker__search-input"
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </div>

          <ul className="acn-page-picker__list" role="listbox">
            {filteredPages.length === 0 ? (
              <li className="acn-page-picker__empty">No pages match your search.</li>
            ) : (
              filteredPages.map((page) => {
                const linkedDomain = linkedDomainsByPageId.get(page.id);
                const isLocked = Boolean(linkedDomain);
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={page.id === value}
                      aria-disabled={isLocked}
                      className={`acn-page-picker__option ${
                        page.id === value ? "acn-page-picker__option--selected" : ""
                      } ${isLocked ? "acn-page-picker__option--locked" : ""}`}
                      onClick={() => trySelectPage(page)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="acn-page-picker__option-title block truncate">{page.title}</span>
                        {linkedDomain ? (
                          <span className="acn-page-picker__option-linked block truncate">
                            Already used on {linkedDomain.domainName}
                          </span>
                        ) : (
                          <span className="acn-page-picker__option-id block truncate">{page.id}</span>
                        )}
                      </span>
                      {isLocked ? (
                        <span className="acn-page-picker__status acn-page-picker__status--in-use">In use</span>
                      ) : (
                        <span
                          className={`acn-page-picker__status acn-page-picker__status--${page.status.toLowerCase()}`}
                        >
                          {page.status}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <p className="acn-page-picker__footer">
            {availableCount} available · Showing {filteredPages.length} of {pages.length}
          </p>
        </div>
      )}
    </div>
  );
}

function isDomainFullyVerified(domain: CustomDomain) {
  return domain.status === "Verified";
}

function statusBadge(domain: CustomDomain) {
  const live = isDomainLive(domain);
  const verified = isDomainFullyVerified(domain);
  const failed = domain.status === "Error" || domain.providerStatus === "error";
  const provisioning = domain.status === "Provisioning SSL";
  const Icon = verified ? CheckCircle : failed ? AlertCircle : provisioning ? Loader2 : Clock;
  const colors = verified
    ? "bg-emerald-50 text-emerald-700"
    : live
      ? "bg-sky-50 text-sky-700"
      : failed
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}>
      <Icon className={`h-3.5 w-3.5 ${provisioning ? "animate-spin" : ""}`} />
      {domain.status}
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
  const [isAdding, setIsAdding] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [pageId, setPageId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dnsHelpDomain, setDnsHelpDomain] = useState<CustomDomain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [platformConfig, setPlatformConfig] = useState<CustomDomainPlatformConfig | null>(null);

  useEffect(() => {
    fetchCustomDomainPlatformConfig()
      .then(setPlatformConfig)
      .catch(() => setPlatformConfig(null));
  }, []);

  const filteredDomains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return domains.filter((domain) => !query || domain.domainName.includes(query));
  }, [domains, searchQuery]);

  const linkedDomainsByPageId = useMemo(() => {
    const map = new Map<string, CustomDomain>();
    for (const domain of domains) {
      if (domain.pageId) map.set(domain.pageId, domain);
    }
    return map;
  }, [domains]);

  const firstAvailablePageId = useMemo(() => {
    return pages.find((page) => !linkedDomainsByPageId.has(page.id))?.id || "";
  }, [pages, linkedDomainsByPageId]);

  const triggerToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    if (!isAdding) return;
    document.body.classList.add("acn-connect-domain-modal-open");
    return () => document.body.classList.remove("acn-connect-domain-modal-open");
  }, [isAdding]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      triggerToast("Copy failed. Select and copy the value manually.");
    }
  };

  const resetForm = () => {
    setDomainName("");
    setPageId(firstAvailablePageId);
    setFormError("");
  };

  const openAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const hostname = normaliseHostname(domainName);
    if (!isValidHostname(hostname)) {
      setFormError("Enter a full website address, for example links.yourbrand.com.");
      return;
    }
    if (!pageId) {
      setFormError("Choose which published page should open when someone visits this address.");
      return;
    }
    const linkedDomain = linkedDomainsByPageId.get(pageId);
    if (linkedDomain) {
      const pageTitle = pages.find((page) => page.id === pageId)?.title || "This page";
      const message = `"${pageTitle}" is already connected to ${linkedDomain.domainName}. Each page can only use one custom domain.`;
      setFormError(message);
      window.alert(message);
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const created = await onConnectDomain(hostname, pageId);
      setIsAdding(false);
      resetForm();
      setDnsHelpDomain(created);
      triggerToast(`"${hostname}" connected. Add the DNS record below, then verify.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to connect domain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verify = async (domain: CustomDomain) => {
    await verifyAndSync(domain);
  };

  const remove = async (domain: CustomDomain) => {
    if (!window.confirm(`Remove "${domain.domainName}" from ACN Link and the SSL provider?`)) return;
    setDeletingId(domain.id);
    try {
      await onDeleteDomain(domain.id);
      if (dnsHelpDomain?.id === domain.id) setDnsHelpDomain(null);
      triggerToast(`"${domain.domainName}" removed.`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Unable to remove domain.");
    } finally {
      setDeletingId(null);
    }
  };

  const pageName = (id: string) => pages.find((page) => page.id === id)?.title || "Published website";

  const openLiveWebsite = async (domain: CustomDomain) => {
    const page = pages.find((item) => item.id === domain.pageId);
    await syncLocalPageDocumentToServer(domain.pageId, page?.slug);
    window.open(`https://${domain.domainName}`, "_blank", "noopener,noreferrer");
  };

  const editLinkedPage = (domain: CustomDomain, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();

    const page = pages.find((item) => item.id === domain.pageId);
    if (!page) {
      triggerToast("Linked page not found. Refresh and try again.");
      return;
    }

    const params = new URLSearchParams({
      edit: domain.pageId,
      source: "domain"
    });
    navigate(`${screenToPath(ScreenId.BIO_PAGES)}?${params.toString()}`);
    onEditPage(domain.pageId, { fromCustomDomain: true });
    triggerToast(`Opening Bio Pages editor for "${page.title}". Publish to update ${domain.domainName}.`);
  };

  const verifyAndSync = async (domain: CustomDomain) => {
    setVerifyingId(domain.id);
    try {
      const page = pages.find((item) => item.id === domain.pageId);
      await syncLocalPageDocumentToServer(domain.pageId, page?.slug);
      const updated = await onVerifyDomain(domain.id);
      if (dnsHelpDomain?.id === updated.id) {
        setDnsHelpDomain(updated);
      }
      if (updated.status === "Verified") {
        triggerToast(`${updated.domainName} is live with HTTPS.`);
      } else if (isDomainLive(updated)) {
        triggerToast(
          platformConfig?.selfServeEnabled
            ? `${updated.domainName} DNS verified. SSL is provisioning — check again in a few minutes.`
            : `${updated.domainName} DNS verified.`
        );
      } else {
        triggerToast(updated.setupHint || updated.errorMessage || "DNS not detected yet. Check your CNAME record.");
      }
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "DNS verification failed.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Custom Domains"
        subtitle="Connect your own domain so visitors open links.yourbrand.com instead of the default ACN Link address."
        actions={
          <button
            type="button"
            onClick={openAdd}
            disabled={pages.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl acn-btn-chip px-5 py-2.5 text-sm disabled:opacity-50"
            title={pages.length === 0 ? "Publish a website first, then connect your domain" : undefined}
          >
            <Plus className="h-4 w-4" />
            Connect Domain
          </button>
        }
      />

      <div className="acn-banner-info">
        <p className="font-bold">How it works — self-serve for every user</p>
        {platformConfig?.selfServeEnabled ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-indigo-800">
            <li>Click <strong>Connect Domain</strong> and enter your address (e.g. links.yourbrand.com).</li>
            <li>
              At GoDaddy, Namecheap, Cloudflare, or any DNS provider, add one CNAME pointing to{" "}
              <code className="font-mono text-xs">{platformConfig.cnameTarget}</code>.
            </li>
            <li>Click <strong>Check DNS and SSL</strong>. HTTPS is issued automatically — no manual Cloudflare setup.</li>
          </ol>
        ) : (
          <div className="mt-2 space-y-2 text-indigo-800">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Click <strong>Connect Domain</strong> and pick your published page.</li>
              <li>
                Add a CNAME at your DNS provider →{" "}
                <code className="font-mono text-xs">
                  {platformConfig?.cnameTarget || "domains.acnlink.mindflo.today"}
                </code>
                .
              </li>
              <li>Click <strong>Check DNS and SSL</strong> after DNS propagates.</li>
            </ol>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Platform automatic SSL is not enabled yet. Your administrator must set{" "}
              <code className="font-mono">CLOUDFLARE_API_TOKEN</code> and{" "}
              <code className="font-mono">CLOUDFLARE_ZONE_ID</code> on Railway so every customer can connect
              without manual Cloudflare work per domain.
            </p>
          </div>
        )}
      </div>

      {loadError && (
        <div className="acn-banner-error">
          <span>{loadError}</span>
          <button type="button" onClick={() => void onReload()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="acn-glass-card p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-black">{domains.length}</p>
        </div>
        <div className="acn-glass-card p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Live</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {domains.filter((domain) => isDomainLive(domain)).length}
          </p>
        </div>
        <div className="acn-glass-card p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {domains.filter((domain) => !isDomainLive(domain)).length}
          </p>
        </div>
      </div>

      <div className="acn-icon-field">
        <span className="acn-icon-field__icon">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value.toLowerCase())}
          placeholder="Search domains..."
          className="acn-input acn-icon-field__input w-full py-2.5"
        />
      </div>

      <SectionCard>
        <Workspace>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading domains…
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-6 text-center">
            <Globe className="mx-auto h-10 w-10 text-indigo-400" />
            <h3 className="mt-3 font-bold">No custom domains connected</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pages.length
                ? "Use your own address like links.yourbrand.com so visitors see your brand, not acnlink.mindflo.today."
                : "Publish a website first, then come back here to connect your own domain."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDomains.map((domain) => (
              <div key={domain.id} className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{domain.domainName}</p>
                      {statusBadge(domain)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Opens: {pageName(domain.pageId)} · Page ID: {domain.pageId} · SSL: {domain.sslStatus}
                    </p>
                    {(domain.setupHint || domain.errorMessage) && (
                      <p
                        className={`mt-2 max-w-2xl text-xs ${
                          domain.errorMessage && !isDomainLive(domain)
                            ? "text-rose-600"
                            : "text-slate-600"
                        }`}
                      >
                        {domain.setupHint || domain.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDnsHelpDomain(domain)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                      title="DNS setup"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={verifyingId === domain.id}
                      onClick={() => void verify(domain)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                      title="Verify DNS and SSL"
                    >
                      <RefreshCw className={`h-4 w-4 ${verifyingId === domain.id ? "animate-spin" : ""}`} />
                    </button>
                    {isDomainLive(domain) && (
                      <button
                        type="button"
                        onClick={(event) => editLinkedPage(domain, event)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                        title={`Edit Bio Page for ${domain.domainName}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void openLiveWebsite(domain);
                      }}
                      className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                      title="Open live website in a new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === domain.id}
                      onClick={() => void remove(domain)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      title="Remove domain"
                    >
                      {deletingId === domain.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </Workspace>
      </SectionCard>

      {isAdding &&
        createPortal(
        <div className="acn-modal-backdrop acn-workflow-modal-backdrop">
          <div className="acn-modal-panel acn-workflow-modal acn-workflow-modal--domain animate-in fade-in zoom-in-95 duration-200">
            <div className="acn-workflow-modal__accent" aria-hidden />
            <header className="acn-workflow-modal__header">
              <div className="acn-workflow-modal__brand">
                <div className="acn-workflow-modal__icon acn-workflow-modal__icon--domain">
                  <Globe />
                </div>
                <div className="acn-workflow-modal__titles">
                  <h3 className="acn-workflow-modal__title">Connect Your Own Website Address</h3>
                  <p className="acn-workflow-modal__subtitle">
                    Use your brand domain (e.g. links.yourbrand.com) instead of the default ACN Link URL.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={isSubmitting}
                className="acn-workflow-modal__close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={submit} className="acn-workflow-modal__form">
              <div className="acn-workflow-modal__field">
                <label className="acn-workflow-modal__label" htmlFor="connect-domain-name">
                  Your website address (domain)
                </label>
                <input
                  id="connect-domain-name"
                  autoFocus
                  value={domainName}
                  onChange={(event) => setDomainName(event.target.value)}
                  placeholder="e.g. links.yourbrand.com"
                  className="acn-workflow-modal__input"
                />
                <p className="acn-workflow-modal__hint">
                  The address you own or bought from GoDaddy, Namecheap, Cloudflare, etc.
                </p>
              </div>

              <div className="acn-workflow-modal__field">
                <span className="acn-workflow-modal__label">
                  Which published page should open on this address?
                </span>
                <SearchablePagePicker
                  pages={pages}
                  value={pageId}
                  onChange={setPageId}
                  linkedDomainsByPageId={linkedDomainsByPageId}
                />
                <p className="acn-workflow-modal__hint">
                  Search by page name or ID. Pages already on another custom domain show{" "}
                  <strong>In use</strong> and cannot be selected again.
                </p>
              </div>

              <div className="acn-workflow-modal__note">
                Next step: add one CNAME at your DNS provider pointing to{" "}
                <code className="font-mono text-xs">
                  {platformConfig?.cnameTarget || "domains.acnlink.mindflo.today"}
                </code>
                . {platformConfig?.selfServeEnabled ? "HTTPS is automatic." : "Then verify here."}
              </div>

              {formError && <p className="acn-workflow-modal__error">{formError}</p>}

              <div className="acn-workflow-modal__actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="acn-workflow-modal__submit acn-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Connect This Address
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {dnsHelpDomain && (() => {
        const dns = buildDnsInstructions(dnsHelpDomain.domainName, dnsHelpDomain.dnsTarget);
        return (
        <div className="acn-modal-backdrop">
          <div className="acn-modal-panel max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">DNS setup for {dnsHelpDomain.domainName}</h3>
              <button type="button" onClick={() => setDnsHelpDomain(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Log in to your DNS provider for{" "}
              <strong>{dns.fullHostname.split(".").slice(1).join(".") || dns.fullHostname}</strong>{" "}
              (GoDaddy, Namecheap, Cloudflare, etc.) and add this record:
            </p>
            <div className="mt-4 space-y-3 rounded-2xl acn-glass-card p-4 text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Record type</span><strong>CNAME</strong>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-400">Host / Name</span>
                <button
                  type="button"
                  onClick={() => void copy("host", dns.hostLabel === "@" ? "@" : dns.hostLabel)}
                  className="inline-flex items-center gap-1 break-all text-right font-mono text-xs"
                >
                  {dns.hostDisplay}
                  {copiedKey === "host" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Full hostname</span>
                <code className="break-all text-right text-xs">{dns.fullHostname}</code>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-400">Points to (Target)</span>
                <button
                  type="button"
                  onClick={() => void copy("target", dns.pointsTo)}
                  className="inline-flex items-center gap-1 break-all text-right font-mono text-xs"
                >
                  {dns.pointsTo}
                  {copiedKey === "target" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {platformConfig?.selfServeEnabled ? (
              <p className="mt-4 acn-banner-info text-xs">
                After saving DNS, click <strong>Check DNS and SSL now</strong>. ACN Link registers your hostname
                and issues HTTPS automatically — you do not need to create anything manually in Cloudflare.
              </p>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                DNS verification works for all users. For fully automatic HTTPS on every customer domain, your
                platform admin must enable Cloudflare for SaaS on Railway (see{" "}
                <code className="font-mono">docs/custom-domains-production.md</code>).
              </p>
            )}
            {dnsHelpDomain.ownershipVerification && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-bold">Additional SSL ownership verification</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(dnsHelpDomain.ownershipVerification, null, 2)}
                </pre>
              </div>
            )}
            <button
              type="button"
              onClick={() => void verify(dnsHelpDomain)}
              disabled={verifyingId === dnsHelpDomain.id}
              className="mt-5 flex w-full acn-btn-chip py-2.5 text-sm font-bold disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${verifyingId === dnsHelpDomain.id ? "animate-spin" : ""}`} />
              Check DNS and SSL now
            </button>
          </div>
        </div>
        );
      })()}

      {toast && (
        <div className="acn-toast">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
