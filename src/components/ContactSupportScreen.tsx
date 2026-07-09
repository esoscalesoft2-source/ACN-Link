import React, { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle, ShieldCheck, HelpCircle } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function ContactSupportScreen() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Technical Issue");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "t1",
      subject: "Custom domain connection fail",
      category: "Technical Issue",
      message: "My A Record propagates correctly but the dashboard still shows pending authorization.",
      status: "In Progress",
      createdAt: "5 Jul 2026"
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    const newT: Ticket = {
      id: "t" + (tickets.length + 1),
      subject,
      category,
      message,
      status: "Submitted",
      createdAt: "7 Jul 2026"
    };

    setTickets([newT, ...tickets]);
    setSubject("");
    setMessage("");
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
    }, 4000);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-3xl text-gray-950 tracking-tight">
          Support Center
        </h2>
        <p className="text-gray-500 text-sm mt-1">Submit tickets directly to our developer team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column Support Form Card - Premium Dark Theme exactly matching Screenshot descriptions! */}
        <div className="lg:col-span-2 bg-[#0F172A] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 h-44 w-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <h3 className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="h-5.5 w-5.5 text-[#FF6B4A]" />
              Contact Support
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Need personalized assistance? Complete the ticket details below.
            </p>
          </div>

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Ticket submitted successfully! We will follow up via email within 2 hours.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  TICKET CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Billing Question">Billing Question</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Strategic Integration">Strategic Integration</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  SUBJECT
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Domain pending propagation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                DETAILED EXPLANATION
              </label>
              <textarea
                required
                rows={5}
                placeholder="Briefly state the steps to reproduce or custom values..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* Custom file attachments drag block */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                SCREENSHOTS / DOCUMENTS
              </label>
              <div className="border border-dashed border-slate-800 bg-slate-950/40 rounded-2xl p-4 text-center cursor-pointer hover:border-slate-750 transition-colors">
                <span className="text-slate-500 text-[11px] block">
                  Drag files here or click to attach logs
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Ticket</span>
            </button>
          </form>
        </div>

        {/* Right Column ticket status logs */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-gray-950 text-base">Your Active Tickets</h3>

            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="border border-gray-100 rounded-2xl p-4 space-y-2 hover:border-indigo-100 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">
                      {t.category}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        t.status === "In Progress" ? "text-amber-600 bg-amber-50" : "text-indigo-600 bg-indigo-50"
                      } px-2 py-0.5 rounded-full`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-sans font-bold text-gray-900 text-xs leading-snug">
                    {t.subject}
                  </h4>
                  <p className="text-gray-400 text-[11px] line-clamp-1">{t.message}</p>
                  <span className="text-[10px] text-gray-400 font-mono block pt-1.5 border-t border-gray-50">
                    Created {t.createdAt}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FF6B4A]/5 border border-[#FF6B4A]/10 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-display font-bold text-[#FF6B4A] text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5" />
              SLA Priority Included
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your workspace is tracked under Standard Priority Developer Support with answers guaranteed within 2 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
