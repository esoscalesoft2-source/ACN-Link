import React, { useMemo, useState } from "react";
import { TemplateItem, BioPageTemplate } from "../types";
import { formatStorageDate } from "../storage/bioBuilderStorage";
import {
  Plus,
  Layers,
  Flame,
  BookOpen,
  User,
  Briefcase,
  Trash2,
  Search,
  Eye,
  X,
  ImageOff
} from "lucide-react";

interface TemplatesScreenProps {
  items: TemplateItem[];
  savedTemplates: BioPageTemplate[];
  onUseTemplate: (name: string, isCustom?: boolean, customTpl?: BioPageTemplate) => void;
  onDeleteCustomTemplate: (id: string) => void;
}

type PreviewTarget =
  | { kind: "system"; item: TemplateItem }
  | { kind: "custom"; item: BioPageTemplate };

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Marketing: Flame,
  "Packaging Insert": BookOpen,
  "Personal Bio": User,
  Business: Briefcase
};

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Marketing: "bg-orange-500",
  "Packaging Insert": "bg-rose-500",
  "Personal Bio": "bg-purple-500",
  Business: "bg-sky-500"
};

function getBlockCount(tpl: BioPageTemplate) {
  return tpl.data?.blocks?.length ?? 0;
}

function ThumbnailImage({
  src,
  alt,
  className,
  overlayClassName
}: {
  src?: string;
  alt: string;
  className?: string;
  overlayClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${overlayClassName ?? ""}`}>
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export default function TemplatesScreen({
  items,
  savedTemplates,
  onUseTemplate,
  onDeleteCustomTemplate
}: TemplatesScreenProps) {
  const [activeTab, setActiveTab] = useState<"SYSTEM" | "MY_TEMPLATES">("SYSTEM");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categories = ["All", "Packaging Insert", "Personal Bio", "Business", "Marketing"];

  const triggerToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const filteredCustomTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return savedTemplates;
    return savedTemplates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(query) ||
        (tpl.description || "").toLowerCase().includes(query)
    );
  }, [savedTemplates, searchQuery]);

  const handleUseFromPreview = () => {
    if (!previewTarget) return;
    if (previewTarget.kind === "custom") {
      onUseTemplate(previewTarget.item.name, true, previewTarget.item);
    } else {
      onUseTemplate(previewTarget.item.name);
    }
    setPreviewTarget(null);
  };

  const confirmDelete = (id: string, name: string) => {
    onDeleteCustomTemplate(id);
    setPendingDeleteId(null);
    triggerToast(`"${name}" was deleted from your templates.`);
  };

  const templateBeingDeleted = pendingDeleteId
    ? savedTemplates.find((tpl) => tpl.id === pendingDeleteId)
    : null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-gray-950 tracking-tight">
            Templates
          </h2>
          <p className="text-gray-500 text-sm mt-1">Start with a pre-built design or create from scratch</p>
        </div>
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search templates..."
            aria-label="Search templates"
            className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="border-b border-gray-100 flex gap-6 overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "SYSTEM"}
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
          type="button"
          role="tab"
          aria-selected={activeTab === "MY_TEMPLATES"}
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
                type="button"
                aria-pressed={isSelected}
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
        savedTemplates.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="h-14 w-14 bg-indigo-50 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4">
              <Layers className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No custom templates yet</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">
              Design your custom page in the editor and click "Save as Template" to persist your layout here.
            </p>
          </div>
        ) : filteredCustomTemplates.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No templates match "{searchQuery}"</h4>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#4F46E5] text-sm font-semibold mt-2 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
            {filteredCustomTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setPreviewTarget({ kind: "custom", item: tpl })}
                  aria-label={`Preview ${tpl.name}`}
                  className="h-40 sm:h-48 bg-gradient-to-tr from-indigo-900 via-[#1e1b4b] to-[#311042] border-b border-gray-50 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center w-full text-left cursor-pointer"
                >
                  {tpl.previewImage ? (
                    <ThumbnailImage
                      src={tpl.previewImage}
                      alt=""
                      overlayClassName="absolute inset-0 w-full h-full"
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </span>
                  </div>

                  <div className="relative h-12 w-12 bg-white/10 text-indigo-200 rounded-2xl flex items-center justify-center mb-3 border border-white/20 shadow-inner">
                    <Layers className="h-5 w-5" />
                  </div>

                  <h5 className="relative font-display font-bold text-white text-base truncate max-w-full leading-tight drop-shadow-sm px-2">
                    {tpl.name}
                  </h5>

                  <p className="relative text-indigo-300 text-[10px] mt-1.5 font-mono uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {getBlockCount(tpl)} elements
                  </p>

                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(tpl.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setPendingDeleteId(tpl.id);
                      }
                    }}
                    aria-label={`Delete ${tpl.name}`}
                    title="Delete Template"
                    className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-all duration-200 border border-red-500/20 hover:border-red-600 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </button>

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
                    type="button"
                    onClick={() => onUseTemplate(tpl.name, true, tpl)}
                    className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => onUseTemplate("Blank Scratch template")}
            className="border-2 border-dashed border-gray-200 hover:border-[#4F46E5] rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg transition-all duration-300 min-h-[320px] group w-full"
          >
            <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-gray-400 mb-4 group-hover:bg-indigo-50 group-hover:text-[#4F46E5] transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-950 text-base">Start from Scratch</h4>
            <p className="text-gray-400 text-xs mt-2 max-w-[180px]">
              Begin with a blank page and build your own design.
            </p>
          </button>

          {filteredItems.map((item) => {
            const CategoryIcon = CATEGORY_ICONS[item.category] ?? Layers;
            const badgeStyle = CATEGORY_BADGE_STYLES[item.category] ?? "bg-slate-500";
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setPreviewTarget({ kind: "system", item })}
                  aria-label={`Preview ${item.name}`}
                  className="h-40 sm:h-48 bg-slate-50 border-b border-gray-50 relative overflow-hidden flex items-center justify-center w-full group"
                >
                  <ThumbnailImage
                    src={item.imageUrl}
                    alt={item.name}
                    overlayClassName="w-full h-full"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </span>
                  </div>

                  <div className="absolute top-4 left-4">
                    <span className={`p-1.5 rounded-lg ${badgeStyle} text-white flex items-center justify-center`}>
                      <CategoryIcon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                </button>

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
                      <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Used {item.usedCount}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUseTemplate(item.name)}
                    className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 bg-white border border-dashed border-gray-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[320px]">
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? `No system templates match "${searchQuery}".`
                  : `No templates found in "${activeCategory}".`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                }}
                className="text-[#4F46E5] text-sm font-semibold mt-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {previewTarget && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-template-title"
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="relative h-52 sm:h-64 bg-gradient-to-tr from-indigo-900 via-[#1e1b4b] to-[#311042] shrink-0">
              <ThumbnailImage
                src={
                  previewTarget.kind === "system"
                    ? previewTarget.item.imageUrl
                    : previewTarget.item.previewImage
                }
                alt=""
                overlayClassName="absolute inset-0 w-full h-full"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                aria-label="Close preview"
                className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <h3
                  id="preview-template-title"
                  className="font-display font-black text-white text-xl drop-shadow-sm truncate"
                >
                  {previewTarget.item.name}
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <p className="text-sm text-gray-600 leading-relaxed">
                {previewTarget.kind === "system"
                  ? previewTarget.item.description
                  : previewTarget.item.description ||
                    `Custom design with ${getBlockCount(previewTarget.item)} widgets.`}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {previewTarget.kind === "system" ? (
                  <>
                    <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {previewTarget.item.category}
                    </span>
                    <span className="bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {previewTarget.item.widgets} widgets
                    </span>
                    <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Used {previewTarget.item.usedCount}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      My Template
                    </span>
                    <span className="bg-indigo-50 text-[#4F46E5] border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {getBlockCount(previewTarget.item)} widgets
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUseFromPreview}
                  className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {templateBeingDeleted && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
          >
            <h3 id="confirm-delete-title" className="font-display font-black text-lg text-slate-900 mb-2">
              Delete this template?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-semibold text-slate-700">"{templateBeingDeleted.name}"</span> will be
              permanently removed from your templates. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(templateBeingDeleted.id, templateBeingDeleted.name)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 text-xs font-black py-3 px-5 rounded-2xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
