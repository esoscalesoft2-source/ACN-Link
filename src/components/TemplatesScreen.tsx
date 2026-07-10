import React, { useState } from "react";
import { TemplateItem, BioPageTemplate } from "../types";
import { formatStorageDate } from "../storage/bioBuilderStorage";
import { Plus, Layers, Flame, BookOpen, User, Trash2 } from "lucide-react";

interface TemplatesScreenProps {
  items: TemplateItem[];
  savedTemplates: BioPageTemplate[];
  onUseTemplate: (name: string, isCustom?: boolean, customTpl?: BioPageTemplate) => void;
  onDeleteCustomTemplate: (id: string) => void;
}

export default function TemplatesScreen({
  items,
  savedTemplates,
  onUseTemplate,
  onDeleteCustomTemplate
}: TemplatesScreenProps) {
  const [activeTab, setActiveTab] = useState("SYSTEM");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Packaging Insert", "Personal Bio", "Business", "Marketing"];

  const filteredItems = items.filter((item) => {
    if (activeCategory === "All") return true;
    return item.category === activeCategory;
  });

  const getBlockCount = (tpl: BioPageTemplate) => tpl.data?.blocks?.length ?? 0;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0 relative">
      <div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-gray-950 tracking-tight">
          Templates
        </h2>
        <p className="text-gray-500 text-sm mt-1">Start with a pre-built design or create from scratch</p>
      </div>

      <div className="border-b border-gray-100 flex gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("SYSTEM")}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all border-b-2 px-1 relative shrink-0 ${
            activeTab === "SYSTEM"
              ? "border-[#4F46E5] text-[#4F46E5]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          System Templates
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("MY_TEMPLATES")}
          className={`pb-4 text-sm font-semibold tracking-wide transition-all border-b-2 px-1 relative shrink-0 ${
            activeTab === "MY_TEMPLATES"
              ? "border-[#4F46E5] text-[#4F46E5]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          My Templates
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">
            {savedTemplates.length}
          </span>
        </button>
      </div>

      {activeTab === "SYSTEM" && (
        <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border ${
                  isSelected
                    ? "bg-[#4F46E5] border-[#4F46E5] text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "MY_TEMPLATES" ? (
        savedTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
            {savedTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group min-w-0"
              >
                <div className="h-40 sm:h-48 bg-gradient-to-tr from-indigo-900 via-[#1e1b4b] to-[#311042] border-b border-gray-50 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                  {tpl.previewImage ? (
                    <img
                      src={tpl.previewImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative h-12 w-12 bg-white/10 text-indigo-200 rounded-2xl flex items-center justify-center mb-3 border border-white/20 shadow-inner">
                    <Layers className="h-5 w-5" />
                  </div>

                  <h5 className="relative font-display font-bold text-white text-base truncate max-w-full leading-tight drop-shadow-sm px-2">
                    {tpl.name}
                  </h5>

                  <p className="relative text-indigo-300 text-[10px] mt-1.5 font-mono uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {getBlockCount(tpl)} elements
                  </p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomTemplate(tpl.id);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-all duration-200 border border-red-500/20 hover:border-red-600 shadow-sm"
                    title="Delete Template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-display font-bold text-gray-950 text-base leading-tight truncate">
                      {tpl.name}
                    </h4>
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                      {tpl.description ||
                        `Custom design with ${getBlockCount(tpl)} widgets. Updated ${formatStorageDate(tpl.updatedAt)}.`}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        My Template
                      </span>
                      <span className="bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {getBlockCount(tpl)} widgets
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 pt-1">
                      Saved {formatStorageDate(tpl.createdAt)}
                      {tpl.updatedAt !== tpl.createdAt && ` · Updated ${formatStorageDate(tpl.updatedAt)}`}
                    </p>
                  </div>

                  <button
                    onClick={() => onUseTemplate(tpl.name, true, tpl)}
                    className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="h-14 w-14 bg-indigo-50 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4">
              <Layers className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No custom templates yet</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">
              Design your custom page in the editor and click "Save as Template" to persist your layout here.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
          <div
            onClick={() => onUseTemplate("Blank Scratch template")}
            className="border-2 border-dashed border-gray-200 hover:border-[#4F46E5] rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg transition-all duration-300 min-h-[320px] group"
          >
            <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-gray-400 mb-4 group-hover:bg-indigo-50 group-hover:text-[#4F46E5] transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-950 text-base">Start from Scratch</h4>
            <p className="text-gray-400 text-xs mt-2 max-w-[180px]">
              Begin with a blank page and build your own design.
            </p>
          </div>

          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col min-w-0"
            >
              <div className="h-40 sm:h-48 bg-slate-50 border-b border-gray-50 relative overflow-hidden flex items-center justify-center">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
                />

                <div className="absolute top-4 left-4">
                  {item.category === "Marketing" && (
                    <span className="p-1.5 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                      <Flame className="h-4.5 w-4.5" />
                    </span>
                  )}
                  {item.category === "Packaging Insert" && (
                    <span className="p-1.5 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                      <BookOpen className="h-4.5 w-4.5" />
                    </span>
                  )}
                  {item.category === "Personal Bio" && (
                    <span className="p-1.5 rounded-lg bg-purple-500 text-white flex items-center justify-center">
                      <User className="h-4.5 w-4.5" />
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-display font-bold text-gray-950 text-base leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {item.widgets} widgets
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onUseTemplate(item.name)}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
