import React, { useMemo, useState } from "react";
import { QRCodeItem } from "../types";
import {
  QrCode,
  Plus,
  Filter,
  MapPin,
  Percent,
  Download,
  Link2,
  Paintbrush,
  Eye,
  X,
  Smartphone,
  Laptop,
  Check,
  Trash2,
  Sparkles,
  RefreshCw,
  FileImage,
  ExternalLink,
  Search,
  Pause,
  Play
} from "lucide-react";
import PageShell, { PageHeader } from "./layout/PageShell";

interface QRCodesScreenProps {
  items: QRCodeItem[];
  onGenerateQR: (name: string, targetUrl: string, customColor: string) => void;
  onUpdateTargetUrl: (id: string, newUrl: string) => void;
  onDeleteQR: (id: string) => void;
  onUpdateQR: (item: QRCodeItem) => void;
}

const colorsList = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Emerald", value: "#10B981" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Slate", value: "#0F172A" }
];

const LOGO_OPTIONS = [
  { id: "none" as const, label: "None", icon: "🚫" },
  { id: "user" as const, label: "Profile", icon: "👤" },
  { id: "link" as const, label: "Link", icon: "🔗" },
  { id: "whatsapp" as const, label: "Chat", icon: "💬" },
  { id: "star" as const, label: "Star", icon: "⭐" }
];

function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("acn.link")) return trimmed;
  return `https://${trimmed}`;
}

function buildQrUrl(targetUrl: string, color: string, size = 250): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=${color.replace("#", "")}&data=${encodeURIComponent(targetUrl)}`;
}

function buildSvgQrUrl(targetUrl: string, color: string, size = 500): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=${color.replace("#", "")}&format=svg&data=${encodeURIComponent(targetUrl)}`;
}

function logoEmoji(logo?: QRCodeItem["designLogo"]): string {
  if (logo === "whatsapp") return "💬";
  if (logo === "link") return "🔗";
  if (logo === "star") return "⭐";
  if (logo === "user") return "👤";
  return "";
}

function parseNumberValue(val: string) {
  if (!val) return 0;
  const clean = val.toLowerCase().trim();
  if (clean.endsWith("k")) {
    return Math.round(parseFloat(clean.replace("k", "")) * 1000);
  }
  return parseInt(clean, 10) || 0;
}

function extractColor(qrUrl: string, fallback = "#4F46E5"): string {
  const match = qrUrl.match(/color=([0-9A-Fa-f]{6})/i);
  return match?.[1] ? `#${match[1]}` : fallback;
}

