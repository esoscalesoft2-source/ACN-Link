import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Globe2,
  Link2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Users,
  X
} from "lucide-react";
import { PublishSettings, PublishVisibility, UserProfile } from "../types";
import {
  DEFAULT_DNS_TARGET,
  isValidHostname,
  normaliseHostname,
  PRIMARY_DOMAIN
} from "../storage/publishStorage";

interface PublishModalProps {
  isOpen: boolean;
  settings: PublishSettings;
  user: UserProfile;
  onClose: () => void;
  onSave: (settings: PublishSettings) => void;
  onPublished: (settings: PublishSettings) => void;
}

type PublishStep = "domain" | "visibility" | "success";

const VISIBILITY_OPTIONS: Array<{
  id: PublishVisibility;
  title: string;
  description: string;
  icon: typeof Globe2;
}> = [
  {
    id: "public",
    title: "Public",
    description: "Anyone with the URL",
    icon: Globe2
  },
  {
    id: "workspace",
    title: "Workspace only",
    description: "Only signed-in workspace users",
    icon: LockKeyhole
  },
  {
    id: "selected_members",
    title: "Selected members",
    description: "Only specifically selected workspace members",
    icon: Users
  }
];

export default function PublishModal({
  isOpen,
  settings,
  user,
  onClose,
  onSave,
  onPublished
}: PublishModalProps) {
  const [step, setStep] = useState<PublishStep>("domain");
  const [draft, setDraft] = useState<PublishSettings>(settings);
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep("domain");
    setDraft(settings);
    setDomainInput("");
    setDomainError("");
    setCopied(false);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const addCustomDomain = () => {
    const hostname = normaliseHostname(domainInput);
    if (!isValidHostname(hostname)) {
      setDomainError("Enter a valid domain, for example links.example.com.");
      return;
    }

    if (draft.customDomains.some((domain) => domain.hostname === hostname)) {
      setDomainError("This domain is already listed.");
      return;
    }

    const now = new Date().toISOString();
    const next = {
      ...draft,
      customDomains: [
        ...draft.customDomains,
        {
          id: `domain_${Date.now()}`,
          hostname,
          status: "pending_dns" as const,
          dnsTarget: DEFAULT_DNS_TARGET,
          createdAt: now,
          updatedAt: now
        }
      ],
      updatedAt: now
    };
    setDraft(next);
    onSave(next);
    setDomainInput("");
    setDomainError("");
  };

  const setVisibility = (visibility: PublishVisibility) => {
    setDraft((current) => ({ ...current, visibility, updatedAt: new Date().toISOString() }));
  };

  const completePublish = () => {
    const published = {
      ...draft,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDraft(published);
    onPublished(published);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        aria-label="Close publish dialog"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Publish website"
        className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">ACN Link</p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-950">Publish</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close publish dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5 sm:p-7">
          {step === "domain" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your website URL</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your published ACN Link workspace is available at this address.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-slate-800">{draft.primaryUrl}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Connected and verified
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(draft.primaryUrl)}
                  className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600"
                  aria-label="Copy website URL"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add custom domain</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Connect any domain you own. DNS verification is required before a new domain can be live.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(event) => {
                      setDomainInput(event.target.value);
                      setDomainError("");
                    }}
                    placeholder="links.example.com"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={addCustomDomain}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Plus className="h-4 w-4" /> Add domain
                  </button>
                </div>
                {domainError && <p className="text-xs font-medium text-rose-600">{domainError}</p>}
              </div>

              {draft.customDomains.filter((domain) => domain.hostname !== PRIMARY_DOMAIN).map((domain) => (
                <div key={domain.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">
                        <Link2 className="h-4 w-4 shrink-0 text-amber-600" />
                        {domain.hostname}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-700">Pending DNS verification</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(domain.dnsTarget || DEFAULT_DNS_TARGET)}
                      className="shrink-0 rounded-lg p-2 text-amber-700 hover:bg-amber-100"
                      title="Copy DNS target"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-600">
                    CNAME → {domain.dnsTarget || DEFAULT_DNS_TARGET}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Add this record with your DNS provider, then refresh this page after verification in Vercel.
                  </p>
                </div>
              ))}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setStep("visibility")}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "visibility" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Who can see this website?</h3>
                <p className="mt-1 text-sm text-slate-500">Choose how visitors can access your published website.</p>
              </div>

              <div className="space-y-3">
                {VISIBILITY_OPTIONS.map(({ id, title, description, icon: Icon }) => {
                  const selected = draft.visibility === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVisibility(id)}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`rounded-xl p-3 ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900">{title}</span>
                        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-indigo-600" : "border-slate-300"}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {draft.visibility === "selected_members" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected members</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3">
                    <input
                      type="checkbox"
                      checked={draft.selectedMemberIds.includes(user.email)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          selectedMemberIds: event.target.checked
                            ? [...new Set([...current.selectedMemberIds, user.email])]
                            : current.selectedMemberIds.filter((id) => id !== user.email)
                        }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">{user.name}</span>
                      <span className="block truncate text-xs text-slate-500">{user.email}</span>
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep("domain")} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={completePublish} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-5 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-7 w-7" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-slate-950">Website published</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Your visibility settings are saved and your active URL is ready to share.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active URL</p>
                <p className="mt-1 truncate font-mono text-sm font-semibold text-indigo-700">{draft.primaryUrl}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => copyText(draft.primaryUrl)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {copied ? "Copied" : "Copy URL"}
                </button>
                <a href={draft.primaryUrl} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Open website <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                Close
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
