import React, { useMemo, useState } from "react";
import { SmartLink } from "../types";
import {
  Link2,
  TrendingUp,
  MousePointerClick,
  Percent,
  Plus,
  Filter,
  X,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Trash2,
  Edit2,
  Sparkles,
  Copy,
  Search,
  ExternalLink
} from "lucide-react";
import PageShell, { PageHeader, Workspace } from "./layout/PageShell";

type RetargetPixel = "fb" | "google" | "tiktok";

interface LinksScreenProps {
  links: SmartLink[];
  onCreateLink: (
    title: string,
    slug: string,
    shortUrl: string,
    destinationUrl: string,
    retargeting: SmartLink["retargeting"]
  ) => void;
  onDeleteLink: (id: string) => void;
  onUpdateLink: (updated: SmartLink) => void;
}

const RETARGET_OPTIONS: Array<{ id: RetargetPixel; label: string }> = [
  { id: "fb", label: "Facebook" },
  { id: "google", label: "Google Ads" },
  { id: "tiktok", label: "TikTok Pixel" }
];

const DEVICE_SHARES = {
  MOBILE: 0.72,
  DESKTOP: 0.2,
  TABLET: 0.08
} as const;

const GEO_SHARES = [
  { name: "United States", share: 0.55 },
  { name: "United Kingdom", share: 0.25 },
  { name: "Germany", share: 0.2 }
] as const;

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

