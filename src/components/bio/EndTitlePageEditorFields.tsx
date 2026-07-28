import React from "react";
import type { BlockRecord } from "../../lib/bioBlocks";

interface EndTitlePageEditorFieldsProps {
  block: BlockRecord;
  onUpdate: (field: string, value: string) => void;
}

const SOCIAL_FIELDS = [
  ["instagramUrl", "Instagram"],
  ["facebookUrl", "Facebook"],
  ["youtubeUrl", "YouTube"],
  ["tiktokUrl", "TikTok"],
  ["linkedinUrl", "LinkedIn"],
  ["xUrl", "X / Twitter"],
  ["telegramUrl", "Telegram"]
] as const;

/** Design the thank-you / end title next page (not a normal on-page UI block). */
export default function EndTitlePageEditorFields({ block, onUpdate }: EndTitlePageEditorFieldsProps) {
  const b = block as Record<string, unknown>;

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] font-bold text-[#6366f1] uppercase tracking-wider">
        End Title Page design
      </p>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        This page is hidden on the main bio. After Form / Smart Form submit (or a button set to open it),
        visitors see this thank-you screen as the next page.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Emoji
          </label>
          <input
            type="text"
            value={(b.successEmoji as string) || ""}
            onChange={(e) => onUpdate("successEmoji", e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
            placeholder="🙏"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Done button
          </label>
          <input
            type="text"
            value={(b.successButtonLabel as string) || ""}
            onChange={(e) => onUpdate("successButtonLabel", e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
            placeholder="Done"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Thank you title
        </label>
        <input
          type="text"
          value={(b.successTitle as string) || ""}
          onChange={(e) => onUpdate("successTitle", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Thanks for visiting my shop!"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Thank you message
        </label>
        <textarea
          value={(b.successMessage as string) || ""}
          onChange={(e) => onUpdate("successMessage", e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 resize-none"
          placeholder="Your details were received. We will connect with you soon."
        />
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
          Promotional
        </span>
        <input
          type="text"
          value={(b.promoTitle as string) || ""}
          onChange={(e) => onUpdate("promoTitle", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Promo title"
        />
        <textarea
          value={(b.promoMessage as string) || ""}
          onChange={(e) => onUpdate("promoMessage", e.target.value)}
          rows={2}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 resize-none"
          placeholder="Promo details / offer"
        />
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
          Business details
        </span>
        <input
          type="text"
          value={(b.businessName as string) || ""}
          onChange={(e) => onUpdate("businessName", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Business name"
        />
        <textarea
          value={(b.businessDetails as string) || ""}
          onChange={(e) => onUpdate("businessDetails", e.target.value)}
          rows={2}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 resize-none"
          placeholder="Address, hours, visit info"
        />
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
          WhatsApp community
        </span>
        <input
          type="text"
          value={(b.whatsappCommunityLabel as string) || ""}
          onChange={(e) => onUpdate("whatsappCommunityLabel", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Join WhatsApp Community"
        />
        <input
          type="url"
          value={(b.whatsappCommunityUrl as string) || ""}
          onChange={(e) => onUpdate("whatsappCommunityUrl", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="https://chat.whatsapp.com/..."
        />
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
          Social follow links
        </span>
        {SOCIAL_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">{label}</label>
            <input
              type="url"
              value={(b[key] as string) || ""}
              onChange={(e) => onUpdate(key, e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
              placeholder="https://..."
            />
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
          Optional connect button
        </span>
        <input
          type="text"
          value={(b.successConnectLabel as string) || ""}
          onChange={(e) => onUpdate("successConnectLabel", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
          placeholder="Connect on WhatsApp"
        />
        <input
          type="url"
          value={(b.successConnectUrl as string) || ""}
          onChange={(e) => onUpdate("successConnectUrl", e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
          placeholder="https://wa.me/..."
        />
      </div>
    </div>
  );
}
