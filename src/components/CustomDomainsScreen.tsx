import React, { useMemo, useState } from "react";
import { CustomDomain } from "../types";
import { isValidHostname, normaliseHostname } from "../storage/publishStorage";
import {
  Globe,
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  X,
  RefreshCw,
  Search,
  Copy,
  Check,
  ExternalLink,
  Shield
} from "lucide-react";
import PageShell, { PageHeader, SectionCard } from "./layout/PageShell";

interface CustomDomainsScreenProps {
  domains: CustomDomain[];
  onConnectDomain: (domainName: string) => void;
  onUpdateDomain: (domain: CustomDomain) => void;
  onDeleteDomain: (id: string) => void;
}

export const CUSTOM_DOMAIN_TARGET_IP = "74.201.218.45";

function statusBadge(status: CustomDomain["status"]) {
  if (status === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
        <CheckCircle className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

export default function CustomDomainsScreen({
  domains,
  onConnectDomain,
  onUpdateDomain,
  onDeleteDomain
}: CustomDomainsScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [dnsHelpDomain, setDnsHelpDomain] = useState<CustomDomain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CustomDomain["status"]>("All");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const filteredDomains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return domains.filter((domain) => {
      const matchesSearch =
        !query ||
        domain.domainName.toLowerCase().includes(query) ||
        domain.targetIp.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || domain.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [domains, searchQuery, statusFilter]);

  const verifiedCount = domains.filter((d) => d.status === "Verified").length;
  const pendingCount = domains.filter((d) => d.status === "Pending").length;
  const hasFilters = searchQuery.trim().length > 0 || statusFilter !== "All";

  const resetForm = () => {
    setDomainName("");
    setFormError("");
  };

  const handleCopy = async (key: string, value: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      triggerToast(successMsg);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      triggerToast("Could not copy. Select the value and copy manually.");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const normalised = normaliseHostname(domainName);
    if (!normalised) {
      setFormError("Domain name is required.");
      return;
    }
    if (!isValidHostname(normalised)) {
      setFormError("Enter a valid domain like links.mybrand.com");
      return;
    }
    if (domains.some((d) => d.domainName.toLowerCase() === normalised)) {
      setFormError("This domain is already connected.");
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      onConnectDomain(normalised);
      setIsSubmitting(false);
      setIsAdding(false);
      resetForm();
      triggerToast(`"${normalised}" added. Complete DNS setup, then verify.`);
    }, 350);
  };

  const handleVerify = (domain: CustomDomain) => {
    if (verifyingId) return;
    setVerifyingId(domain.id);
    window.setTimeout(() => {
      if (domain.status === "Verified") {
        triggerToast(`"${domain.domainName}" is still verified.`);
      } else {
        const verified = { ...domain, status: "Verified" as const };
        onUpdateDomain(verified);
        if (dnsHelpDomain?.id === domain.id) setDnsHelpDomain(verified);
        triggerToast(`DNS verified for "${domain.domainName}".`);
      }
      setVerifyingId(null);
    }, 900);
  };

  const handleDelete = (domain: CustomDomain) => {
    if (
      !window.confirm(
        `Remove "${domain.domainName}"? Links using this domain will stop resolving until you reconnect it.`
      )
    ) {
      return;
    }
    onDeleteDomain(domain.id);
    if (dnsHelpDomain?.id === domain.id) setDnsHelpDomain(null);
    triggerToast(`"${domain.domainName}" removed.`);
  };

  const renderActions = (domain: CustomDomain) => (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => void handleCopy(`domain-${domain.id}`, domain.domainName, "Domain copied.")}
        className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
        title="Copy domain"
        aria-label={`Copy ${domain.domainName}`}
      >
        {copiedKey === `domain-${domain.id}` ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <a
        href={`https://${domain.domainName}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
        title="Open domain"
        aria-label={`Open ${domain.domainName}`}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
      {domain.status === "Pending" && (
        <button
          type="button"
          onClick={() => setDnsHelpDomain(domain)}
          className="text-gray-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-lg transition-all"
          title="DNS setup"
          aria-label={`DNS setup for ${domain.domainName}`}
        >
          <Shield className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        disabled={verifyingId === domain.id}
        onClick={() => handleVerify(domain)}
        className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-60"
        title="Verify DNS"
        aria-label={`Verify DNS for ${domain.domainName}`}
      >
        <RefreshCw className={`h-4 w-4 ${verifyingId === domain.id ? "animate-spin" : ""}`} />
      </button>
      <button
        type="button"
        onClick={() => handleDelete(domain)}
        className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all"
        title="Remove domain"
        aria-label={`Remove ${domain.domainName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        title="Custom Domains"
        subtitle="Configure custom domains for fully white-labeled link routing."
        actions={
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95 w-full sm:w-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Connect Domain</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
          <p className="font-display font-black text-2xl text-slate-900 mt-1">{domains.length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified</p>
          <p className="font-display font-black text-2xl text-emerald-600 mt-1">{verifiedCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
          <p className="font-display font-black text-2xl text-amber-600 mt-1">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-900">DNS target for A records</p>
          <p className="text-sm font-mono text-amber-800 mt-1 break-all">{CUSTOM_DOMAIN_TARGET_IP}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            void handleCopy("target-ip", CUSTOM_DOMAIN_TARGET_IP, "Target IP copied.")
          }
          className="inline-flex items-center justify-center gap-1.5 bg-white border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs font-bold shrink-0"
        >
          {copiedKey === "target-ip" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          Copy IP
        </button>
      </div>

      {domains.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search domains..."
              aria-label="Search domains"
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filter by status"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
          >
            <option value="All">All statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-domain-title"
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 id="connect-domain-title" className="font-display font-bold text-lg text-gray-950">
                Connect Custom Domain
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setIsAdding(false);
                    resetForm();
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Domain name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. links.mybrand.com"
                  value={domainName}
                  onChange={(event) => setDomainName(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 space-y-2 leading-relaxed">
                <span className="font-bold">Required DNS setup</span>
                <p>
                  Create a DNS <strong>A</strong> record pointing your domain or subdomain to{" "}
                  <strong className="font-mono">{CUSTOM_DOMAIN_TARGET_IP}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy("modal-ip", CUSTOM_DOMAIN_TARGET_IP, "Target IP copied.")
                  }
                  className="inline-flex items-center gap-1.5 text-amber-900 font-bold hover:underline"
                >
                  {copiedKey === "modal-ip" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy target IP
                </button>
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold"
                >
                  {isSubmitting ? "Connecting…" : "Add Custom Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SectionCard>
        {domains.length === 0 ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 bg-indigo-50 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No Custom Domains Connected</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">
              Connect branded domains to white-label your links and bio pages.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 bg-[#4F46E5] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Connect your first domain
            </button>
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm text-slate-500">No domains match your filters.</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                }}
                className="text-[#4F46E5] text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-gray-50">
              {filteredDomains.map((domain) => (
                <div key={domain.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="font-display font-bold text-gray-950 text-sm truncate">
                          {domain.domainName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {domain.type} · <span className="font-mono">{domain.targetIp}</span>
                      </p>
                    </div>
                    {statusBadge(domain.status)}
                  </div>
                  {renderActions(domain)}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 bg-slate-50/50">
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Domain name
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Verification type
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Target IP
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDomains.map((domain) => (
                    <tr key={domain.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6 font-display font-bold text-gray-950 text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Globe className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                          <span className="truncate">{domain.domainName}</span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="text-sm font-semibold text-gray-600">{domain.type}</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopy(
                              `ip-${domain.id}`,
                              domain.targetIp,
                              "Target IP copied."
                            )
                          }
                          className="text-sm font-semibold font-mono text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1.5"
                          title="Copy target IP"
                        >
                          {domain.targetIp}
                          {copiedKey === `ip-${domain.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      </td>
                      <td className="py-4.5 px-6">{statusBadge(domain.status)}</td>
                      <td className="py-4.5 px-6">{renderActions(domain)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {dnsHelpDomain && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dns-help-title"
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="dns-help-title" className="font-display font-bold text-lg text-gray-950">
                DNS setup
              </h3>
              <button
                type="button"
                onClick={() => setDnsHelpDomain(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Point <span className="font-semibold">{dnsHelpDomain.domainName}</span> to ACN Link
              with this record:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-medium">Type</span>
                <span className="font-semibold">{dnsHelpDomain.type}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-medium">Host</span>
                <span className="font-mono text-xs break-all text-right">{dnsHelpDomain.domainName}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-400 font-medium">Value</span>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy(
                      "dns-help-ip",
                      dnsHelpDomain.targetIp,
                      "Target IP copied."
                    )
                  }
                  className="font-mono text-xs inline-flex items-center gap-1.5 hover:text-indigo-600"
                >
                  {dnsHelpDomain.targetIp}
                  {copiedKey === "dns-help-ip" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                disabled={verifyingId === dnsHelpDomain.id}
                onClick={() => handleVerify(dnsHelpDomain)}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-70 text-white py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${verifyingId === dnsHelpDomain.id ? "animate-spin" : ""}`}
                />
                {verifyingId === dnsHelpDomain.id ? "Checking DNS…" : "Verify DNS now"}
              </button>
              <button
                type="button"
                onClick={() => setDnsHelpDomain(null)}
                className="w-full text-slate-500 hover:text-slate-700 py-2 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-slate-900 text-white border border-slate-800 text-xs font-black py-3 px-5 rounded-2xl shadow-2xl z-50 max-w-sm sm:ml-auto">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
