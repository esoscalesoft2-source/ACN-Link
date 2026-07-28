import React from "react";
import type { BlockRecord } from "../../lib/bioBlocks";
import { listEndTitlePageBlocks } from "../../lib/bioBlocks";

interface NextPageTargetSelectProps {
  block: BlockRecord;
  allBlocks: BlockRecord[];
  onUpdate: (field: string, value: string) => void;
  label?: string;
  /** When true, empty value means "open URL / no thank-you page" (for Buttons). */
  requireExplicit?: boolean;
}

/** Choose which End Title Page opens after submit / click. */
export default function NextPageTargetSelect({
  block,
  allBlocks,
  onUpdate,
  label = "After click / submit → next page",
  requireExplicit = false
}: NextPageTargetSelectProps) {
  const pages = listEndTitlePageBlocks(allBlocks.filter((entry) => entry.id !== block.id));
  const value = typeof block.nextPageBlockId === "string" ? block.nextPageBlockId : "";

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {pages.length === 0 ? (
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
          Add an <strong>End Title Page</strong> block from the library, then choose it here. Submit will open
          that thank-you page as the next screen.
        </p>
      ) : (
        <select
          value={value}
          onChange={(e) => onUpdate("nextPageBlockId", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
        >
          <option value="">
            {requireExplicit ? "Open link URL (no thank-you page)" : "First End Title Page (default)"}
          </option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {(typeof page.successTitle === "string" && page.successTitle.trim()) ||
                page.label ||
                "End Title Page"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
