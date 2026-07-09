import React, { useState } from "react";
import { IntegrationItem, IntegrationVote } from "../types";
import { Sparkles, Check, MessageSquare, Mail, CreditCard, ChevronRight, HelpCircle, ArrowUp } from "lucide-react";

interface IntegrationsScreenProps {
  items: IntegrationItem[];
  votes: IntegrationVote[];
  onVote: (id: string) => void;
}

export default function IntegrationsScreen({ items, votes, onVote }: IntegrationsScreenProps) {
  const messaging = items.filter((i) => i.type === "Messaging");
  const email = items.filter((i) => i.type === "Email Marketing");
  const payments = items.filter((i) => i.type === "Payments");

  const renderIntegrationCard = (item: IntegrationItem) => {
    const isComingSoon = item.status === "Coming Soon";
    
    return (
      <div
        key={item.id}
        className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all ${
          isComingSoon
            ? "border-dashed border-slate-200 opacity-70"
            : "border-slate-100 hover:border-indigo-100 hover:shadow-lg"
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {/* Custom rounded icons */}
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                  item.type === "Messaging"
                    ? "bg-emerald-50 text-emerald-600"
                    : item.type === "Email Marketing"
                    ? "bg-rose-50 text-rose-500"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {item.type === "Messaging" ? (
                  <MessageSquare className="h-5.5 w-5.5" />
                ) : item.type === "Email Marketing" ? (
                  <Mail className="h-5.5 w-5.5" />
                ) : (
                  <CreditCard className="h-5.5 w-5.5" />
                )}
              </div>

              <div>
                <h4 className="font-display font-bold text-[#0F172A] text-sm md:text-base leading-tight">
                  {item.name}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  {item.type}
                </span>
              </div>
            </div>

            {/* Locked badge */}
            <span className={`text-[9px] font-bold rounded px-2 py-0.5 uppercase tracking-wide ${
              item.status === "Connected"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-500"
            }`}>
              {item.status === "Connected" ? "UNLOCKED" : item.status}
            </span>
          </div>

          <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
            {item.description}
          </p>

          {item.upgradeMessage && (
            <p className="text-[11px] text-slate-400 font-medium">
              {item.upgradeMessage}
            </p>
          )}
        </div>

        {!isComingSoon && (
          item.status === "Connected" ? (
            item.name === "WOO Chat" ? (
              <a
                href="https://woochat.esowolf.in/login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#00b074] hover:bg-[#009663] text-white font-bold text-xs md:text-sm py-2.5 rounded-xl transition-all text-center block shadow-sm shadow-emerald-100/50"
              >
                Sign In to WOO Chat
              </a>
            ) : (
              <button
                className="w-full bg-emerald-50 text-emerald-700 font-bold text-xs md:text-sm py-2.5 rounded-xl transition-all border border-emerald-200"
              >
                Connected
              </button>
            )
          ) : (
            <button
              onClick={() => alert(`This integration is locked on the Free Plan. Upgrade your workspace to connect.`)}
              className="w-full bg-[#E0E7FF]/60 hover:bg-[#EEF2FF] text-[#4F46E5] font-bold text-xs md:text-sm py-2.5 rounded-xl transition-all"
            >
              Upgrade to connect
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-10 max-w-7xl mx-auto w-full relative">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-3xl text-gray-950 tracking-tight">
          Integrations
        </h2>
        <p className="text-slate-500 text-sm max-w-3xl mt-2 leading-relaxed">
          Connect ACN Link to the tools you already use. Bring your own account — your messages
          and subscribers stay on your provider, billed to you, with no markup from us.
        </p>
      </div>

      {/* Messaging Section */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs tracking-widest text-slate-400 uppercase">
          MESSAGING
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messaging.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Email Marketing Section */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs tracking-widest text-slate-400 uppercase">
          EMAIL MARKETING
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {email.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Payments Section */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs tracking-widest text-slate-400 uppercase">
          PAYMENTS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {payments.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Vote widgets container section */}
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <span className="text-[9px] font-extrabold text-indigo-600 tracking-widest uppercase bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5">
            VOTE FOR THE NEXT INTEGRATION
          </span>
          <h3 className="font-display font-bold text-gray-950 text-base md:text-lg mt-3">
            Tell us what to build next
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Tell us which provider to build next. One vote per integration — the most-wanted ones move up the queue.
          </p>
        </div>

        {/* Voting list */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {votes.map((vt) => (
            <div
              key={vt.id}
              className={`bg-white border p-5 rounded-2xl flex flex-col justify-between items-center text-center transition-all shadow-sm ${
                vt.voted
                  ? "border-[#4F46E5] ring-2 ring-indigo-50/50"
                  : "border-slate-150 hover:border-slate-300"
              }`}
            >
              <div className="h-10 w-10 bg-slate-50 text-slate-400 font-bold rounded-full flex items-center justify-center text-sm font-mono shadow-inner">
                {vt.name[0]}
              </div>
              <div className="my-3">
                <h4 className="font-display font-bold text-gray-900 text-sm">{vt.name}</h4>
                <span className="text-xs text-slate-400 mt-1 block">
                  {vt.votes} vote{vt.votes !== 1 ? "s" : ""}
                </span>
              </div>

              {vt.voted ? (
                <button
                  disabled
                  className="w-full bg-[#EEF2FF] text-[#4F46E5] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Voted</span>
                </button>
              ) : (
                <button
                  onClick={() => onVote(vt.id)}
                  className="w-full border border-slate-200 hover:border-[#4F46E5] hover:text-[#4F46E5] py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Vote
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
