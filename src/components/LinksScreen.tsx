import React, { useEffect, useMemo, useState } from "react";
import type { CustomDomain, ShortLinkAnalytics, SmartLink } from "../types";
import {
  BarChart2,
  Copy,
  Edit3,
  ExternalLink,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";
import PageShell, { PageHeader, Workspace } from "./layout/PageShell";
import {
  createShortLink,
  deleteShortLink,
  fetchShortLinkAnalytics,
  ShortLinkApiError,
  updateShortLink
} from "../lib/shortLinkApi";
import { PRIMARY_DOMAIN } from "../storage/publishStorage";

type RetargetPixel = "fb" | "google" | "tiktok";

interface LinksScreenProps {
  links: SmartLink[];
  domains?: CustomDomain[];
  onReload: () => Promise<void>;
  onUpsertLink?: (link: SmartLink) => void;
  loading?: boolean;
  loadError?: string | null;
}

const RETARGET_OPTIONS: Array<{ id: RetargetPixel; label: string }> = [
  { id: "fb", label: "Facebook" },
  { id: "google", label: "Google Ads" },
  { id: "tiktok", label: "TikTok" }
];

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function isValidDestination(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

function shortDisplayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

export default function LinksScreen({
  links,
  domains = [],
  onReload,
  onUpsertLink,
  loading = false,
  loadError = null
}: LinksScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newHostDomain, setNewHostDomain] = useState(PRIMARY_DOMAIN);
  const [newRetargeting, setNewRetargeting] = useState<RetargetPixel[]>([]);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingLink, setEditingLink] = useState<SmartLink | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editHostDomain, setEditHostDomain] = useState(PRIMARY_DOMAIN);
  const [editStatus, setEditStatus] = useState<"Live" | "Paused">("Live");
  const [editRetargeting, setEditRetargeting] = useState<RetargetPixel[]>([]);
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Live" | "Paused">("All");
  const [toast, setToast] = useState<string | null>(null);
  const [analyticsById, setAnalyticsById] = useState<Record<string, ShortLinkAnalytics>>({});
  const [analyticsLink, setAnalyticsLink] = useState<SmartLink | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hostOptions = useMemo(() => {
    const custom = domains
      .filter((domain) => domain.status === "Verified" || domain.status === "DNS Verified")
      .map((domain) => domain.domainName.trim().toLowerCase())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const uniqueCustom = Array.from(new Set(custom));
    return [
      { value: PRIMARY_DOMAIN, label: `Acnlink (${PRIMARY_DOMAIN})` },
      ...uniqueCustom.map((host) => ({ value: host, label: host }))
    ];
  }, [domains]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, ShortLinkAnalytics> = {};
      await Promise.all(
        links.slice(0, 40).map(async (link) => {
          try {
            next[link.id] = await fetchShortLinkAnalytics(link.id);
          } catch {
            // Keep list usable if analytics lag.
          }
        })
      );
      if (!cancelled) setAnalyticsById(next);
    };
    if (links.length > 0) void load();
    else setAnalyticsById({});
    return () => {
      cancelled = true;
    };
  }, [links]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(successMessage);
    } catch {
      triggerToast("Unable to copy. Copy the URL manually.");
    }
  };

  const filteredLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return links.filter((link) => {
      const matchesSearch =
        !query ||
        link.title.toLowerCase().includes(query) ||
        link.shortUrl.toLowerCase().includes(query) ||
        link.slug.toLowerCase().includes(query) ||
        (link.destinationUrl || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || link.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [links, searchQuery, statusFilter]);

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "All";

  const resetCreateForm = () => {
    setNewTitle("");
    setNewSlug("");
    setNewTarget("");
    setNewHostDomain(PRIMARY_DOMAIN);
    setNewRetargeting([]);
    setCreateError("");
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsAdding(false);
    resetCreateForm();
  };

  const openEditModal = (link: SmartLink) => {
    setEditingLink(link);
    setEditTitle(link.title);
    setEditTarget(link.destinationUrl || "");
    setEditSlug(normalizeSlug(link.slug) || link.slug.replace(/^\//, ""));
    setEditHostDomain(link.hostDomain || PRIMARY_DOMAIN);
    setEditStatus(link.status);
    setEditRetargeting(
      (link.retargeting || []).filter((item): item is RetargetPixel =>
        ["fb", "google", "tiktok"].includes(item)
      )
    );
    setEditError("");
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingLink(null);
    setEditError("");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onReload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    const title = newTitle.trim();
    const cleanSlug = normalizeSlug(newSlug || title);
    const target = newTarget.trim();

    if (!title) {
      setCreateError("Link name is required.");
      return;
    }
    if (!isValidDestination(target)) {
      setCreateError("Enter a valid destination URL (https://…).");
      return;
    }
    if (!cleanSlug) {
      setCreateError("Short slug is required.");
      return;
    }

    setIsCreating(true);
    try {
      const saved = await createShortLink({
        title,
        slug: cleanSlug,
        hostDomain: newHostDomain || PRIMARY_DOMAIN,
        destinationUrl: target,
        status: "Live",
        retargeting: newRetargeting
      });
      onUpsertLink?.(saved);
      setIsAdding(false);
      resetCreateForm();
      triggerToast("Short link created.");
      void onReload();
    } catch (error) {
      setCreateError(
        error instanceof ShortLinkApiError ? error.message : "Unable to create short link."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLink) return;
    setEditError("");

    const title = editTitle.trim();
    const cleanSlug = normalizeSlug(editSlug);
    const target = editTarget.trim();

    if (!title) {
      setEditError("Link name is required.");
      return;
    }
    if (!isValidDestination(target)) {
      setEditError("Enter a valid destination URL.");
      return;
    }
    if (!cleanSlug) {
      setEditError("Short slug is required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const saved = await updateShortLink(editingLink.id, {
        title,
        slug: cleanSlug,
        hostDomain: editHostDomain || PRIMARY_DOMAIN,
        destinationUrl: target,
        status: editStatus,
        retargeting: editRetargeting
      });
      onUpsertLink?.(saved);
      setEditingLink(null);
      triggerToast("Short link updated.");
      void onReload();
    } catch (error) {
      setEditError(
        error instanceof ShortLinkApiError ? error.message : "Unable to save short link."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (link: SmartLink) => {
    const nextStatus = link.status === "Live" ? "Paused" : "Live";
    try {
      const saved = await updateShortLink(link.id, {
        title: link.title,
        slug: normalizeSlug(link.slug) || link.slug.replace(/^\//, ""),
        hostDomain: link.hostDomain || PRIMARY_DOMAIN,
        destinationUrl: link.destinationUrl || "",
        status: nextStatus,
        retargeting: link.retargeting || []
      });
      onUpsertLink?.(saved);
      triggerToast(nextStatus === "Live" ? "Link is Live." : "Link paused.");
      void onReload();
    } catch (error) {
      triggerToast(error instanceof ShortLinkApiError ? error.message : "Unable to update status.");
    }
  };

  const handleDelete = async (link: SmartLink) => {
    const confirmed = window.confirm(
      `Delete "${link.title}"?\n\n${link.shortUrl}\n\nThis short URL will stop working.`
    );
    if (!confirmed) return;
    try {
      await deleteShortLink(link.id);
      if (analyticsLink?.id === link.id) setAnalyticsLink(null);
      triggerToast("Short link deleted.");
      void onReload();
    } catch (error) {
      triggerToast(error instanceof ShortLinkApiError ? error.message : "Unable to delete.");
    }
  };

  const openShortUrl = (link: SmartLink) => {
    if (link.status !== "Live") {
      triggerToast("Paused links do not redirect. Set status to Live first.");
      return;
    }
    window.open(link.shortUrl, "_blank", "noopener,noreferrer");
  };

  const toggleRetarget = (
    current: RetargetPixel[],
    pixel: RetargetPixel,
    setter: React.Dispatch<React.SetStateAction<RetargetPixel[]>>
  ) => {
    setter(
      current.includes(pixel) ? current.filter((item) => item !== pixel) : [...current, pixel]
    );
  };

  const previewUrl = `https://${newHostDomain || PRIMARY_DOMAIN}/l/${newSlug || "your-slug"}`;
  const selectedAnalytics = analyticsLink ? analyticsById[analyticsLink.id] : null;

  const renderLinkRow = (link: SmartLink) => {
    const isCustomHost =
      Boolean(link.hostDomain) &&
      link.hostDomain.toLowerCase() !== PRIMARY_DOMAIN.toLowerCase();

    return (
      <div
        key={link.id}
        className={`acn-list-row min-w-0 ${isCustomHost ? "acn-list-row--custom-domain" : ""}`}
      >
        <div className="acn-list-row__main min-w-0 flex-1">
          {/* Identity — truncates so the meta column never gets squeezed */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
                isCustomHost
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-indigo-500/10 text-indigo-500"
              }`}
            >
              <Link2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h4 className="truncate font-display text-base font-semibold text-gray-950">
                {link.title}
              </h4>
              <button
                type="button"
                onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                className="mt-1 block w-full truncate text-left font-mono text-xs font-semibold text-indigo-600 hover:underline"
                title={link.shortUrl}
              >
                {shortDisplayUrl(link.shortUrl)}
              </button>
              {link.destinationUrl && (
                <p
                  className="mt-0.5 truncate text-[11px] text-slate-400"
                  title={link.destinationUrl}
                >
                  → {shortDisplayUrl(link.destinationUrl)}
                </p>
              )}
            </div>
          </div>

          {/* Meta + actions — single horizontal row on every card */}
          <div className="flex w-full shrink-0 flex-nowrap items-center justify-between gap-3 sm:gap-5 lg:w-auto lg:justify-end">
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                link.status === "Live"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {link.status}
            </span>

            <div className="shrink-0 text-center">
              <span className="block font-display text-2xl font-bold leading-none text-gray-950">
                {link.clicks || 0}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Clicks
              </span>
            </div>

            <div className="flex shrink-0 flex-nowrap items-center gap-0.5 rounded-xl border border-gray-100 bg-gray-50 p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setAnalyticsLink(link)}
                title="Analytics"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-[#6366f1]"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                title="Copy short URL"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-[#6366f1]"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openShortUrl(link)}
                title="Open short URL"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-[#6366f1]"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openEditModal(link)}
                title="Edit"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-[#6366f1]"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleToggleStatus(link)}
                title={link.status === "Live" ? "Pause" : "Set Live"}
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-[#6366f1]"
              >
                {link.status === "Live" ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(link)}
                title="Delete"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageShell>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}

      <PageHeader
        title="Smart Short Links"
        subtitle={`Create short URLs to share anywhere · ${links.length} link${links.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing || loading}
              className="acn-btn-secondary px-4 py-2.5"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing || loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="acn-btn-accent px-5 py-2.5"
            >
              <Plus className="h-4 w-4" />
              Create short link
            </button>
          </>
        }
      />

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {loadError}
        </div>
      )}

      <Workspace className="acn-section-card">
        {links.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Link2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900">No short links yet</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Shorten a long URL, copy it, and share it. Clicks are tracked automatically.
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="acn-btn-accent mt-4 px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="acn-platform-bulk-toolbar">
              <div className="acn-platform-bulk-toolbar__filters">
                <div className="acn-platform-bulk-toolbar__search acn-icon-field">
                  <span className="acn-icon-field__icon">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name, short URL, or destination…"
                    className="acn-input acn-icon-field__input w-full py-2.5"
                    aria-label="Search short links"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "All" | "Live" | "Paused")
                  }
                  className="acn-platform-bulk-status-filter"
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  <option value="Live">Live</option>
                  <option value="Paused">Paused</option>
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("All");
                    }}
                    className="acn-platform-bulk-clear"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="acn-platform-bulk-toolbar__meta">
                Showing {filteredLinks.length} of {links.length}
                {loading ? " · Loading…" : ""}
              </p>
            </div>

            {filteredLinks.length === 0 ? (
              <div className="acn-platform-bulk-empty px-4 py-10 text-center">
                <p className="font-display text-base font-bold text-slate-800">No links match</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search or clear filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("All");
                  }}
                  className="mt-3 text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">{filteredLinks.map((link) => renderLinkRow(link))}</div>
            )}
          </div>
        )}
      </Workspace>

      {/* Analytics modal */}
      {analyticsLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-bold text-slate-900">
                  {analyticsLink.title}
                </h3>
                <p className="mt-1 truncate font-mono text-xs text-indigo-600">
                  {shortDisplayUrl(analyticsLink.shortUrl)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsLink(null)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["All clicks", analyticsLink.clicks || 0],
                  ["Today", selectedAnalytics?.summary.today ?? 0],
                  ["This week", selectedAnalytics?.summary.week ?? 0],
                  ["This month", selectedAnalytics?.summary.month ?? 0]
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {selectedAnalytics && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                {(
                  [
                    ["Mobile", selectedAnalytics.devices.mobile],
                    ["Desktop", selectedAnalytics.devices.desktop],
                    ["Tablet", selectedAnalytics.devices.tablet]
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 px-2 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                    <p className="mt-0.5 text-base font-extrabold tabular-nums text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 truncate text-[11px] text-slate-400" title={analyticsLink.destinationUrl}>
              Destination: {analyticsLink.destinationUrl || "—"}
            </p>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAnalyticsLink(null)}
                className="acn-btn-secondary px-4 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-link-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="create-link-title" className="font-display text-xl font-bold text-slate-900">
                  Create short link
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Paste a long URL and choose a short slug to share.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Link name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Summer Sale"
                  value={newTitle}
                  onChange={(event) => {
                    const title = event.target.value;
                    setNewTitle((previousTitle) => {
                      const previousSlug = normalizeSlug(previousTitle);
                      if (!newSlug || newSlug === previousSlug) {
                        setNewSlug(normalizeSlug(title));
                      }
                      return title;
                    });
                  }}
                  className="acn-input w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://yoursite.com/offer"
                  value={newTarget}
                  onChange={(event) => setNewTarget(event.target.value)}
                  className="acn-input w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Domain
                </label>
                <select
                  value={newHostDomain}
                  onChange={(event) => setNewHostDomain(event.target.value)}
                  className="acn-input w-full"
                >
                  {hostOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Short slug
                </label>
                <div className="flex min-w-0 items-center">
                  <span className="max-w-[55%] truncate rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-[10px] text-slate-400">
                    {newHostDomain || PRIMARY_DOMAIN}/l/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="summer-sale"
                    value={newSlug}
                    onChange={(event) => setNewSlug(normalizeSlug(event.target.value))}
                    className="acn-input w-full min-w-0 rounded-l-none"
                  />
                </div>
                <p className="mt-2 break-all rounded-xl bg-indigo-50 px-3 py-2 font-mono text-[11px] font-semibold text-indigo-700">
                  {previewUrl}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Campaign tags (optional)
                </label>
                <div className="flex gap-2">
                  {RETARGET_OPTIONS.map((pixel) => {
                    const isSelected = newRetargeting.includes(pixel.id);
                    return (
                      <button
                        key={pixel.id}
                        type="button"
                        onClick={() => toggleRetarget(newRetargeting, pixel.id, setNewRetargeting)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pixel.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {createError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="acn-btn-secondary px-4 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="acn-btn-accent px-5 py-2.5 text-xs disabled:opacity-60"
                >
                  {isCreating ? "Creating…" : "Create short link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-link-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="edit-link-title" className="font-display text-xl font-bold text-slate-900">
                  Edit short link
                </h3>
                <p className="mt-1 text-xs text-slate-500">Update destination, slug, or status.</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Link name
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="acn-input w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  value={editTarget}
                  onChange={(event) => setEditTarget(event.target.value)}
                  className="acn-input w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Domain
                </label>
                <select
                  value={editHostDomain}
                  onChange={(event) => setEditHostDomain(event.target.value)}
                  className="acn-input w-full"
                >
                  {hostOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {editHostDomain &&
                    !hostOptions.some((option) => option.value === editHostDomain) && (
                      <option value={editHostDomain}>{editHostDomain}</option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Short slug
                </label>
                <div className="flex min-w-0 items-center">
                  <span className="max-w-[55%] truncate rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-[10px] text-slate-400">
                    {editHostDomain || PRIMARY_DOMAIN}/l/
                  </span>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(event) => setEditSlug(normalizeSlug(event.target.value))}
                    className="acn-input w-full min-w-0 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "Live" as const, label: "Live" },
                      { id: "Paused" as const, label: "Paused" }
                    ]
                  ).map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setEditStatus(status.id)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                        editStatus === status.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Campaign tags
                </label>
                <div className="flex gap-2">
                  {RETARGET_OPTIONS.map((pixel) => {
                    const isSelected = editRetargeting.includes(pixel.id);
                    return (
                      <button
                        key={pixel.id}
                        type="button"
                        onClick={() => toggleRetarget(editRetargeting, pixel.id, setEditRetargeting)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pixel.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSavingEdit}
                  className="acn-btn-secondary px-4 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="acn-btn-accent px-5 py-2.5 text-xs disabled:opacity-60"
                >
                  {isSavingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
