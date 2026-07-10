import React, { useState } from "react";
import { TrackingPixel } from "../types";
import { Shield, Plus, Facebook, Trash2, X } from "lucide-react";
import PageShell, { PageHeader, SectionCard } from "./layout/PageShell";

interface PixelsScreenProps {
  pixels: TrackingPixel[];
  onAddPixel: (name: string, type: string, pixelId: string) => void;
  onDeletePixel: (id: string) => void;
}

export default function PixelsScreen({ pixels, onAddPixel, onDeletePixel }: PixelsScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Facebook Pixel");
  const [pixelId, setPixelId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pixelId) return;
    onAddPixel(name, type, pixelId);
    setName("");
    setPixelId("");
    setIsAdding(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Pixels"
        subtitle="Add tracking pixels to measure campaign conversions."
        actions={
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-4 sm:px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95 w-full sm:w-auto"
          >
            <Plus className="h-4.5 w-4.5 shrink-0" />
            <span>Add Tracking Pixel</span>
          </button>
        }
      />

      {isAdding && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-gray-950">Add Tracking Pixel</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  PIXEL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FB Checkout Pixel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  PIXEL PROVIDER TYPE
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="Facebook Pixel">Facebook Pixel</option>
                  <option value="Google Analytics">Google Analytics Tag</option>
                  <option value="TikTok Pixel">TikTok Pixel</option>
                  <option value="Pinterest Tag">Pinterest Tag</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  PIXEL TARGET ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23849583190"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-semibold"
                >
                  Add Pixel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SectionCard>
        {pixels.length === 0 ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 bg-indigo-50 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No Tracking Pixels yet</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">
              Connect Facebook, Google or custom pixels to track conversion events.
            </p>
          </div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-gray-50">
              {pixels.map((pixel) => (
                <div key={pixel.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 bg-indigo-50 text-[#4F46E5] rounded-lg flex items-center justify-center shrink-0">
                        {pixel.type.includes("Facebook") ? (
                          <Facebook className="h-4.5 w-4.5" />
                        ) : (
                          <Shield className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-gray-950 text-sm">{pixel.name}</p>
                        <p className="text-xs text-gray-600 font-semibold mt-0.5">{pixel.type}</p>
                        <p className="text-xs font-mono text-gray-500 break-all mt-1">{pixel.pixelId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeletePixel(pixel.id)}
                      className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                      title="Delete pixel"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                  <span className="inline-block bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {pixel.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 bg-slate-50/50">
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">NAME</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PIXEL TYPE</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PIXEL ID</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATUS</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pixels.map((pixel) => (
                    <tr key={pixel.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6 font-display font-bold text-gray-950 text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 bg-indigo-50 text-[#4F46E5] rounded-lg flex items-center justify-center shrink-0">
                            {pixel.type.includes("Facebook") ? (
                              <Facebook className="h-4.5 w-4.5" />
                            ) : (
                              <Shield className="h-4.5 w-4.5" />
                            )}
                          </div>
                          {pixel.name}
                        </div>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="text-sm font-semibold text-gray-600">{pixel.type}</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="text-sm font-semibold font-mono text-gray-500 break-all">{pixel.pixelId}</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {pixel.status}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <button
                          onClick={() => onDeletePixel(pixel.id)}
                          className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete pixel"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </PageShell>
  );
}
