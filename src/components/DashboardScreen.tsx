import React, { useState } from "react";
import { ScreenId, BioPage, SmartLink } from "../types";
import { Smartphone, Link2, QrCode, FileText, ArrowRight } from "lucide-react";

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  metrics: {
    totalClicks: number;
    pageViews: number;
    activeLinks: number;
    activePages: number;
    totalRegisters?: number;
    events?: any[];
  };
  pages: BioPage[];
  links: SmartLink[];
}

export default function DashboardScreen({ onNavigate, metrics, pages, links }: DashboardScreenProps) {
  const [timeRange, setTimeRange] = useState("30D");
  const ranges = ["7D", "30D", "90D", "All"];
  
  const eventsList = metrics.events || [];
  const totalRegisters = metrics.totalRegisters || 0;

  const quickAccess = [
    {
      id: ScreenId.BIO_PAGES,
      label: "Bio Pages",
      sub: "Build landing pages",
      icon: Smartphone,
      color: "from-indigo-50 to-indigo-100/50",
      iconColor: "text-indigo-600",
      bgHover: "hover:border-indigo-300 hover:shadow-indigo-100/40"
    },
    {
      id: ScreenId.LINKS,
      label: "Links",
      sub: "Smart short URLs",
      icon: Link2,
      color: "from-indigo-50 to-indigo-100/50",
      iconColor: "text-indigo-600",
      bgHover: "hover:border-indigo-300 hover:shadow-indigo-100/40"
    },
    {
      id: ScreenId.QR_CODES,
      label: "QR Codes",
      sub: "Generate & track",
      icon: QrCode,
      color: "from-indigo-50 to-indigo-100/50",
      iconColor: "text-indigo-600",
      bgHover: "hover:border-indigo-300 hover:shadow-indigo-100/40"
    },
    {
      id: ScreenId.TEMPLATES,
      label: "Templates",
      sub: "Ready-made designs",
      icon: FileText,
      color: "from-indigo-50 to-indigo-100/50",
      iconColor: "text-indigo-600",
      bgHover: "hover:border-indigo-300 hover:shadow-indigo-100/40"
    }
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight flex flex-wrap items-center gap-x-2 gap-y-1">
            Welcome back, <span className="text-indigo-600">Alex</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">Here's your live digital marketing analytics dashboard.</p>
        </div>

        {/* Time filters matching the geometric theme */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 self-start md:self-auto overflow-x-auto max-w-full">
          {ranges.map((range) => {
            const isSelected = range === timeRange;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  isSelected
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Total Views (Impression)", value: metrics.pageViews, trend: "Live Impression Count", trendColor: "text-indigo-600" },
          { label: "Total Clicks (Ads/Social)", value: metrics.totalClicks, trend: "Dynamic Click Logs", trendColor: "text-emerald-600" },
          { label: "Registrations (Leads Form)", value: totalRegisters, trend: "New Leads Form Submissions", trendColor: "text-amber-600" },
          { label: "Active Bio Pages", value: metrics.activePages, trend: `${metrics.activePages} page(s) live`, trendColor: "text-slate-500" }
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden min-w-0"
          >
            <div className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              {metric.label}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {metric.value.toLocaleString()}
            </div>
            <div className={`text-xs font-medium mt-1 ${metric.trendColor}`}>
              {metric.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Main Visual Flow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Click Performance Graph */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col relative overflow-hidden min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="font-bold text-slate-800">Traffic Source Analytics</h3>
            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 self-start">
              <button className="px-3 py-1 text-xs font-medium rounded-md bg-white shadow-sm text-slate-900">7D</button>
              <button className="px-3 py-1 text-xs font-medium text-slate-500">30D</button>
              <button className="px-3 py-1 text-xs font-medium text-slate-500">90D</button>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between px-2 gap-4 h-48 relative border-b border-slate-100">
            {/* Base line graph at 0 level */}
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-500 h-[2px] rounded-t-md opacity-40 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 bg-slate-50 h-full rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-indigo-600 h-[2px] rounded-t-md shadow-[0_-4px_12px_rgba(79,70,229,0.3)]"></div>
            </div>

            {/* Premium, interactive, and contextual clean overlay for dynamic state */}
            {eventsList.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-white/70 backdrop-blur-[1px]">
                <span className="text-3xl mb-1.5 filter drop-shadow">📈</span>
                <p className="text-xs font-bold text-slate-700">Awaiting your first clicks</p>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-normal">
                  Your performance graph is set up and ready! Click metrics will plot automatically as soon as users visit your active links.
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-white/10 pointer-events-none">
                <div className="bg-slate-900/90 text-white rounded-lg p-3 text-xs shadow-md font-mono pointer-events-auto">
                  <p className="text-indigo-400 font-bold">✨ Live Real-Time Activity Tracking Enabled</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Currently tracking {eventsList.length} global visitor actions seamlessly!
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
          </div>
        </div>

        {/* Recent Activity / Top Bio Pages */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-bold text-slate-800 mb-4">Top Bio Pages</h3>
            <div className="space-y-4">
              {pages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <p>No bio pages created yet.</p>
                </div>
              ) : (
                pages.slice(0, 3).map((page) => {
                  const titleWords = page.title.split(" ");
                  const initials = titleWords.map(w => w[0]).join("").slice(0, 2).toUpperCase() || "BP";
                  return (
                    <div
                      key={page.id}
                      onClick={() => onNavigate(ScreenId.BIO_PAGES)}
                      className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 shrink-0 mr-3 flex items-center justify-center text-white font-black text-xs shadow-sm">{initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate text-slate-800">{page.title}</div>
                        <div className="text-xs text-slate-400 truncate">{page.slug}</div>
                      </div>
                      <div className="ml-auto text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{page.views}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate(ScreenId.BIO_PAGES)}
            className="mt-6 w-full py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          >
            View All Pages
          </button>
        </div>
      </div>

      {/* NEW: Visitor Session & Event Activity Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Real-Time Traffic & Action Tracker</h3>
            <p className="text-xs text-slate-500">Track which domain, client ports, devices, OS, and actions users perform globally.</p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Connection
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          {eventsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <p className="font-semibold text-slate-500 mb-1">🔍 Waiting for your first live session</p>
              <p className="text-slate-400 leading-normal max-w-md mx-auto">
                Scan the QR code of any BioPage using a mobile device, or click "Open visit" in the editor on your laptop. Real-time details will appear here instantly!
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold font-mono">
                  <th className="p-3.5">Action & Label</th>
                  <th className="p-3.5">Device Profile</th>
                  <th className="p-3.5">Network Ports</th>
                  <th className="p-3.5">Host Domain</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventsList.slice(0, 10).map((event: any) => {
                  let badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                  if (event.eventType === "click") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (event.eventType === "register") badgeColor = "bg-amber-50 text-amber-700 border-amber-100";

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {event.eventType.toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {event.eventLabel || "Page Visit"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            <span>{event.device === "Mobile" ? "📱" : event.device === "Tablet" ? "📟" : "💻"}</span>
                            <span>{event.device} ({event.os})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{event.browser} Browser</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {event.port || "N/A"}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-indigo-600 bg-indigo-50/40 border border-indigo-100/50 px-2 py-0.5 rounded text-[11px] font-mono">
                          {event.domain || "acn.link"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Access Area */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">
          Quick Access
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickAccess.map((qa) => {
            const Icon = qa.icon;
            return (
              <div
                key={qa.id}
                onClick={() => onNavigate(qa.id)}
                className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${qa.bgHover} hover:-translate-y-1 shadow-sm hover:shadow-md min-w-0`}
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-tr ${qa.color} flex items-center justify-center ${qa.iconColor} mb-4`}
                >
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <h4 className="font-sans font-semibold text-sm text-slate-900">{qa.label}</h4>
                <p className="text-[11px] text-slate-500 mt-1">{qa.sub}</p>
                <ArrowRight className="h-3.5 w-3.5 mt-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
