import React, { useState } from "react";
import { HelpArticle } from "../types";
import { BookOpen, Search, ArrowRight, MessageSquare, Shield, HelpCircle, Key, Globe } from "lucide-react";

interface HelpCenterScreenProps {
  articles: HelpArticle[];
}

export default function HelpCenterScreen({ articles }: HelpCenterScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = articles.filter((art) => {
    return (
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const categories = [
    { name: "Getting Started", icon: BookOpen, count: 5, color: "text-blue-600 bg-blue-50" },
    { name: "Custom Domains", icon: Globe, count: 3, color: "text-emerald-600 bg-emerald-50" },
    { name: "APIs & Webhooks", icon: Key, count: 4, color: "text-purple-600 bg-purple-50" },
    { name: "Security & Privacy", icon: Shield, count: 2, color: "text-rose-500 bg-rose-50" }
  ];

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative">
      {/* Hero Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 text-center text-white space-y-6 relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF6B4A]/10 to-[#4F46E5]/20" />
        <div className="relative space-y-3 z-10 max-w-lg mx-auto">
          <h2 className="font-display font-bold text-3xl tracking-tight">How can we help?</h2>
          <p className="text-slate-300 text-sm">Search popular support articles or browse our core topics below.</p>

          <div className="relative pt-3">
            <span className="absolute inset-y-0 left-0 pl-3.5 pt-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, setup answers..."
              className="w-full bg-white text-slate-900 border border-transparent rounded-2xl py-3 pl-11 pr-4 text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Grid categories */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-900 tracking-tight">Browse Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat, index) => {
            const CatIcon = cat.icon;
            return (
              <div
                key={index}
                onClick={() => setSearchQuery(cat.name)}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-150 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className={`h-10 w-10 rounded-xl ${cat.color} flex items-center justify-center shrink-0 mb-4`}>
                    <CatIcon className="h-5.5 w-5.5" />
                  </div>
                  <h4 className="font-display font-semibold text-sm text-gray-950 leading-tight">
                    {cat.name}
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400 font-semibold block mt-4">
                  {cat.count} articles
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtered Articles list */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-gray-900 tracking-tight">
          {searchQuery ? `Search Results for "${searchQuery}"` : "Frequently Asked Questions"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-50 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="bg-indigo-50 text-[#4F46E5] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {art.category}
                </span>
                <h4 className="font-display font-semibold text-gray-900 text-base mt-2.5 leading-snug">
                  {art.title}
                </h4>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                  {art.excerpt}
                </p>
              </div>

              <button
                onClick={() => alert(`Full article content: \n\n${art.title}\n\nThis guide explains all necessary DNS and integration setups. Feel free to contact support if you need personalized onboarding.`)}
                className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1 mt-4 transition-colors"
              >
                <span>Read article</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
              No articles found matching "{searchQuery}". Try selecting a topic card above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
