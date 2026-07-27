import React, { useEffect, useMemo, useState } from "react";
import type { CustomDomain, ShortLinkAnalytics, SmartLink } from "../types";
import {
  ArrowRight,
  Copy,
  Edit2,
  ExternalLink,
  Link2,
  MousePointerClick,
  Plus,
  Search,
  Share2,
  Smartphone,
  Monitor,
  Tablet,
  Trash2,
  X
} from "lucide-react";
import PageShell, { PageHeader, SectionCard, Workspace } from "./layout/PageShell";
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

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
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
            // Keep page usable if analytics lag.
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
    window.setTimeout(() => setToast(null), 3000);
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(successMessage);
    } catch {
      triggerToast("Unable to copy. Please copy the URL manually.");
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

  const totalClicks = links.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const activeLinks = links.filter((link) => link.status === "Live").length;

  const analyticsList = useMemo(
    () => Object.values(analyticsById) as ShortLinkAnalytics[],
    [analyticsById]
  );

  const periodTotals = useMemo(() => {
    return {
      today: analyticsList.reduce((sum, item) => sum + (item.summary?.today || 0), 0),
      week: analyticsList.reduce((sum, item) => sum + (item.summary?.week || 0), 0),
      month: analyticsList.reduce((sum, item) => sum + (item.summary?.month || 0), 0)
    };
  }, [analyticsList]);

  const aggregatedDevices = useMemo(() => {
    const devices = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
    for (const analytics of analyticsList) {
      devices.mobile += analytics.devices?.mobile || 0;
      devices.desktop += analytics.devices?.desktop || 0;
      devices.tablet += analytics.devices?.tablet || 0;
      devices.other += analytics.devices?.other || 0;
    }
    return devices;
  }, [analyticsList]);

  const deviceTotal =
    aggregatedDevices.mobile +
    aggregatedDevices.desktop +
    aggregatedDevices.tablet +
    aggregatedDevices.other;

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    const title = newTitle.trim();
    const cleanSlug = normalizeSlug(newSlug || title);
    const target = newTarget.trim();

    if (!title) {
      setCreateError("Give this link a name.");
      return;
    }
    if (!isValidDestination(target)) {
      setCreateError("Enter a valid destination URL (https://…).");
      return;
    }
    if (!cleanSlug) {
      setCreateError("Short slug is required (example: summer-sale).");
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
      triggerToast("Short link ready — copy and share it.");
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
      triggerToast(nextStatus === "Live" ? "Link is Live — redirects work." : "Link paused — redirects stopped.");
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

  const openDestination = (destinationUrl?: string) => {
    if (!destinationUrl || !isValidDestination(destinationUrl)) {
      triggerToast("This link has no valid destination URL.");
      return;
    }
    const url = /^https?:\/\//i.test(destinationUrl) ? destinationUrl : `https://${destinationUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
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

  return (
    <PageShell className="font-sans text-slate-800">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}

      <PageHeader
        title="Smart Short Links"
        subtitle="Turn a long website URL into a short shareable link — and see how many people click it."
        actions={
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 acn-btn-chip px-5 py-2.5 text-xs font-extrabold"
          >
            <Plus className="h-4 w-4" />
            Create short link
          </button>
        }
      />

      {loadError && (
        <SectionCard className="border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {loadError}
        </SectionCard>
      )}

      {/* Section 1: How it works */}
      <SectionCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">How it works</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
              3 simple steps
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Need traffic split across many URLs? Use <span className="font-semibold">Link Rotator</span> instead.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                step: "1",
                title: "Paste your long URL",
                body: "Example: your product page, offer page, or WhatsApp link."
              },
              {
                step: "2",
                title: "Get a short link",
                body: "You receive a link like …/l/summer-sale to copy and share."
              },
              {
                step: "3",
                title: "Track real clicks",
                body: "When someone opens it, they go to your page and the click count updates."
              }
            ] as const
          ).map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
                {item.step}
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Flow:</span>
          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px]">Long URL</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-[11px] font-semibold text-indigo-700">
            Short URL /l/…
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
            Visitor lands on your page
          </span>
        </div>
      </SectionCard>

      {/* Section 2: Snapshot */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Your snapshot
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Live links", activeLinks, "Redirecting now"],
              ["All links", links.length, "Created in total"],
              ["Total clicks", totalClicks, "All short links"],
              ["Clicks today", periodTotals.today, "Since midnight"]
            ] as const
          ).map(([label, value, hint]) => (
            <SectionCard key={label} className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-slate-900">
                {loading ? "…" : value.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
            </SectionCard>
          ))}
        </div>
      </div>

      {/* Section 3: Your links */}
      <Workspace panel stack>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your short links</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
              Manage & share
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Copy the short URL to share. “Goes to” is the real page people land on.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            New link
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="acn-icon-field flex-1">
            <span className="acn-icon-field__icon">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, short URL, or destination…"
              className="acn-icon-field__input w-full"
              aria-label="Search links"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | "Live" | "Paused")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            aria-label="Filter by status"
          >
            <option value="All">All status</option>
            <option value="Live">Live only</option>
            <option value="Paused">Paused only</option>
          </select>
        </div>

        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Link2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800">No short links yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Create your first short link, copy it, and share it anywhere. Clicks will show here
              automatically.
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="acn-btn-chip mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold"
            >
              <Plus className="h-4 w-4" />
              Create your first short link
            </button>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No links match your search.{" "}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
              }}
              className="font-semibold text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link) => {
              const analytics = analyticsById[link.id];
              return (
                <div
                  key={link.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-base font-bold text-slate-900">{link.title}</h4>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(link)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                            link.status === "Live"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                          }`}
                          title="Click to toggle Live / Paused"
                        >
                          {link.status}
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Short URL — share this
                          </p>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <a
                              href={link.shortUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-sm font-semibold text-indigo-600 hover:underline"
                            >
                              {link.shortUrl}
                            </a>
                            <button
                              type="button"
                              onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                              className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                              title="Copy short URL"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Goes to — destination page
                          </p>
                          <button
                            type="button"
                            onClick={() => openDestination(link.destinationUrl)}
                            className="mt-1 block max-w-full truncate text-left text-sm text-slate-700 hover:text-indigo-600 hover:underline"
                          >
                            {link.destinationUrl || "Not set"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row items-end gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Clicks
                        </p>
                        <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                          {link.clicks || 0}
                        </p>
                        {analytics && (
                          <p className="text-[11px] font-semibold text-slate-500">
                            Today {analytics.summary.today} · Week {analytics.summary.week}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => void copyText(link.shortUrl, "Short URL copied — ready to share.")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Copy to share
                    </button>
                    <button
                      type="button"
                      onClick={() => openShortUrl(link)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Test short URL
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(link)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(link)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Workspace>

      {/* Section 4: Traffic */}
      <Workspace panel stack>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Traffic overview</p>
          <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
            Click performance
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            These numbers update when people open your short URLs (not from fake test buttons).
          </p>
        </div>

        {totalClicks === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <MousePointerClick className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No clicks yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Share a Live short URL, open it once yourself to test, then refresh this page.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Today", periodTotals.today],
                  ["This week", periodTotals.week],
                  ["This month", periodTotals.month],
                  ["All time", totalClicks]
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

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Devices used by visitors
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "mobile" as const, label: "Mobile", icon: Smartphone },
                    { key: "desktop" as const, label: "Desktop", icon: Monitor },
                    { key: "tablet" as const, label: "Tablet", icon: Tablet }
                  ]
                ).map((device) => {
                  const Icon = device.icon;
                  const count = aggregatedDevices[device.key];
                  const pct = deviceTotal > 0 ? Math.round((count / deviceTotal) * 100) : 0;
                  return (
                    <div
                      key={device.key}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center"
                    >
                      <Icon className="mx-auto h-4 w-4 text-slate-400" />
                      <p className="mt-1.5 text-[11px] font-bold text-slate-600">{device.label}</p>
                      <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900">
                        {count}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Workspace>

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
                  Fill the long URL + a short name. We’ll give you a shareable link.
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
                <FieldLabel hint="For your reference only (not shown to visitors).">
                  Link name
                </FieldLabel>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Summer Sale Offer"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <FieldLabel hint="The real page people should open.">
                  Destination URL (long link)
                </FieldLabel>
                <input
                  type="url"
                  required
                  placeholder="https://yoursite.com/offer"
                  value={newTarget}
                  onChange={(event) => setNewTarget(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <FieldLabel hint="Where the short URL is hosted.">Domain</FieldLabel>
                <select
                  value={newHostDomain}
                  onChange={(event) => setNewHostDomain(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {hostOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel hint="Letters, numbers, hyphens — becomes part of the short URL.">
                  Short slug
                </FieldLabel>
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
                    className="w-full min-w-0 rounded-r-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  Your short URL will be:{" "}
                  <span className="break-all font-mono">{previewUrl}</span>
                </p>
              </div>

              <div>
                <FieldLabel hint="Optional labels only — not live ad pixels.">
                  Campaign tags (optional)
                </FieldLabel>
                <div className="flex gap-2">
                  {RETARGET_OPTIONS.map((pixel) => {
                    const isSelected = newRetargeting.includes(pixel.id);
                    return (
                      <button
                        key={pixel.id}
                        type="button"
                        onClick={() => toggleRetarget(newRetargeting, pixel.id, setNewRetargeting)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
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
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="acn-btn-chip px-5 py-2.5 text-xs font-extrabold disabled:opacity-60"
                >
                  {isCreating ? "Creating…" : "Create & get short URL"}
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
                <p className="mt-1 text-xs text-slate-500">
                  Change destination, slug, or pause redirects.
                </p>
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
                <FieldLabel>Link name</FieldLabel>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <FieldLabel hint="Where visitors should land.">Destination URL</FieldLabel>
                <input
                  type="url"
                  required
                  value={editTarget}
                  onChange={(event) => setEditTarget(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <FieldLabel>Domain</FieldLabel>
                <select
                  value={editHostDomain}
                  onChange={(event) => setEditHostDomain(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
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
                <FieldLabel>Short slug</FieldLabel>
                <div className="flex min-w-0 items-center">
                  <span className="max-w-[55%] truncate rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-[10px] text-slate-400">
                    {editHostDomain || PRIMARY_DOMAIN}/l/
                  </span>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(event) => setEditSlug(normalizeSlug(event.target.value))}
                    className="w-full min-w-0 rounded-r-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <FieldLabel hint="Paused = short URL stops redirecting.">Status</FieldLabel>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "Live" as const, label: "Live — redirects on" },
                      { id: "Paused" as const, label: "Paused — redirects off" }
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
                <FieldLabel hint="Optional labels only.">Campaign tags</FieldLabel>
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
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-950 disabled:opacity-60"
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