export default function QRCodesScreen({
  items,
  onGenerateQR,
  onUpdateTargetUrl,
  onDeleteQR,
  onUpdateQR
}: QRCodesScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [selectedColor, setSelectedColor] = useState("#4F46E5");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingItem, setEditingItem] = useState<QRCodeItem | null>(null);
  const [editUrlValue, setEditUrlValue] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  const [designingItem, setDesigningItem] = useState<QRCodeItem | null>(null);
  const [designColor, setDesignColor] = useState("#4F46E5");
  const [designPattern, setDesignPattern] = useState<"rounded" | "square" | "compact">("rounded");
  const [designLogo, setDesignLogo] = useState<QRCodeItem["designLogo"]>("none");
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  const [downloadingItem, setDownloadingItem] = useState<QRCodeItem | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "svg" | "pdf">("png");
  const [downloadQuality, setDownloadQuality] = useState("2000px");
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Paused">("All");
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.targetUrl.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const totalScans = items.reduce((acc, curr) => acc + parseNumberValue(curr.scans), 0);
  const totalUnique = items.reduce((acc, curr) => acc + parseNumberValue(curr.uniqueScanners), 0);
  const locations = items.map((item) => item.topLocation).filter((loc) => loc && loc !== "N/A");
  const topLoc = locations[0] || "N/A";
  const rates = items.map((item) => parseFloat((item.conversionRate || "0%").replace("%", "")) || 0);
  const avgRate =
    rates.length > 0 ? `${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)}%` : "0%";

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "All";

  const resetCreateForm = () => {
    setNewName("");
    setNewTarget("");
    setSelectedColor("#4F46E5");
    setCreateError("");
  };

  const handleGenerate = (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    const name = newName.trim();
    const target = normalizeUrl(newTarget);

    if (!name) {
      setCreateError("QR code name is required.");
      return;
    }
    if (!isValidUrl(target)) {
      setCreateError("Enter a valid destination URL.");
      return;
    }
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setCreateError("A QR code with this name already exists.");
      return;
    }

    setIsCreating(true);
    window.setTimeout(() => {
      onGenerateQR(name, target, selectedColor);
      setIsCreating(false);
      setIsAdding(false);
      resetCreateForm();
      triggerToast("Dynamic QR code generated successfully.");
    }, 300);
  };

  const handleSaveUrl = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingItem) return;
    setEditError("");

    const target = normalizeUrl(editUrlValue);
    if (!isValidUrl(target)) {
      setEditError("Enter a valid destination URL.");
      return;
    }

    setIsSavingUrl(true);
    window.setTimeout(() => {
      onUpdateTargetUrl(editingItem.id, target);
      setIsSavingUrl(false);
      setEditingItem(null);
      triggerToast("Destination URL updated. Existing prints still work.");
    }, 300);
  };

  const handleSaveDesign = () => {
    if (!designingItem || isSavingDesign) return;
    if (!/^#[0-9A-Fa-f]{6}$/.test(designColor)) {
      triggerToast("Enter a valid hex color like #4F46E5.");
      return;
    }

    setIsSavingDesign(true);
    window.setTimeout(() => {
      onUpdateQR({
        ...designingItem,
        qrUrl: buildQrUrl(designingItem.targetUrl, designColor, 250),
        customDesign: true,
        designColor,
        designLogo: designLogo || "none",
        designPattern
      });
      setIsSavingDesign(false);
      setDesigningItem(null);
      triggerToast("Brand design saved. Color is embedded in the QR image.");
    }, 300);
  };

  const simulateScan = (item: QRCodeItem) => {
    if (item.status !== "Active") {
      triggerToast("Paused QR codes cannot receive scans. Activate it first.");
      return;
    }

    const currentScans = parseNumberValue(item.scans);
    const currentUnique = parseNumberValue(item.uniqueScanners);
    const nextScans = currentScans + 1;
    const nextUnique = currentUnique + (Math.random() > 0.3 ? 1 : 0);
    const possibleLocations = ["London, UK", "New York, US", "Berlin, DE", "Paris, FR", "Mumbai, IN"];
    const simulatedLoc =
      item.topLocation && item.topLocation !== "N/A"
        ? item.topLocation
        : possibleLocations[Math.floor(Math.random() * possibleLocations.length)];

    onUpdateQR({
      ...item,
      scans: String(nextScans),
      uniqueScanners: String(nextUnique),
      topLocation: simulatedLoc,
      conversionRate: `${((nextUnique / (nextScans || 1)) * 100).toFixed(1)}%`
    });
    triggerToast(`Simulated scan registered for "${item.name}".`);
  };

  const toggleStatus = (item: QRCodeItem) => {
    const nextStatus = item.status === "Active" ? "Paused" : "Active";
    onUpdateQR({ ...item, status: nextStatus });
    triggerToast(`"${item.name}" is now ${nextStatus}.`);
  };

  const downloadBlob = async (url: string, filename: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const triggerDownload = async () => {
    if (!downloadingItem || isPreparingDownload) return;

    const color = downloadingItem.designColor || extractColor(downloadingItem.qrUrl);
    const safeName = downloadingItem.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "qr-code";
    const size =
      downloadQuality.includes("4000") ? 4000 : downloadQuality.includes("1000") ? 1000 : 2000;

    setIsPreparingDownload(true);
    try {
      if (downloadFormat === "svg") {
        await downloadBlob(buildSvgQrUrl(downloadingItem.targetUrl, color, 500), `${safeName}.svg`);
        triggerToast("SVG QR downloaded.");
      } else if (downloadFormat === "pdf") {
        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
        if (!printWindow) {
          throw new Error("Popup blocked");
        }
        const pngUrl = buildQrUrl(downloadingItem.targetUrl, color, 2000);
        printWindow.document.write(`<!doctype html><html><head><title>${downloadingItem.name} QR</title>
          <style>
            body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:16px}
            img{width:360px;height:360px;object-fit:contain}
            p{color:#64748b;font-size:12px}
          </style></head><body>
          <h1>${downloadingItem.name}</h1>
          <img src="${pngUrl}" alt="QR Code" />
          <p>${downloadingItem.targetUrl}</p>
          <script>window.onload=()=>{window.print();}</script>
          </body></html>`);
        printWindow.document.close();
        triggerToast("Print dialog opened for PDF/print export.");
      } else {
        await downloadBlob(buildQrUrl(downloadingItem.targetUrl, color, size), `${safeName}.png`);
        triggerToast(`PNG QR downloaded at ${size}px.`);
      }
      setDownloadingItem(null);
    } catch {
      triggerToast("Download failed. Check your connection and try again.");
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const openDesignModal = (item: QRCodeItem) => {
    setDesigningItem(item);
    setDesignColor(item.designColor || extractColor(item.qrUrl));
    setDesignPattern(item.designPattern || "rounded");
    setDesignLogo(item.designLogo || "none");
  };

  return (
    <PageShell className="font-sans text-slate-800">
      <PageHeader
        title="Smart QR Codes"
        subtitle="Generate dynamic QR codes, update destinations anytime, and download print-ready assets."
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowFilters((open) => !open)}
              className={`flex items-center gap-2 border rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                showFilters || hasActiveFilters
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600 bg-white"
              }`}
              aria-expanded={showFilters}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 acn-btn-chip px-5 py-2.5 text-xs font-extrabold active:scale-95"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Generate QR</span>
            </button>
          </>
        }
      />

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="acn-icon-field flex-1">
            <span className="acn-icon-field__icon">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or destination URL..."
              className="acn-icon-field__input w-full bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              aria-label="Search QR codes"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | "Active" | "Paused")}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            label: "Total Scans",
            value: totalScans.toLocaleString(),
            change: totalScans > 0 ? "Live scan activity" : "No scans yet",
            isPositive: totalScans > 0,
            icon: QrCode,
            bgIcon: "bg-indigo-50 text-indigo-600"
          },
          {
            label: "Unique Scanners",
            value: totalUnique.toLocaleString(),
            change: totalUnique > 0 ? "Unique devices tracked" : "No users yet",
            isPositive: totalUnique > 0,
            icon: Eye,
            bgIcon: "bg-amber-50 text-amber-600"
          },
          {
            label: "Top Location",
            value: topLoc,
            change: topLoc !== "N/A" ? "Primary city traffic" : "No regions mapped",
            isPositive: topLoc !== "N/A",
            icon: MapPin,
            bgIcon: "bg-rose-50 text-rose-500"
          },
          {
            label: "Avg Conversion",
            value: avgRate,
            change: parseFloat(avgRate) > 0 ? "Scan-to-unique rate" : "Zero interaction level",
            isPositive: parseFloat(avgRate) > 0,
            icon: Percent,
            bgIcon: "bg-emerald-50 text-emerald-600"
          }
        ].map((metric) => {
          const MIcon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-8 shadow-sm hover:shadow-md transition-all flex items-start justify-between min-w-0"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 mt-1 truncate">
                  {metric.value}
                </h3>
                <span
                  className={`text-[10px] font-bold flex items-center gap-1 mt-1.5 ${
                    metric.isPositive ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <div className={`h-11 w-11 rounded-xl ${metric.bgIcon} flex items-center justify-center shrink-0`}>
                <MIcon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-4 text-center max-w-xl mx-auto space-y-3 shadow-sm">
          <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <QrCode className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No QR codes found</h3>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
            Generate your first dynamic QR code. Print once, then change the destination anytime.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-2 inline-flex items-center gap-1.5 acn-btn-chip px-4 py-2 text-xs font-bold"
          >
            Create Your First QR
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-3">
          <p className="text-sm text-slate-500">No QR codes match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
            }}
            className="text-[#6366f1] text-sm font-semibold hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 acn-workspace-grid">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group relative"
            >
              <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => simulateScan(item)}
                  className="bg-slate-900/95 hover:bg-slate-950 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md"
                  title="Simulate scanning this QR code"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Simulate Scan</span>
                </button>
              </div>

              <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleStatus(item)}
                  className="bg-white/90 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-all shadow-sm border border-slate-100"
                  title={item.status === "Active" ? "Pause QR" : "Activate QR"}
                  aria-label={item.status === "Active" ? "Pause QR" : "Activate QR"}
                >
                  {item.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete the "${item.name}" QR code?`)) {
                      onDeleteQR(item.id);
                      triggerToast("QR code deleted.");
                    }
                  }}
                  className="bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all shadow-sm border border-slate-100"
                  title="Delete QR"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col items-center justify-center h-48 relative overflow-hidden">
                <div className="relative bg-white p-3.5 rounded-2xl border border-slate-100 shadow-md transform group-hover:scale-105 transition-transform duration-300 z-10 flex items-center justify-center">
                  <img
                    src={item.qrUrl}
                    alt={`${item.name} QR code`}
                    referrerPolicy="no-referrer"
                    className={`h-24 w-24 bg-white object-contain ${
                      item.designPattern === "rounded"
                        ? "rounded-lg"
                        : item.designPattern === "compact"
                          ? "rounded-md scale-95"
                          : ""
                    }`}
                  />
                  {item.designLogo && item.designLogo !== "none" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white p-1 rounded-lg shadow-md border border-slate-100">
                        <span className="text-base">{logoEmoji(item.designLogo)}</span>
                      </div>
                    </div>
                  )}
                </div>
                {idx % 2 === 0 ? (
                  <Smartphone className="absolute -right-6 -bottom-6 h-28 w-28 text-slate-200/30 -rotate-12" />
                ) : (
                  <Laptop className="absolute -right-8 -bottom-4 h-24 w-24 text-slate-200/30" />
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display font-black text-slate-900 text-base leading-snug truncate">
                      {item.name}
                    </h4>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        item.status === "Active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <a
                    href={/^https?:\/\//i.test(item.targetUrl) ? item.targetUrl : `https://${item.targetUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 font-bold font-mono truncate flex items-center gap-1 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100 hover:bg-indigo-50"
                  >
                    <Link2 className="h-3 w-3 shrink-0 text-indigo-400" />
                    <span className="truncate">{item.targetUrl}</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scans</p>
                      <p className="font-display font-black text-slate-800 text-sm mt-0.5">{item.scans}</p>
                    </div>
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unique</p>
                      <p className="font-display font-black text-slate-800 text-sm mt-0.5">
                        {item.uniqueScanners}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5">
                    {item.customDesign ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                        <Paintbrush className="h-3 w-3 text-purple-400" />
                        Custom Design
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        Standard QR Pattern
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setEditUrlValue(item.targetUrl);
                      setEditError("");
                    }}
                    className="bg-slate-50 hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80"
                  >
                    Edit URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadingItem(item)}
                    className="bg-slate-50 hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => openDesignModal(item)}
                    className="bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80"
                  >
                    Edit Design
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="generate-qr-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 id="generate-qr-title" className="font-display font-black text-xl text-slate-900">
                Generate Dynamic QR
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isCreating) {
                    setIsAdding(false);
                    resetCreateForm();
                  }
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6" noValidate>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  QR code name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Marvel Bio Stand QR"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Destination target URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://acn.link/summer-promo"
                  value={newTarget}
                  onChange={(event) => setNewTarget(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can change this destination later without reprinting the QR.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Default theme color
                </label>
                <div className="flex gap-2.5 mt-1.5">
                  {colorsList.map((col) => {
                    const isSelected = selectedColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setSelectedColor(col.value)}
                        className="h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-105"
                        style={{
                          backgroundColor: col.value,
                          borderColor: isSelected ? "#000000" : "transparent"
                        }}
                        title={col.name}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white" />}
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
                  disabled={isCreating}
                  onClick={() => {
                    setIsAdding(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 acn-btn-chip disabled:opacity-70 disabled:cursor-not-allowed text-xs font-extrabold"
                >
                  {isCreating ? "Creating…" : "Create Dynamic QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-url-title"
            className="bg-white rounded-3xl max-w-sm w-full p-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="edit-url-title" className="font-display font-black text-lg text-slate-900">
                Redirect QR Code
              </h3>
              <button
                type="button"
                onClick={() => !isSavingUrl && setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUrl} className="space-y-6" noValidate>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Target redirect destination
                </label>
                <input
                  type="url"
                  required
                  value={editUrlValue}
                  onChange={(event) => setEditUrlValue(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>
              {editError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {editError}
                </p>
              )}
              <button
                type="submit"
                disabled={isSavingUrl}
                className="w-full bg-slate-900 hover:bg-slate-950 disabled:opacity-70 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm"
              >
                {isSavingUrl ? "Saving…" : "Save Dynamic Destination"}
              </button>
            </form>
          </div>
        </div>
      )}

      {designingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="design-qr-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-purple-600" />
                <h3 id="design-qr-title" className="font-display font-black text-lg text-slate-900">
                  QR Brand Customizer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isSavingDesign && setDesigningItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  Live style preview
                </p>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm relative">
                  <img
                    src={buildQrUrl(designingItem.targetUrl, designColor, 150)}
                    alt="Styled QR Code"
                    className={`h-28 w-28 ${
                      designPattern === "rounded"
                        ? "rounded-lg"
                        : designPattern === "compact"
                          ? "rounded-md scale-95"
                          : ""
                    }`}
                  />
                  {designLogo !== "none" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white p-1 rounded-lg shadow-md border border-slate-100">
                        <span className="text-base">{logoEmoji(designLogo)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Color is baked into the QR image. Logo and pattern are visual overlays for branding.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Brand accent color
                </label>
                <div className="flex gap-2.5">
                  {colorsList.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setDesignColor(col.value)}
                      className="h-7 w-7 rounded-full border flex items-center justify-center transition-transform hover:scale-110"
                      style={{
                        backgroundColor: col.value,
                        borderColor: designColor === col.value ? "#000000" : "transparent"
                      }}
                    >
                      {designColor === col.value && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                  <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center relative cursor-pointer hover:bg-slate-200">
                    <input
                      type="color"
                      value={designColor}
                      onChange={(event) => setDesignColor(event.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-600">Hex</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={designColor}
                  onChange={(event) => setDesignColor(event.target.value)}
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Frame style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "rounded" as const, label: "Rounded" },
                      { id: "square" as const, label: "Classic" },
                      { id: "compact" as const, label: "Compact" }
                    ]
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => setDesignPattern(pat.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                        designPattern === pat.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Center brand mark
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {LOGO_OPTIONS.map((logo) => (
                    <button
                      key={logo.id}
                      type="button"
                      onClick={() => setDesignLogo(logo.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        designLogo === logo.id
                          ? "bg-purple-50 text-purple-700 border-purple-400 ring-2 ring-purple-100"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-base mb-1">{logo.icon}</span>
                      <span className="text-[8px] font-bold leading-none">{logo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingDesign}
                  onClick={() => setDesigningItem(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSavingDesign}
                  onClick={handleSaveDesign}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 disabled:opacity-70 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  {isSavingDesign ? "Saving…" : "Save Style"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {downloadingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-qr-title"
            className="bg-white rounded-3xl max-w-sm w-full p-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                <Download className="h-5 w-5 text-indigo-600" />
                <h3 id="download-qr-title" className="font-display font-black text-lg text-slate-900">
                  Download QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isPreparingDownload && setDownloadingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                  <img src={downloadingItem.qrUrl} alt="Download target" className="h-10 w-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-800 truncate">{downloadingItem.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{downloadingItem.targetUrl}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Output format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["png", "svg", "pdf"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setDownloadFormat(fmt)}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-colors uppercase ${
                        downloadFormat === fmt
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                  {downloadFormat === "svg"
                    ? "Scalable vector — best for print and large formats."
                    : downloadFormat === "pdf"
                      ? "Opens a print dialog so you can save as PDF."
                      : "Raster PNG for web, social, and email."}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Image resolution (PNG)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["1000px", "2000px", "4000px (HQ)"].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      disabled={downloadFormat !== "png"}
                      onClick={() => setDownloadQuality(qty)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-colors ${
                        downloadFormat !== "png"
                          ? "opacity-40 cursor-not-allowed"
                          : downloadQuality === qty
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void triggerDownload()}
                disabled={isPreparingDownload}
                className="w-full acn-btn-chip py-3 font-black text-xs disabled:opacity-50"
              >
                {isPreparingDownload ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Preparing download…</span>
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4" />
                    <span>
                      {downloadFormat === "pdf"
                        ? "Open Print / PDF"
                        : `Download ${downloadFormat.toUpperCase()}`}
                    </span>
                  </>
                )}
              </button>

              <div className="flex justify-center">
                <a
                  href={downloadingItem.qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <span>Open direct asset source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 text-xs font-black py-3 px-5 rounded-2xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
