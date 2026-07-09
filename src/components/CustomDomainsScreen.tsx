import React, { useState } from "react";
import { CustomDomain } from "../types";
import { Globe, Plus, CheckCircle, Clock, Trash2, X, RefreshCw } from "lucide-react";

interface CustomDomainsScreenProps {
  domains: CustomDomain[];
  onConnectDomain: (domainName: string) => void;
  onDeleteDomain: (id: string) => void;
}

export default function CustomDomainsScreen({
  domains,
  onConnectDomain,
  onDeleteDomain
}: CustomDomainsScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [domainName, setDomainName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName) return;
    onConnectDomain(domainName);
    setDomainName("");
    setIsAdding(false);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-gray-950 tracking-tight">
            Custom Domains
          </h2>
          <p className="text-gray-500 text-sm mt-1">Configure custom domains for fully white-labeled link routing.</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Connect Domain</span>
        </button>
      </div>

      {/* Creation Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-gray-950">Connect Custom Domain</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  DOMAIN NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. links.mybrand.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>

              {/* DNS Instruction block */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4.5 text-xs text-amber-800 space-y-1.5 leading-relaxed">
                <span className="font-bold">Required DNS Setup:</span>
                <p>To authorize branding, create a DNS "A" record pointing your domain or subdomain to IP <strong>74.201.218.45</strong>.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-semibold"
                >
                  Add Custom Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Domain Table */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {domains.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 bg-indigo-50 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No Custom Domains Connected</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">Connect custom branded domains to white label your links.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 bg-slate-50/50">
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">DOMAIN NAME</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">VERIFICATION TYPE</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">TARGET IP</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATUS</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {domains.map((dom) => (
                  <tr key={dom.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6 font-display font-bold text-gray-950 text-sm">
                      <div className="flex items-center gap-2.5">
                        <Globe className="h-4.5 w-4.5 text-gray-400" />
                        {dom.domainName}
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="text-sm font-semibold text-gray-600">{dom.type}</span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="text-sm font-semibold font-mono text-gray-500">{dom.targetIp}</span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          dom.status === "Verified"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {dom.status === "Verified" ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        <span>{dom.status}</span>
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => alert(`Re-checking DNS records for ${dom.domainName}... Status verified!`)}
                          className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Refresh status"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDomain(dom.id)}
                          className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all"
                          title="Remove domain"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
