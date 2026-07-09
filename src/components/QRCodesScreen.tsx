import React, { useState, useEffect } from "react";
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
  Copy,
  AlertCircle,
  FileImage,
  ExternalLink
} from "lucide-react";

interface QRCodesScreenProps {
  items: QRCodeItem[];
  onGenerateQR: (name: string, targetUrl: string, customColor: string) => void;
  onUpdateTargetUrl: (id: string, newUrl: string) => void;
  onDeleteQR: (id: string) => void;
  onUpdateQR: (item: QRCodeItem) => void;
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

  // State for interactive popups
  const [editingItem, setEditingItem] = useState<QRCodeItem | null>(null);
  const [editUrlValue, setEditUrlValue] = useState("");

  const [designingItem, setDesigningItem] = useState<QRCodeItem | null>(null);
  const [designColor, setDesignColor] = useState("#4F46E5");
  const [designPattern, setDesignPattern] = useState("rounded");
  const [designLogo, setDesignLogo] = useState("none");

  const [downloadingItem, setDownloadingItem] = useState<QRCodeItem | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "svg" | "pdf">("png");
  const [downloadQuality, setDownloadQuality] = useState("2000px");
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Helper parser for scan metric values
  const parseNumberValue = (val: string) => {
    if (!val) return 0;
    const clean = val.toLowerCase().trim();
    if (clean.endsWith("k")) {
      return Math.round(parseFloat(clean.replace("k", "")) * 1000);
    }
    return parseInt(clean, 10) || 0;
  };

  // Dynamically calculate metrics
  const totalScans = items.reduce((acc, curr) => acc + parseNumberValue(curr.scans), 0);
  const totalUnique = items.reduce((acc, curr) => acc + parseNumberValue(curr.uniqueScanners), 0);

  // Find top location
  const locations = items.map(item => item.topLocation).filter(loc => loc && loc !== "N/A");
  const topLoc = locations.length > 0 ? locations[0] : "N/A";

