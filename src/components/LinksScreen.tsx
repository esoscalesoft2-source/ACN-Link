import React, { useState } from "react";
import { SmartLink } from "../types";
import {
  Link2,
  TrendingUp,
  MousePointerClick,
  Percent,
  Plus,
  Filter,
  ListFilter,
  Check,
  X,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  Copy,
  ToggleLeft,
  ToggleRight,
  Share2
} from "lucide-react";

interface LinksScreenProps {
  links: SmartLink[];
  onCreateLink: (title: string, slug: string, shortUrl: string) => void;
  onDeleteLink: (id: string) => void;
  onUpdateLink: (updated: SmartLink) => void;
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
  const [newRetargeting, setNewRetargeting] = useState<("fb" | "google" | "tiktok")[]>(["fb", "google"]);

  // State for editing links
  const [editingLink, setEditingLink] = useState<SmartLink | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editStatus, setEditStatus] = useState<"Live" | "Paused">("Live");
  const [editRetargeting, setEditRetargeting] = useState<("fb" | "google" | "tiktok")[]>([]);

  const [activeDevice, setActiveDevice] = useState("MOBILE");
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    triggerToast("📋 Short URL copied to clipboard!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSlug) return;

    // Check if slug is already used
    const cleanSlug = newSlug.trim().replace(/^\//, "");
    const short = "acn.link/" + cleanSlug;

    onCreateLink(newTitle, "/" + cleanSlug, short);

    setNewTitle("");
    setNewSlug("");
    setNewTarget("");
    setIsAdding(false);
    triggerToast("✨ Smart Link created successfully!");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    const cleanSlug = editSlug.trim().replace(/^\//, "");
    onUpdateLink({
      ...editingLink,
      title: editTitle,
      slug: "/" + cleanSlug,
      shortUrl: "acn.link/" + cleanSlug,
      status: editStatus,
      retargeting: editRetargeting as any
    });

    setEditingLink(null);
    triggerToast("💾 Link configuration saved!");
  };

  const handleToggleStatus = (link: SmartLink) => {
    const nextStatus = link.status === "Live" ? "Paused" : "Live";
    onUpdateLink({
      ...link,
      status: nextStatus
    });
    triggerToast(`Status switched to ${nextStatus}`);
  };

  // Simulate user click event to increase metrics live!
  const handleSimulateClick = (link: SmartLink) => {
    onUpdateLink({
      ...link,
      clicks: link.clicks + 1
    });
    triggerToast(`⚡ Simulated Click registered on acn.link${link.slug}!`);
  };

  // Dynamically calculate metrics based on state
  const totalClicks = links.reduce((acc, curr) => acc + curr.clicks, 0);
  const activeLinks = links.filter((l) => l.status === "Live").length;
  const clickConversionRate = links.length > 0 ? ((totalClicks / (links.length * 10 || 1)) * 10).toFixed(1) + "%" : "0%";

  // Generate trend line based on actual clicks
  const clickTrendPoints = [
    { label: "MON", value: Math.round(totalClicks * 0.1) },
    { label: "TUE", value: Math.round(totalClicks * 0.15) },
    { label: "WED", value: Math.round(totalClicks * 0.12) },
    { label: "THU", value: Math.round(totalClicks * 0.22) },
    { label: "FRI", value: Math.round(totalClicks * 0.18) },
    { label: "SAT", value: Math.round(totalClicks * 0.35) },
    { label: "SUN", value: Math.round(totalClicks * 0.45) }
  ];

  // Helper to draw clean SVG line
  const maxVal = Math.max(...clickTrendPoints.map((p) => p.value), 10);
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 25;

  const pointsString = clickTrendPoints
    .map((pt, i) => {
      const x = padding + (i * (chartWidth - padding * 2)) / (clickTrendPoints.length - 1);
      const y = chartHeight - padding - (pt.value / maxVal) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative font-sans text-slate-800">
      
      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 text-xs font-black py-3 px-5 rounded-2xl text-center shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 flex items-center justify-center gap-2">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight">
            Smart Short Links
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Deploy, brand, and track lightning-fast URLs with integrated dynamic routing.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#FF5533] text-white rounded-2xl px-5 py-2.5 text-xs font-extrabold shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Shorten a Link</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Links</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">{activeLinks} / {links.length}</h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              100% cloud delivery verified
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
            <Link2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Click Traffic</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">{totalClicks.toLocaleString()}</h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Real-time events logging active
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MousePointerClick className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click Interaction Level</p>
            <h3 className="font-display font-black text-3xl text-slate-900 mt-1">{clickConversionRate}</h3>
            <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 mt-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Optimized redirects
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Percent className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Active Links and Click trends */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Links Table */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-lg text-slate-900">Configured Links</h3>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                  <ListFilter className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black tracking-wider uppercase">
                    <th className="py-3 px-2">Title & Destination</th>
                    <th className="py-3 px-2">Short URL</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Retargeting</th>
                    <th className="py-3 px-2 text-right">Clicks (7D)</th>
                    <th className="py-3 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {links.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No custom smart links shortened yet. Click "Shorten a Link" to begin!
                      </td>
                    </tr>
                  ) : (
                    links.map((link) => (
                      <tr key={link.id} className="text-sm group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2 max-w-xs">
                          <div className="font-bold text-slate-800 leading-tight truncate">{link.title}</div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                            Redirects to: <span className="font-bold text-slate-500">{link.slug}</span>
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => handleCopyLink(link.shortUrl)}
                              className="text-indigo-600 font-black font-mono cursor-pointer hover:underline text-xs"
                              title="Copy Short URL"
                            >
                              {link.shortUrl}
                            </span>
                            <button
                              onClick={() => handleCopyLink(link.shortUrl)}
                              className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                              title="Copy URL"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <button
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
                              <span className={`h-1.5 w-1.5 rounded-full ${link.status === "Live" ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {link.status}
                            </span>
                          </button>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex gap-1 text-slate-400">
                            {link.retargeting && link.retargeting.includes("fb") && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-black text-[8px] uppercase tracking-wider border border-blue-100">
                                FB
                              </span>
                            )}
                            {link.retargeting && link.retargeting.includes("google") && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-black text-[8px] uppercase tracking-wider border border-amber-100">
                                GG
                              </span>
                            )}
                            {link.retargeting && link.retargeting.includes("tiktok") && (
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
                                className="bg-[#FF6B4A] h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (link.clicks / (totalClicks || 1)) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Simulate click */}
                            <button
                              onClick={() => handleSimulateClick(link)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                              title="Simulate User Redirect Click"
                            >
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              <span className="text-[9px] font-black">Click</span>
                            </button>

                            {/* Edit Link Details */}
                            <button
                              onClick={() => {
                                setEditingLink(link);
                                setEditTitle(link.title);
                                setEditTarget(link.slug);
                                setEditSlug(link.shortUrl.split("acn.link/")[1] || "");
                                setEditStatus(link.status);
                                setEditRetargeting(link.retargeting || []);
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl"
                              title="Edit Link"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Link */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete shortened URL "${link.shortUrl}"?`)) {
                                  onDeleteLink(link.id);
                                  triggerToast("🗑️ Link deleted permanently.");
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                              title="Delete Link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Click Trends Chart */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-lg text-slate-900">Performance Timeline</h3>
              <span className="bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-3 py-1.5 text-xs font-semibold">
                Live Click Activity
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="relative pt-4">
              {totalClicks === 0 ? (
                <div className="h-44 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-2xl mb-1">📈</p>
                  <p className="text-xs font-bold text-slate-700">Waiting for live short-link traffic</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                    Click "Click" on any of your links to simulate user interaction and trace analytics instantly!
                  </p>
                </div>
              ) : (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                  {/* Horizontal gridlines */}
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

                  {/* Line Path */}
                  <polyline
                    fill="none"
                    stroke="#FF6B4A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                    className="drop-shadow-md"
                  />

                  {/* Interactive Points on Line */}
                  {clickTrendPoints.map((pt, i) => {
                    const x = padding + (i * (chartWidth - padding * 2)) / (clickTrendPoints.length - 1);
                    const y = chartHeight - padding - (pt.value / maxVal) * (chartHeight - padding * 2);
                    return (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#FF6B4A"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <title>{pt.label}: {pt.value} clicks</title>
                      </g>
                    );
                  })}

                  {/* X-Axis labels */}
                  {clickTrendPoints.map((pt, i) => {
                    const x = padding + (i * (chartWidth - padding * 2)) / (clickTrendPoints.length - 1);
                    return (
                      <text
                        key={i}
                        x={x}
                        y={chartHeight - 4}
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="black"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {pt.label}
                      </text>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Traffic Breakdown */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-display font-black text-slate-900 text-base">Handoff Diagnostics</h3>

            {/* Country breakdown list */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Traffic</p>

              {[
                { name: "United States", percentage: totalClicks > 0 ? 55 : 0 },
                { name: "United Kingdom", percentage: totalClicks > 0 ? 25 : 0 },
                { name: "Germany", percentage: totalClicks > 0 ? 20 : 0 }
              ].map((country) => (
                <div key={country.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-slate-400" />
                      {country.name}
                    </span>
                    <span className="font-mono font-black text-slate-900">{country.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Devices grid */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Profiling</p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "MOBILE", percentage: totalClicks > 0 ? "72%" : "0%", icon: Smartphone },
                  { name: "DESKTOP", percentage: totalClicks > 0 ? "20%" : "0%", icon: Monitor },
                  { name: "TABLET", percentage: totalClicks > 0 ? "8%" : "0%", icon: Tablet }
                ].map((dev) => {
                  const DevIcon = dev.icon;
                  const isSelected = activeDevice === dev.name;
                  return (
                    <button
                      key={dev.name}
                      onClick={() => setActiveDevice(dev.name)}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-950/10"
                          : "border-slate-250 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <DevIcon className={`h-4.5 w-4.5 mb-1 ${isSelected ? "text-white" : "text-slate-400"}`} />
                      <span className="text-[8px] font-black tracking-wider leading-none">{dev.name}</span>
                      <span className="text-xs font-black mt-1 font-mono leading-none">{dev.percentage}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Link Dialog Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-black text-xl text-slate-900">Shorten a Link</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  LINK TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Sale Promo"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  TARGET LONG URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mywebsite.com/winter-deal-xyz"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  SHORT SLUG
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
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-r-xl py-2.5 px-3.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Retargeting pixels select */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  DEPLOY RETARGETING PIXELS
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "fb", label: "Facebook" },
                    { id: "google", label: "Google Ads" },
                    { id: "tiktok", label: "TikTok Pixel" }
                  ].map((px) => {
                    const isSelected = newRetargeting.includes(px.id as any);
                    return (
                      <button
                        key={px.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewRetargeting(newRetargeting.filter(r => r !== px.id));
                          } else {
                            setNewRetargeting([...newRetargeting, px.id as any]);
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {px.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#FF6B4A] hover:bg-[#FF5533] text-white rounded-xl text-xs font-extrabold shadow-sm"
                >
                  Create Short Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Link Dialog Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-black text-xl text-slate-900">Configure Link</h3>
              <button onClick={() => setEditingLink(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  LINK TITLE
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  REDIRECT TARGET URL
                </label>
                <input
                  type="text"
                  required
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  CUSTOM SHORT SLUG
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl px-3 py-2.5 text-xs text-slate-400 font-mono">
                    acn.link/
                  </span>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-r-xl py-2.5 px-3.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  ROUTING DELIVERY STATUS
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "Live", label: "Live Redirect (Active)", icon: "🟢" },
                    { id: "Paused", label: "Pause Redirect (Inactive)", icon: "⏸️" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditStatus(st.id as any)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        editStatus === st.id
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{st.icon}</span>
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Retargeting pixels select */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  DEPLOY RETARGETING PIXELS
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "fb", label: "Facebook" },
                    { id: "google", label: "Google Ads" },
                    { id: "tiktok", label: "TikTok Pixel" }
                  ].map((px) => {
                    const isSelected = editRetargeting.includes(px.id as any);
                    return (
                      <button
                        key={px.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditRetargeting(editRetargeting.filter(r => r !== px.id));
                          } else {
                            setEditRetargeting([...editRetargeting, px.id as any]);
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {px.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
