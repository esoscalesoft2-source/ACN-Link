import React from "react";
import type { BlockRecord } from "../../lib/bioBlocks";

interface FormSuccessEditorFieldsProps {
  block: BlockRecord;
  onUpdate: (field: string, value: string) => void;
}

export default function FormSuccessEditorFields({ block, onUpdate }: FormSuccessEditorFieldsProps) {
  const b = block as Record<string, unknown>;

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <p className="text-[10px] font-bold text-[#6366f1] uppercase tracking-wider">
        After Submit — Thank You Page
      </p>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Emoji / Icon
        </label>
        <input
          type="text"
          value={(b.successEmoji as string) || "🙏"}
          onChange={(e) => onUpdate("successEmoji", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="🙏"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Thank You Title
        </label>
        <input
          type="text"
          value={(b.successTitle as string) || "Thanks for visiting my shop!"}
          onChange={(e) => onUpdate("successTitle", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Thanks for visiting my shop!"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Thank You Message
        </label>
        <textarea
          value={
            (b.successMessage as string) ||
            "Your details were received. We will connect with you soon."
          }
          onChange={(e) => onUpdate("successMessage", e.target.value)}
          rows={2}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 resize-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          OK Button Text
        </label>
        <input
          type="text"
          value={(b.successButtonLabel as string) || "OK"}
          onChange={(e) => onUpdate("successButtonLabel", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="OK"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Connect Button Text (optional)
        </label>
        <input
          type="text"
          value={(b.successConnectLabel as string) || ""}
          onChange={(e) => onUpdate("successConnectLabel", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Connect on WhatsApp"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Connect Link URL (optional)
        </label>
        <input
          type="text"
          value={(b.successConnectUrl as string) || ""}
          onChange={(e) => onUpdate("successConnectUrl", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
          placeholder="https://wa.me/919876543210"
        />
        <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
          After submit, visitors go to a thank you page (not a popup). OK closes that page.
        </p>
      </div>
    </div>
  );
}