  // Calculate average conversion rate
  const rates = items.map(item => {
    const rateStr = item.conversionRate || "0%";
    return parseFloat(rateStr.replace("%", "")) || 0;
  });
  const avgRate = rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) + "%" : "0%";

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTarget) return;
    
    // Auto prefix https:// if missing
    let target = newTarget.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://") && !target.includes("acn.link")) {
      target = "https://" + target;
    }

    onGenerateQR(newName, target, selectedColor);
    setNewName("");
    setNewTarget("");
    setIsAdding(false);
    triggerToast("✨ Dynamic QR Code generated successfully!");
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editUrlValue) return;
    onUpdateTargetUrl(editingItem.id, editUrlValue);
    setEditingItem(null);
    triggerToast("🔗 Dynamic destination URL updated instantly!");
  };

  const handleSaveDesign = () => {
    if (!designingItem) return;

    // Build enhanced QR API code URL with custom color foreground
    const cleanColor = designColor.replace("#", "");
    const logoParam = designLogo !== "none" ? `&logo=${designLogo}` : "";
    const styleParam = `&pattern=${designPattern}`;
    const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=${cleanColor}&data=${encodeURIComponent(designingItem.targetUrl)}${logoParam}${styleParam}`;

    onUpdateQR({
      ...designingItem,
      qrUrl: newQrUrl,
      customDesign: true
    });

    setDesigningItem(null);
    triggerToast("🎨 Brand custom design settings saved!");
  };

  // Simulation handler to demonstrate real QR scan event
  const simulateScan = (item: QRCodeItem) => {
    const currentScans = parseNumberValue(item.scans);
    const currentUnique = parseNumberValue(item.uniqueScanners);
    
    const nextScans = currentScans + 1;
    // Generate simulated fresh metrics
    const nextUnique = currentUnique + (Math.random() > 0.3 ? 1 : 0);
    const possibleLocations = ["London, UK", "New York, US", "Berlin, DE", "Paris, FR", "Mumbai, IN"];
    const simulatedLoc = item.topLocation && item.topLocation !== "N/A" 
      ? item.topLocation 
      : possibleLocations[Math.floor(Math.random() * possibleLocations.length)];
    
    const simulatedRate = ((nextUnique / (nextScans || 1)) * 100).toFixed(1) + "%";

    onUpdateQR({
      ...item,
      scans: String(nextScans),
      uniqueScanners: String(nextUnique),
      topLocation: simulatedLoc,
      conversionRate: simulatedRate
    });

    triggerToast(`⚡ Simulated Scan registered for "${item.name}"! Metrics recalculated.`);
  };

  const triggerDownloadSimulation = () => {
    setIsPreparingDownload(true);
    setTimeout(() => {
      setIsPreparingDownload(false);
      setDownloadingItem(null);
      triggerToast(`📥 High resolution QR downloaded successfully in .${downloadFormat.toUpperCase()}!`);
    }, 1500);
  };

  const colorsList = [
    { name: "Indigo", value: "#4F46E5" },
    { name: "Emerald", value: "#10B981" },
    { name: "Rose", value: "#F43F5E" },
    { name: "Amber", value: "#F59E0B" },
    { name: "Slate", value: "#0F172A" }
  ];

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight">
            Smart QR Codes
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Generate unlimited dynamic QR codes. Track high-fidelity scan analytics, update destination targets instantly without printing again, and customize branding with high-resolution vector downloads.
          </p>
        </div>

        <div className="flex gap-2.5 shrink-0 self-start sm:self-auto">
          <button className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-all bg-white shadow-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Active Filters</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#FF5533] text-white rounded-2xl px-5 py-2.5 text-xs font-extrabold shadow-md transition-all active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Generate QR</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Scans", value: totalScans.toLocaleString(), change: totalScans > 0 ? "⚡ Live Scan activity" : "No scans yet", isPositive: totalScans > 0, icon: QrCode, bgIcon: "bg-indigo-50 text-indigo-600" },
          { label: "Unique Scanners", value: totalUnique.toLocaleString(), change: totalUnique > 0 ? "👥 Multi-device verified" : "No users yet", isPositive: totalUnique > 0, icon: Eye, bgIcon: "bg-amber-50 text-amber-600" },
          { label: "Top Location", value: topLoc, change: topLoc !== "N/A" ? "📍 Primary City traffic" : "No regions mapped", isPositive: topLoc !== "N/A", icon: MapPin, bgIcon: "bg-rose-50 text-rose-500" },
          { label: "Avg Conversion", value: avgRate, change: parseFloat(avgRate) > 0 ? "📈 High performance scan-to-click" : "Zero interaction level", isPositive: parseFloat(avgRate) > 0, icon: Percent, bgIcon: "bg-emerald-50 text-emerald-600" }
        ].map((m, index) => {
          const MIcon = m.icon;
          return (
            <div key={index} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                <h3 className="font-display font-black text-2xl text-slate-900 mt-1">{m.value}</h3>
                <span className={`text-[10px] font-bold flex items-center gap-1 mt-1.5 ${m.isPositive ? "text-emerald-600" : "text-slate-400"}`}>
                  {m.change}
                </span>
              </div>
              <div className={`h-11 w-11 rounded-xl ${m.bgIcon} flex items-center justify-center shrink-0`}>
                <MIcon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Codes Grid */}
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-3 shadow-sm">
          <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 text-2xl">
            🔲
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No QR codes found</h3>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
            Get started by generating your first dynamic QR code. Print once, then change destination links anytime!
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 inline-flex items-center gap-1.5 bg-[#FF6B4A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
          >
            Create Your First QR
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group relative">
              
              {/* Scan simulation badge */}
              <div className="absolute top-3 left-3 z-20">
                <button
                  onClick={() => simulateScan(item)}
                  className="bg-slate-900/95 hover:bg-slate-950 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md hover:scale-105 active:scale-95 transition-all"
                  title="Simulate scanning this QR Code to increase counts"
                >
                  <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                  <span>Simulate Scan</span>
                </button>
              </div>

              {/* Deletion control */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the "${item.name}" QR Code?`)) {
                      onDeleteQR(item.id);
                      triggerToast("🗑️ QR Code deleted permanently.");
                    }
                  }}
                  className="bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all shadow-sm border border-slate-100"
                  title="Delete QR"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Visual Header containing the QR code */}
              <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col items-center justify-center h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/30 to-indigo-50/10" />
                
                {/* QR Code image card container */}
                <div className="relative bg-white p-3.5 rounded-2xl border border-slate-100 shadow-md transform group-hover:scale-105 transition-transform duration-300 z-10 flex items-center justify-center">
                  <img
                    src={item.qrUrl}
                    alt="QR Code"
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 bg-white object-contain"
                  />
                </div>

                {/* Decorative smartphone backdrop to mirror standard UI templates */}
                {idx === 0 && <Smartphone className="absolute -right-6 -bottom-6 h-28 w-28 text-slate-200/30 -rotate-12" />}
                {idx === 1 && <Laptop className="absolute -right-8 -bottom-4 h-24 w-24 text-slate-200/30" />}
              </div>

              {/* Title & info area */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
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

                  <span className="text-xs text-indigo-600 font-bold font-mono block truncate flex items-center gap-1 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100">
                    <Link2 className="h-3 w-3 shrink-0 text-indigo-400" />
                    <span className="truncate">{item.targetUrl}</span>
                  </span>

                  {/* QR Stats blocks inside the card */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scans</p>
                      <p className="font-display font-black text-slate-800 text-sm mt-0.5">{item.scans}</p>
                    </div>
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unique</p>
                      <p className="font-display font-black text-slate-800 text-sm mt-0.5">{item.uniqueScanners}</p>
                    </div>
                  </div>

                  {/* Custom Design Indicator badge */}
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {item.customDesign ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                        <Paintbrush className="h-3 w-3 text-purple-400" />
                        Custom Design Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        Standard QR Pattern
                      </span>
                    )}
                  </div>
                </div>

                {/* Operations Actions row mimicking real design workspaces */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setEditUrlValue(item.targetUrl);
                    }}
                    className="bg-slate-50 hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80 hover:border-indigo-100 transition-colors"
                  >
                    Edit URL
                  </button>
                  <button
                    onClick={() => {
                      setDownloadingItem(item);
                    }}
                    className="bg-slate-50 hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80 hover:border-indigo-100 transition-colors text-center"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setDesigningItem(item);
                      const hexMatch = item.qrUrl.match(/color=([0-9A-Fa-f]{6})/);
                      if (hexMatch && hexMatch[1]) {
                        setDesignColor("#" + hexMatch[1]);
                      } else {
                        setDesignColor("#4F46E5");
                      }
                    }}
                    className="bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-700 rounded-xl py-2.5 text-[11px] font-black border border-slate-200/80 hover:border-purple-100 transition-all text-center"
                  >
                    Edit Design
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate QR Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-black text-xl text-slate-900">Generate Dynamic QR</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  QR CODE NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marvel Bio Stand QR"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  DESTINATION TARGET URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acn.link/summer-promo"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can change this target link at any time in the future without updating the QR image!
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  DEFAULT THEME COLOR
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
                  Create Dynamic QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit URL Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-black text-lg text-slate-900">Redirect QR Code</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  TARGET REDIRECT DESTINATION
                </label>
                <input
                  type="text"
                  required
                  value={editUrlValue}
                  onChange={(e) => setEditUrlValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Scanners will be seamlessly routed to this new link automatically.
                </span>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-950 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                Save Dynamic Destination
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Edit Design Modal */}
      {designingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-purple-600" />
                <h3 className="font-display font-black text-lg text-slate-900">QR Brand Customizer</h3>
              </div>
              <button onClick={() => setDesigningItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Preview of Custom QR */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Live Style Preview</p>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm relative">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=${designColor.replace("#", "")}&data=${encodeURIComponent(designingItem.targetUrl)}`}
                    alt="Styled QR Code"
                    className="h-28 w-28"
                  />
                  {designLogo !== "none" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white p-1 rounded-lg shadow-md border border-slate-100">
                        <span className="text-base">
                          {designLogo === "whatsapp" ? "💬" : designLogo === "link" ? "🔗" : designLogo === "star" ? "⭐" : "👤"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  BRAND ACCENT COLOR
                </label>
                <div className="flex gap-2.5">
                  {colorsList.map((col) => (
                    <button
                      key={col.value}
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
                      onChange={(e) => setDesignColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-600">Hex</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={designColor}
                  onChange={(e) => setDesignColor(e.target.value)}
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>

              {/* Pattern styles */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  PATTERN BLOCK STYLE
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "rounded", label: "Rounded Dots" },
                    { id: "square", label: "Classic Block" },
                    { id: "compact", label: "Fluid Grid" }
                  ].map((pat) => (
                    <button
                      key={pat.id}
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

              {/* Logo insert */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  EMBED CENTER BRAND LOGO
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: "none", label: "None", icon: "🚫" },
                    { id: "user", label: "Profile", icon: "👤" },
                    { id: "link", label: "Link", icon: "🔗" },
                    { id: "whatsapp", label: "Chat", icon: "💬" },
                    { id: "star", label: "Star", icon: "⭐" }
                  ].map((logo) => (
                    <button
                      key={logo.id}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDesigningItem(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveDesign}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  Save Style Customization
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Professional Download panel Modal */}
      {downloadingItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Download className="h-5 w-5 text-indigo-600" />
                <h3 className="font-display font-black text-lg text-slate-900">Download Vectors</h3>
              </div>
              <button onClick={() => setDownloadingItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                  <img src={downloadingItem.qrUrl} alt="Download Target" className="h-10 w-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-800 truncate">{downloadingItem.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{downloadingItem.targetUrl}</p>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  OUTPUT FILE FORMAT
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["png", "svg", "pdf"] as const).map((fmt) => (
                    <button
                      key={fmt}
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
                  {downloadFormat === "svg" ? "📐 Highly scalable vector graphic - perfect for print flyers, billboards, or stickers." : 
                   downloadFormat === "pdf" ? "📄 CMYK colorspace document formatted directly for layout designers." : 
                   "🖼️ Raster image ideal for sharing on websites, social networks, and emails."}
                </p>
              </div>

              {/* Quality Preset */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  IMAGE RESOLUTION (PNG ONLY)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["1000px", "2000px", "4000px (HQ)"].map((qty) => (
                    <button
                      key={qty}
                      disabled={downloadFormat !== "png"}
                      onClick={() => setDownloadQuality(qty)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-colors ${
                        downloadFormat !== "png" ? "opacity-40 cursor-not-allowed" :
                        downloadQuality === qty
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download CTA */}
              <div className="pt-2">
                <button
                  onClick={triggerDownloadSimulation}
                  disabled={isPreparingDownload}
                  className="w-full bg-[#FF6B4A] hover:bg-[#FF5533] text-white py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPreparingDownload ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Generating Vector Layout...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4" />
                      <span>Download {downloadFormat.toUpperCase()} Code</span>
                    </>
                  )}
                </button>
              </div>

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

      {/* Global Interactive Notification Toast Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 text-xs font-black py-3 px-5 rounded-2xl text-center shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 flex items-center justify-center gap-2">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