export default function LinksScreen({
  links,
  onCreateLink,
  onDeleteLink,
  onUpdateLink
}: LinksScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newRetargeting, setNewRetargeting] = useState<RetargetPixel[]>(["fb", "google"]);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingLink, setEditingLink] = useState<SmartLink | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editStatus, setEditStatus] = useState<"Live" | "Paused">("Live");
  const [editRetargeting, setEditRetargeting] = useState<RetargetPixel[]>([]);
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Live" | "Paused">("All");
  const [showFilters, setShowFilters] = useState(false);
  const [activeDevice, setActiveDevice] = useState<keyof typeof DEVICE_SHARES>("MOBILE");
  const [toast, setToast] = useState<string | null>(null);

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

  const totalClicks = links.reduce((acc, curr) => acc + curr.clicks, 0);
  const activeLinks = links.filter((link) => link.status === "Live").length;
  const avgClicks = links.length > 0 ? totalClicks / links.length : 0;
  const clickInteraction =
    links.length === 0 ? "0%" : `${Math.min(100, Math.round((avgClicks / Math.max(avgClicks, 10)) * 100))}%`;

  const deviceClicks = Math.round(totalClicks * DEVICE_SHARES[activeDevice]);

  const geoBreakdown = GEO_SHARES.map((country) => ({
    name: country.name,
    clicks: Math.round(deviceClicks * country.share),
    percentage: deviceClicks > 0 ? Math.round(country.share * 100) : 0
  }));

  const clickTrendPoints = useMemo(() => {
    const weights = [0.1, 0.15, 0.12, 0.22, 0.18, 0.35, 0.45];
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    return labels.map((label, index) => ({
      label,
      value: Math.round((totalClicks * weights[index]) / weightSum)
    }));
  }, [totalClicks]);

  const maxVal = Math.max(...clickTrendPoints.map((point) => point.value), 1);
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 25;
  const pointsString = clickTrendPoints
    .map((point, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (clickTrendPoints.length - 1);
      const y = chartHeight - padding - (point.value / maxVal) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const resetCreateForm = () => {
    setNewTitle("");
    setNewSlug("");
    setNewTarget("");
    setNewRetargeting(["fb", "google"]);
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
    setEditSlug(link.shortUrl.replace(/^acn\.link\//i, "").replace(/^\//, "") || normalizeSlug(link.slug));
    setEditStatus(link.status);
    setEditRetargeting((link.retargeting || []).filter((item): item is RetargetPixel =>
      ["fb", "google", "tiktok"].includes(item)
    ));
    setEditError("");
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingLink(null);
    setEditError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    const title = newTitle.trim();
    const cleanSlug = normalizeSlug(newSlug || title);
    const target = newTarget.trim();

    if (!title) {
      setCreateError("Link title is required.");
      return;
    }
    if (!isValidDestination(target)) {
      setCreateError("Enter a valid destination URL.");
      return;
    }
    if (!cleanSlug) {
      setCreateError("Short slug is required.");
      return;
    }
    if (links.some((link) => normalizeSlug(link.slug) === cleanSlug || link.shortUrl.endsWith(`/${cleanSlug}`))) {
      setCreateError("That short slug is already in use.");
      return;
    }

    setIsCreating(true);
    window.setTimeout(() => {
      onCreateLink(title, `/${cleanSlug}`, `acn.link/${cleanSlug}`, target, newRetargeting);
      setIsCreating(false);
      setIsAdding(false);
      resetCreateForm();
      triggerToast("Smart link created successfully.");
    }, 300);
  };

  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLink) return;
    setEditError("");

    const title = editTitle.trim();
    const cleanSlug = normalizeSlug(editSlug);
    const target = editTarget.trim();

    if (!title) {
      setEditError("Link title is required.");
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
    if (
      links.some(
        (link) =>
          link.id !== editingLink.id &&
          (normalizeSlug(link.slug) === cleanSlug || link.shortUrl.endsWith(`/${cleanSlug}`))
      )
    ) {
      setEditError("That short slug is already in use.");
      return;
    }

    setIsSavingEdit(true);
    window.setTimeout(() => {
      onUpdateLink({
        ...editingLink,
        title,
        slug: `/${cleanSlug}`,
        shortUrl: `acn.link/${cleanSlug}`,
        destinationUrl: target,
        status: editStatus,
        retargeting: editRetargeting
      });
      setIsSavingEdit(false);
      setEditingLink(null);
      triggerToast("Link configuration saved.");
    }, 300);
  };

  const handleToggleStatus = (link: SmartLink) => {
    const nextStatus = link.status === "Live" ? "Paused" : "Live";
    onUpdateLink({ ...link, status: nextStatus });
    triggerToast(`Status switched to ${nextStatus}.`);
  };

  const handleSimulateClick = (link: SmartLink) => {
    if (link.status !== "Live") {
      triggerToast("Paused links cannot receive clicks. Set the link to Live first.");
      return;
    }
    onUpdateLink({ ...link, clicks: link.clicks + 1 });
    triggerToast(`Simulated click registered on ${link.shortUrl}.`);
  };

  const openDestination = (destinationUrl?: string) => {
    if (!destinationUrl || !isValidDestination(destinationUrl)) {
      triggerToast("This link has no valid destination URL.");
      return;
    }
    const url = /^https?:\/\//i.test(destinationUrl) ? destinationUrl : `https://${destinationUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "All";

  const toggleRetarget = (
    current: RetargetPixel[],
    pixel: RetargetPixel,
    setter: React.Dispatch<React.SetStateAction<RetargetPixel[]>>
  ) => {
    setter(
      current.includes(pixel) ? current.filter((item) => item !== pixel) : [...current, pixel]
    );
  };

  return (
    <PageShell className="font-sans text-slate-800">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl z-50">
          {toast}
        </div>
      )}

      <PageHeader
        title="Smart Short Links"
        subtitle="Deploy, brand, and track lightning-fast URLs with integrated dynamic routing."
        actions={
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 acn-btn-chip px-5 py-2.5 text-xs font-extrabold active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Shorten a Link</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Links</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">
              {activeLinks} / {links.length}
            </h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {activeLinks} live redirects
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
            <Link2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Click Traffic</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">
              {totalClicks.toLocaleString()}
            </h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Across all short links
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MousePointerClick className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Engagement</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">{clickInteraction}</h3>
            <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 mt-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {avgClicks.toFixed(1)} clicks / link
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Percent className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 acn-workspace-grid">
        <Workspace stack className="lg:col-span-2 min-w-0">
          <Workspace panel stack className="bg-white border border-slate-200/60 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-display font-black text-lg text-slate-900">Configured Links</h3>
              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                className={`inline-flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-colors self-start ${
                  showFilters || hasActiveFilters
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "hover:bg-slate-50 border-slate-200 text-slate-500"
                }`}
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">On</span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="acn-icon-field flex-1">
                  <span className="acn-icon-field__icon">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search title, slug, or destination..."
                    className="acn-icon-field__input w-full bg-white border border-slate-200 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    aria-label="Search links"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "All" | "Live" | "Paused")}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
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
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {links.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-slate-500 text-sm">No smart links yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-2 acn-btn-chip px-4 py-2 text-xs font-extrabold"
                >
                  <Plus className="h-4 w-4" />
                  Shorten a Link
                </button>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm space-y-2">
                <p>No links match your filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("All");
                  }}
                  className="text-[#6366f1] font-semibold hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="lg:hidden divide-y divide-slate-100">
                  {filteredLinks.map((link) => (
                    <div key={link.id} className="py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{link.title}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                            {link.destinationUrl || "No destination"}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                            className="text-indigo-600 font-black font-mono text-xs mt-1 hover:underline"
                          >
                            {link.shortUrl}
                          </button>
                        </div>
                        <button type="button" onClick={() => handleToggleStatus(link)}>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              link.status === "Live"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {link.status}
                          </span>
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-900">{link.clicks} clicks</span>
                        {(link.retargeting || []).map((pixel) => (
                          <span
                            key={pixel}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-black text-[8px] uppercase"
                          >
                            {pixel}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSimulateClick(link)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-xl text-[10px] font-black"
                        >
                          Simulate click
                        </button>
                        <button
                          type="button"
                          onClick={() => openDestination(link.destinationUrl)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl"
                          aria-label="Open destination"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(link)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl"
                          aria-label={`Edit ${link.title}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete shortened URL "${link.shortUrl}"?`)) {
                              onDeleteLink(link.id);
                              triggerToast("Link deleted.");
                            }
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                          aria-label={`Delete ${link.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black tracking-wider uppercase">
                        <th className="py-3 px-2">Title & Destination</th>
                        <th className="py-3 px-2">Short URL</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2">Retargeting</th>
                        <th className="py-3 px-2 text-right">Clicks</th>
                        <th className="py-3 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLinks.map((link) => (
                        <tr key={link.id} className="text-sm group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-2 max-w-xs">
                            <div className="font-bold text-slate-800 leading-tight truncate">{link.title}</div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                              Redirects to:{" "}
                              <span className="font-bold text-slate-500">
                                {link.destinationUrl || "Not configured"}
                              </span>
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                                className="text-indigo-600 font-black font-mono hover:underline text-xs"
                                title="Copy short URL"
                              >
                                {link.shortUrl}
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyText(link.shortUrl, "Short URL copied.")}
                                className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                                title="Copy URL"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(link)}
                              className="focus:outline-none"
                              title="Toggle link delivery"
                            >
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  link.status === "Live"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    link.status === "Live" ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                />
                                {link.status}
                              </span>
                            </button>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex gap-1 text-slate-400">
                              {link.retargeting?.includes("fb") && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-black text-[8px] uppercase tracking-wider border border-blue-100">
                                  FB
                                </span>
                              )}
                              {link.retargeting?.includes("google") && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-black text-[8px] uppercase tracking-wider border border-amber-100">
                                  GG
                                </span>
                              )}
                              {link.retargeting?.includes("tiktok") && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-gray-800 font-black text-[8px] uppercase tracking-wider border border-slate-200">
                                  TT
                                </span>
                              )}
                              {(!link.retargeting || link.retargeting.length === 0) && (
                                <span className="text-[10px] text-slate-400 font-medium">None</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-black text-slate-900">{link.clicks}</span>
                              <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                                <div
                                  className="bg-[#6366f1] h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, (link.clicks / (totalClicks || 1)) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSimulateClick(link)}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                                title="Simulate user click"
                              >
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span className="text-[9px] font-black">Click</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openDestination(link.destinationUrl)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl"
                                title="Open destination"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(link)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl"
                                title="Edit link"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete shortened URL "${link.shortUrl}"?`)) {
                                    onDeleteLink(link.id);
                                    triggerToast("Link deleted.");
                                  }
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                                title="Delete link"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Workspace>

          <Workspace panel stack className="bg-white border border-slate-200/60 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-black text-lg text-slate-900">Performance Timeline</h3>
              <span className="bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-3 py-1.5 text-xs font-semibold">
                Click activity
              </span>
            </div>

            <div className="relative pt-4">
              {totalClicks === 0 ? (
                <div className="h-44 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs font-bold text-slate-700">Waiting for short-link traffic</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                    Use Simulate click on a live link to register activity and update this chart.
                  </p>
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 overflow-visible"
                  role="img"
                  aria-label="Weekly click performance chart"
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = padding + ratio * (chartHeight - padding * 2);
                    return (
                      <line
                        key={index}
                        x1={padding}
                        y1={y}
                        x2={chartWidth - padding}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    );
                  })}
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />
                  {clickTrendPoints.map((point, index) => {
                    const x =
                      padding + (index * (chartWidth - padding * 2)) / (clickTrendPoints.length - 1);
                    const y =
                      chartHeight - padding - (point.value / maxVal) * (chartHeight - padding * 2);
                    return (
                      <g key={point.label}>
                        <circle cx={x} cy={y} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2">
                          <title>
                            {point.label}: {point.value} clicks
                          </title>
                        </circle>
                        <text
                          x={x}
                          y={chartHeight - 4}
                          fill="#94a3b8"
                          fontSize="9"
                          fontWeight="black"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </Workspace>
        </Workspace>

        <Workspace stack className="min-w-0">
          <Workspace panel stack className="bg-white border border-slate-200/60 rounded-2xl shadow-sm">
            <h3 className="font-display font-black text-slate-900 text-base">Handoff Diagnostics</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Traffic by region
                </p>
                <span className="text-[10px] font-mono text-slate-500">
                  {activeDevice}: {deviceClicks} clicks
                </span>
              </div>

              {geoBreakdown.map((country) => (
                <div key={country.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-slate-400" />
                      {country.name}
                    </span>
                    <span className="font-mono font-black text-slate-900">
                      {country.percentage}% · {country.clicks}
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {totalClicks === 0 && (
                <p className="text-[11px] text-slate-400">
                  Region estimates appear after your links receive clicks.
                </p>
              )}
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Device profiling
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { name: "MOBILE" as const, icon: Smartphone },
                    { name: "DESKTOP" as const, icon: Monitor },
                    { name: "TABLET" as const, icon: Tablet }
                  ]
                ).map((device) => {
                  const DevIcon = device.icon;
                  const isSelected = activeDevice === device.name;
                  const percentage =
                    totalClicks > 0 ? `${Math.round(DEVICE_SHARES[device.name] * 100)}%` : "0%";
                  return (
                    <button
                      key={device.name}
                      type="button"
                      onClick={() => setActiveDevice(device.name)}
                      aria-pressed={isSelected}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <DevIcon className={`h-4.5 w-4.5 mb-1 ${isSelected ? "text-white" : "text-slate-400"}`} />
                      <span className="text-[8px] font-black tracking-wider leading-none">{device.name}</span>
                      <span className="text-xs font-black mt-1 font-mono leading-none">{percentage}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                Selecting a device updates the regional breakdown for that profile.
              </p>
            </div>
          </Workspace>
        </Workspace>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-link-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 id="create-link-title" className="font-display font-black text-xl text-slate-900">
                Shorten a Link
              </h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Link title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Winter Sale Promo"
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
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Target long URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://mywebsite.com/winter-deal"
                  value={newTarget}
                  onChange={(event) => setNewTarget(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Short slug
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl px-3 py-2.5 text-xs text-slate-400 font-mono">
                    acn.link/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="winter-sale"
                    value={newSlug}
                    onChange={(event) => setNewSlug(normalizeSlug(event.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-r-xl py-2.5 px-3.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Retargeting pixels
                </label>
                <div className="flex gap-2">
                  {RETARGET_OPTIONS.map((pixel) => {
                    const isSelected = newRetargeting.includes(pixel.id);
                    return (
                      <button
                        key={pixel.id}
                        type="button"
                        onClick={() => toggleRetarget(newRetargeting, pixel.id, setNewRetargeting)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pixel.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {createError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 acn-btn-chip disabled:opacity-70 disabled:cursor-not-allowed text-xs font-extrabold"
                >
                  {isCreating ? "Creating…" : "Create Short Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-link-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 id="edit-link-title" className="font-display font-black text-xl text-slate-900">
                Configure Link
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6" noValidate>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Link title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Redirect target URL
                </label>
                <input
                  type="url"
                  required
                  value={editTarget}
                  onChange={(event) => setEditTarget(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Custom short slug
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl px-3 py-2.5 text-xs text-slate-400 font-mono">
                    acn.link/
                  </span>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(event) => setEditSlug(normalizeSlug(event.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-r-xl py-2.5 px-3.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Routing status
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
                      className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                        editStatus === status.id
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Retargeting pixels
                </label>
                <div className="flex gap-2">
                  {RETARGET_OPTIONS.map((pixel) => {
                    const isSelected = editRetargeting.includes(pixel.id);
                    return (
                      <button
                        key={pixel.id}
                        type="button"
                        onClick={() => toggleRetarget(editRetargeting, pixel.id, setEditRetargeting)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pixel.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-sm"
                >
                  {isSavingEdit ? "Saving…" : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
