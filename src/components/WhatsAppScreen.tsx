import React, { useState } from "react";
import { WhatsAppCampaign, WhatsAppTemplate } from "../types";
import {
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  Settings,
  Send,
  FileCheck,
  ShieldCheck,
  X,
  UserCheck
} from "lucide-react";

interface WhatsAppScreenProps {
  campaigns: WhatsAppCampaign[];
  templates: WhatsAppTemplate[];
  onAddTemplate: (name: string) => void;
  onAddCampaign: (name: string, recipients: string, openRate: string) => void;
}

export default function WhatsAppScreen({
  campaigns,
  templates,
  onAddTemplate,
  onAddCampaign
}: WhatsAppScreenProps) {
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  const [isAddingBroadcast, setIsAddingBroadcast] = useState(false);
  const [broadcastName, setBroadcastName] = useState("");
  const [recipientsCount, setRecipientsCount] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return;
    onAddTemplate(templateName);
    setTemplateName("");
    setIsAddingTemplate(false);
    triggerToast("✨ Template submitted successfully!");
  };

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastName || !recipientsCount) return;
    onAddCampaign(broadcastName, recipientsCount, "96%");
    setBroadcastName("");
    setRecipientsCount("");
    setIsAddingBroadcast(false);
    triggerToast("🚀 Broadcast Campaign launched live!");
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative">
      {/* Header and Breadcrumbs */}
      <div>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
          Marketing &gt; WhatsApp
        </div>
        <h2 className="font-display font-bold text-3xl text-gray-950 tracking-tight">
          WhatsApp Campaigns
        </h2>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TOTAL BROADCASTS</p>
          <h3 className="font-display font-bold text-3xl text-gray-950 mt-1.5">1,284</h3>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            +12% this month
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AVG. OPEN RATE</p>
          <h3 className="font-display font-bold text-3xl text-gray-950 mt-1.5">92.4%</h3>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Above industry avg
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ACTIVE TEMPLATES</p>
          <h3 className="font-display font-bold text-3xl text-gray-950 mt-1.5">{templates.length + 6}</h3>
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-1.5">
            Ready to send
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Campaigns & Templates) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Broadcasts */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-gray-950">Recent Broadcasts</h3>
              <button
                onClick={() => setIsAddingBroadcast(true)}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[10px] font-bold tracking-wider uppercase">
                    <th className="py-3 px-2">Campaign Name</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Recipients</th>
                    <th className="py-3 px-2">Open Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((camp) => (
                    <tr key={camp.id} className="text-sm">
                      <td className="py-4 px-2 font-semibold text-gray-950">{camp.name}</td>
                      <td className="py-4 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            camp.status === "Sent"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-gray-500 font-mono">{camp.recipients}</td>
                      <td className="py-4 px-2 text-gray-900 font-semibold">{camp.openRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Broadcast Templates */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-gray-950">Broadcast Templates</h3>
              <button
                onClick={() => setIsAddingTemplate(true)}
                className="flex items-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Template</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-gray-950">{tpl.name}</h4>
                      <span className="text-[10px] text-emerald-600 font-bold tracking-wide uppercase mt-0.5 block">
                        {tpl.status}
                      </span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-slate-50">
                    <Send className="h-4 w-4 text-[#4F46E5]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar Cards) */}
        <div className="space-y-6">
          {/* Active Connections */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-gray-950 text-base">Active Connections</h3>

            <div className="border border-emerald-100 bg-emerald-50/10 rounded-2xl p-4.5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5.5 w-5.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-gray-950">Main Business Account</h4>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected & Active
                </span>
              </div>
            </div>

            <button className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-2.5 rounded-xl transition-all">
              Manage Connection
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-gray-950 text-base">Quick Actions</h3>

            <div className="space-y-2">
              <a
                href="https://woochat.esowolf.in/login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">WOO Chat Settings</span>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400" />
              </a>

              <button
                onClick={() => setIsAddingBroadcast(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">New Broadcast</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>

              <button
                onClick={() => triggerToast("🛡️ Compliance Logs: All active campaigns are fully verified with WhatsApp Business Policy.")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Compliance Logs</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-850 text-xs font-semibold py-3 px-5 rounded-2xl text-center shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 flex items-center justify-center gap-2">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Modal - New Template */}
      {isAddingTemplate && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-gray-900">Create Template</h3>
              <button onClick={() => setIsAddingTemplate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  TEMPLATE NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchase Confirmation"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#4F46E5] text-white py-2.5 rounded-xl font-semibold text-sm"
              >
                Submit for Approval
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - New Broadcast */}
      {isAddingBroadcast && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-gray-900">New Broadcast Campaign</h3>
              <button onClick={() => setIsAddingBroadcast(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBroadcast} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  CAMPAIGN NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Discount Blast"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  RECIPIENT COUNT / RATE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 or 15/day"
                  value={recipientsCount}
                  onChange={(e) => setRecipientsCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#4F46E5] text-white py-2.5 rounded-xl font-semibold text-sm"
              >
                Launch Broadcast
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
