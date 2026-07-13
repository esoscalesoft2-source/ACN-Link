import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X
} from "lucide-react";
import type { BioPage, CustomDomain } from "../types";
import { isValidHostname, normaliseHostname } from "../storage/publishStorage";
import PageShell, { PageHeader, SectionCard } from "./layout/PageShell";

interface CustomDomainsScreenProps {
  domains: CustomDomain[];
  pages: BioPage[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => Promise<void>;
  onConnectDomain: (domainName: string, pageId: string) => Promise<void>;
  onVerifyDomain: (id: string) => Promise<void>;
  onDeleteDomain: (id: string) => Promise<void>;
}

function statusBadge(domain: CustomDomain) {
  const verified = domain.status === "Verified";
  const failed = domain.status === "Error" || domain.providerStatus === "error";
  const Icon = verified ? CheckCircle : failed ? AlertCircle : Clock;
  const colors = verified
    ? "bg-emerald-50 text-emerald-700"
    : failed
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}>
      <Icon className="h-3.5 w-3.5" />
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
  onDeleteDomain
}: CustomDomainsScreenProps) {
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

  const filteredDomains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return domains.filter((domain) => !query || domain.domainName.includes(query));
  }, [domains, searchQuery]);

  const triggerToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

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
    setPageId(pages[0]?.id || "");
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
      setFormError("Enter a valid hostname, for example links.mybrand.com.");
      return;
    }
    if (!pageId) {
      setFormError("Select the website that this domain should open.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      await onConnectDomain(hostname, pageId);
      setIsAdding(false);
      resetForm();
      triggerToast(`"${hostname}" was registered. Add the shown DNS record, then verify.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to connect domain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verify = async (domain: CustomDomain) => {
    setVerifyingId(domain.id);
    try {
      await onVerifyDomain(domain.id);
      triggerToast(
        domain.status === "Verified"
          ? "Domain and SSL status refreshed."
          : "DNS checked. SSL provisioning can take several minutes."
      );
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "DNS verification failed.");
    } finally {
      setVerifyingId(null);
    }
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

  return (
    <PageShell>
      <PageHeader
        title="Custom Domains"
        subtitle="Connect a domain to a published website with real DNS verification and managed HTTPS."
        actions={
          <button
            type="button"
            onClick={openAdd}
            disabled={pages.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Connect Domain
          </button>
        }
      />

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
        <p className="font-bold">How it works</p>
        <p className="mt-1 text-indigo-800">
          Choose a website → add the CNAME at your DNS provider → Verify DNS → wait for SSL to become
          Active. ACN Link never marks a domain verified without checking live DNS and provider status.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span>{loadError}</span>
          <button type="button" onClick={() => void onReload()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-black">{domains.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Verified</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {domains.filter((domain) => domain.status === "Verified").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {domains.filter((domain) => domain.status !== "Verified").length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value.toLowerCase())}
          placeholder="Search domains..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm"
        />
      </div>

      <SectionCard>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading domains…
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="mx-auto h-10 w-10 text-indigo-400" />
            <h3 className="mt-3 font-bold">No custom domains connected</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pages.length
                ? "Connect a subdomain such as links.yourbrand.com."
                : "Create and publish a website before connecting a domain."}
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
                      Opens: {pageName(domain.pageId)} · SSL: {domain.sslStatus}
                    </p>
                    {domain.errorMessage && (
                      <p className="mt-2 max-w-2xl text-xs text-rose-600">{domain.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
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
                    <a
                      href={`https://${domain.domainName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                      title="Open website"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
      </SectionCard>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Connect Custom Domain</h3>
              <button type="button" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-slate-600">
                Domain name
                <input
                  autoFocus
                  value={domainName}
                  onChange={(event) => setDomainName(event.target.value)}
                  placeholder="links.mybrand.com"
                  className="mt-1.5 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Website to open
                <select
                  value={pageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm"
                >
                  <option value="">Select a website</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title} ({page.status})
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-800">
                After registration, ACN Link will show the exact CNAME target and SSL validation status.
              </div>
              {formError && <p className="text-xs font-medium text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dnsHelpDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">DNS & SSL setup</h3>
              <button type="button" onClick={() => setDnsHelpDomain(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              At the DNS provider for <strong>{dnsHelpDomain.domainName}</strong>, create:
            </p>
            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Type</span><strong>CNAME</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Name</span>
                <code className="break-all text-right">{dnsHelpDomain.domainName}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Target</span>
                <button
                  type="button"
                  onClick={() => void copy("target", dnsHelpDomain.dnsTarget)}
                  className="inline-flex items-center gap-1 break-all text-right font-mono text-xs"
                >
                  {dnsHelpDomain.dnsTarget}
                  {copiedKey === "target" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
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
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${verifyingId === dnsHelpDomain.id ? "animate-spin" : ""}`} />
              Check DNS and SSL now
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-6 right-6 z-[60] rounded-2xl bg-slate-950 px-5 py-3 text-xs font-bold text-white sm:left-auto">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
