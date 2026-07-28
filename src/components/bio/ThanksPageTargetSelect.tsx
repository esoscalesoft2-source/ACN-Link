import React from "react";
import type { BioPage } from "../../types";
import type { BlockRecord } from "../../lib/bioBlocks";

interface ThanksPageTargetSelectProps {
  block: BlockRecord;
  pages: BioPage[];
  onUpdate: (field: string, value: string) => void;
  label?: string;
  /** When true, empty = keep current URL / no thanks redirect (Buttons). */
  requireExplicit?: boolean;
}

/** Pick which published Thanks page opens after Form submit or button click. */
export default function ThanksPageTargetSelect({
  block,
  pages,
  onUpdate,
  label = "After submit → Thanks page",
  requireExplicit = false
}: ThanksPageTargetSelectProps) {
  const thanksPages = pages.filter((page) => (page.pageKind || "bio") === "thanks");
  const value = typeof block.thanksPageId === "string" ? block.thanksPageId : "";

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {thanksPages.length === 0 ? (
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
          Create a <strong>Thanks Page</strong> from Bio Pages → New Page, customize it with blocks, publish it,
          then choose it here. After submit / Join Now, visitors see that page.
        </p>
      ) : (
        <select
          value={value}
          onChange={(e) => onUpdate("thanksPageId", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
        >
          <option value="">
            {requireExplicit
              ? "Open link URL (no Thanks page)"
              : "First Thanks Page (default)"}
          </option>
          {thanksPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title}
              {page.status !== "Live" ? ` (${page.status})` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function resolveThanksPageId(
  sourceBlock: BlockRecord,
  pages: BioPage[]
): string | null {
  const explicit =
    typeof sourceBlock.thanksPageId === "string" ? sourceBlock.thanksPageId.trim() : "";
  // Prefer the linked page id even when the visitor has no pages list (public live).
  if (explicit) {
    const matched = pages.find((page) => page.id === explicit);
    if (!matched || (matched.pageKind || "bio") === "thanks") return explicit;
  }
  const thanksPages = pages.filter((page) => (page.pageKind || "bio") === "thanks");
  if (!thanksPages.length) return explicit || null;
  const live = thanksPages.find((page) => page.status === "Live");
  return (live || thanksPages[0])?.id || null;
}
