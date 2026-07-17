import React from "react";
import { ArrowRight, Copy, MessageSquare, User } from "lucide-react";
import {
  BlockRecord,
  DEFAULT_SHOP_PRODUCTS,
  destinationEmailFromBlock,
  downloadVCard,
  getCurrencySymbol,
  getGalleryImages,
  getVideoThumbnail,
  normalizeExternalUrl
} from "../../lib/bioBlocks";
import { getLinkArrowColor, getLinkButtonStyle, isDefaultBrightLink } from "../../lib/bioLinkColors";
import type { BlockRendererContext, BlockRendererHandlers, BlockRenderMode } from "./blockTypes";
import CountdownBlockView from "./CountdownBlockView";
import SocialLinksRow from "./SocialLinksRow";

interface BlockViewProps {
  block: BlockRecord;
  mode: BlockRenderMode;
  context: BlockRendererContext;
  handlers: BlockRendererHandlers;
}

function track(handlers: BlockRendererHandlers, action: string, label: string, meta?: Record<string, unknown>) {
  handlers.onTrack?.(action, label, meta);
}

function openLink(handlers: BlockRendererHandlers, mode: BlockRenderMode, url: string, label?: string) {
  if (mode === "preview") {
    handlers.onToast?.(`🔗 Simulated redirection to: ${url || "https://acn.link"}`);
    return;
  }
  handlers.onExternalLink?.(url, label);
}

function openWhatsApp(handlers: BlockRendererHandlers, mode: BlockRenderMode, value: string, label?: string) {
  if (mode === "preview") {
    handlers.onWhatsApp?.(value);
    return;
  }
  if (!value.trim()) {
    handlers.onToast?.("WhatsApp number is not configured yet.");
    return;
  }
  handlers.onWhatsApp?.(value);
  track(handlers, "click", label || "WhatsApp");
}

export function HeaderBlockView({ block, context }: BlockViewProps) {
  const compact = context.compact;
  return (
    <h2
      className={`acn-phone-preview__block-heading font-display text-center leading-snug ${
        compact ? "text-sm pt-0" : "pt-2"
      }`}
    >
      {block.label}
    </h2>
  );
}

export function TextBlockView({ block, context }: BlockViewProps) {
  const compact = context.compact;
  return (
    <p
      className={`acn-phone-preview__block-text text-center leading-relaxed ${
        compact ? "p-2.5 rounded-xl text-xs" : "p-3.5 rounded-2xl"
      }`}
    >
      {block.label}
    </p>
  );
}

export function LinkButtonBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  return (
    <button
      type="button"
      onClick={() => {
        track(handlers, "click", `Button: ${block.label}`);
        openLink(handlers, mode, block.value || "", block.label);
      }}
      style={getLinkButtonStyle(block as Parameters<typeof getLinkButtonStyle>[0])}
      className={`w-full font-bold flex items-center justify-between transition-all active:scale-98 acn-bio-link-btn ${
        compact ? "py-3 px-4 rounded-xl text-xs" : "py-3.5 px-4 rounded-2xl text-sm"
      } ${
        isDefaultBrightLink(block as Parameters<typeof isDefaultBrightLink>[0])
          ? "shadow-md shadow-violet-500/30 border-0"
          : "shadow-sm border border-slate-200/85"
      }`}
    >
      <div className={`flex items-center truncate text-left ${compact ? "gap-1.5" : "gap-2"}`}>
        {block.iconEmoji && <span className={compact ? "" : "text-base"}>{String(block.iconEmoji)}</span>}
        <div>
          <span className="acn-bio-link-label block font-bold leading-tight">{block.label}</span>
          {block.subtext && (
            <span className="acn-bio-link-subtext block font-medium opacity-70 mt-0.5">{String(block.subtext)}</span>
          )}
        </div>
      </div>
      {block.showArrow !== "No" && (
        <ArrowRight
          className={`shrink-0 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          style={{ color: getLinkArrowColor(block as Parameters<typeof getLinkArrowColor>[0]) }}
        />
      )}
    </button>
  );
}

export function SocialsBlockView({ block, mode, context, handlers }: BlockViewProps) {
  return (
    <SocialLinksRow
      block={block}
      compact={context.compact}
      onLinkClick={(link) => {
        if (mode === "preview") {
          handlers.onToast?.(`🔗 Opening ${link.label}: ${link.url}`);
          return;
        }
        track(handlers, "click", `Social Icon: ${link.label}`);
        if (link.id === "whatsapp") {
          handlers.onWhatsApp?.(link.url);
        } else {
          handlers.onExternalLink?.(link.url, link.label);
        }
      }}
    />
  );
}

export function ShopBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const shopProducts =
    Array.isArray(block.products) && block.products.length ? block.products : DEFAULT_SHOP_PRODUCTS;
  const align = (block.alignment as string) || "Centre";
  const alignClass = align === "Left" ? "text-left" : align === "Right" ? "text-right" : "text-center";
  const symbol = getCurrencySymbol(block.currency as string);
  const cardBg = (block.bgColor as string) || "#10B981";
  const textCol = (block.textColor as string) || "#FFFFFF";

  const onProductClick = (name: string, url?: string) => {
    if (mode === "preview") {
      handlers.onToast?.(`🛒 Simulated product click: ${name}`);
      return;
    }
    track(handlers, "click", `Shop Product: ${name}`);
    if (url) handlers.onExternalLink?.(url, name);
  };

  return (
    <div className={`text-left w-full ${compact ? "space-y-2" : "space-y-3 pt-2"}`}>
      <span
        className={`font-bold text-slate-500 block tracking-wider uppercase ${
          compact ? "text-[9px]" : "text-xs"
        } ${alignClass}`}
      >
        {block.label}
      </span>
      {compact ? (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {shopProducts.map((product: BlockRecord, index: number) => (
            <button
              key={product.id || index}
              type="button"
              onClick={() => onProductClick(String(product.name || "Product"), product.url as string)}
              className="min-w-[105px] bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm hover:shadow transition-all cursor-pointer hover:border-slate-300 text-left p-0"
            >
              <div className="h-16 bg-white flex items-center justify-center p-1.5">
                {product.image ? (
                  <img
                    src={String(product.image)}
                    alt={String(product.name || "Product")}
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-[8px] text-slate-400 font-bold">No Image</div>
                )}
              </div>
              <div
                className="p-1.5 text-[8.5px] text-center font-medium"
                style={{ backgroundColor: cardBg, color: textCol }}
              >
                <p className="font-bold truncate">{String(product.name || "Product")}</p>
                <p className="font-black text-[8px] mt-0.5 opacity-90">
                  {symbol}
                  {String(product.price || "0")}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shopProducts.map((product: BlockRecord, index: number) =>
            mode === "live" ? (
              <a
                key={product.id || index}
                href={(product.url as string) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onProductClick(String(product.name || "Product"), product.url as string)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between hover:border-slate-300"
              >
                <div className="h-32 bg-white flex items-center justify-center p-3">
                  {product.image ? (
                    <img
                      src={String(product.image)}
                      alt={String(product.name || "Product")}
                      className="h-full object-contain max-h-full max-w-full"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-bold">No Image</div>
                  )}
                </div>
                <div
                  className="p-3 text-center border-t border-slate-100 flex flex-col items-center justify-center min-h-[56px]"
                  style={{ backgroundColor: cardBg, color: textCol }}
                >
                  <p className="font-bold text-xs truncate max-w-full leading-tight">
                    {String(product.name || "Product")}
                  </p>
                  <p className="font-extrabold text-xs mt-0.5 opacity-90">
                    {symbol}
                    {String(product.price || "0")}
                  </p>
                </div>
              </a>
            ) : (
              <button
                key={product.id || index}
                type="button"
                onClick={() => onProductClick(String(product.name || "Product"), product.url as string)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between hover:border-slate-300 text-left p-0"
              >
                <div className="h-32 bg-white flex items-center justify-center p-3">
                  {product.image ? (
                    <img
                      src={String(product.image)}
                      alt={String(product.name || "Product")}
                      className="h-full object-contain max-h-full max-w-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-bold">No Image</div>
                  )}
                </div>
                <div
                  className="p-3 text-center border-t border-slate-100 flex flex-col items-center justify-center min-h-[56px]"
                  style={{ backgroundColor: cardBg, color: textCol }}
                >
                  <p className="font-bold text-xs truncate max-w-full leading-tight">
                    {String(product.name || "Product")}
                  </p>
                  <p className="font-extrabold text-xs mt-0.5 opacity-90">
                    {symbol}
                    {String(product.price || "0")}
                  </p>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function CouponBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const bgColor = (block.bgColor as string) || "rgb(239 246 255)";
  const textColor = (block.textColor as string) || "#1e3a8a";
  const code = block.value || "MARVELTOYCODE007";

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    if (mode === "preview") {
      handlers.onToast?.("🎟️ Coupon copied to clipboard!");
    } else {
      track(handlers, "click", `Copied Coupon: ${code}`);
      handlers.onToast?.("🎟️ Coupon copied to clipboard!");
    }
  };

  return (
    <div
      style={{ backgroundColor: bgColor, color: textColor }}
      className={`border border-blue-100 relative overflow-hidden text-left shadow-sm ${
        compact ? "p-3 rounded-2xl space-y-1" : "p-4 rounded-2xl space-y-2"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`font-bold uppercase tracking-wider font-mono opacity-80 ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
          style={{ color: textColor }}
        >
          Special Offer Coupon
        </span>
        <span
          className={`text-white px-2 py-0.5 rounded-full font-black uppercase ${
            compact ? "text-[7px]" : "text-[8px]"
          }`}
          style={{ backgroundColor: textColor, color: bgColor }}
        >
          {(block.discount as string) || "COPYABLE"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono font-extrabold tracking-widest bg-white/40 rounded-lg border border-dashed ${
            compact ? "text-xs py-0.5 px-2" : "text-sm py-1 px-3"
          }`}
          style={{ color: textColor, borderColor: textColor }}
        >
          {code}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="p-1.5 bg-white/50 hover:bg-white/80 rounded-lg transition-colors"
          style={{ color: textColor }}
          title="Copy Coupon"
        >
          <Copy className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>
      <p className={`opacity-90 leading-tight ${compact ? "text-[9px]" : "text-[10px]"}`}>{block.label}</p>
    </div>
  );
}

export function WhatsAppBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  return (
    <button
      type="button"
      onClick={() => openWhatsApp(handlers, mode, block.value || "+919876543210", `WhatsApp: ${block.label}`)}
      style={{
        backgroundColor: (block.bgColor as string) || "#25D366",
        color: (block.textColor as string) || "#FFFFFF"
      }}
      className={`w-full font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 border-0 ${
        compact ? "py-2.5 rounded-xl text-xs gap-1.5" : "py-3.5 rounded-2xl text-sm"
      }`}
    >
      <MessageSquare className={compact ? "h-3.5 w-3.5" : "h-4 w-4 shrink-0"} />
      <span className="truncate">{block.label}</span>
    </button>
  );
}

export function LinkSpinBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  return (
    <button
      type="button"
      onClick={() => {
        track(handlers, "click", `Spin Wheel: ${block.label}`);
        handlers.onSpinOpen?.(block.id);
      }}
      className={`w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-extrabold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 ${
        compact ? "py-2.5 rounded-xl text-xs gap-1.5" : "py-3.5 rounded-2xl text-sm"
      }`}
    >
      <span>🎡</span>
      <span>{block.label}</span>
    </button>
  );
}

export function SmartFormBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const leadEmail = handlers.leadEmails?.[block.id] || "";
  const destinationEmail = destinationEmailFromBlock(block);

  return (
    <div
      className={`bg-white border border-slate-200 text-left shadow-sm ${
        compact ? "p-4 rounded-2xl space-y-2" : "p-4.5 rounded-2xl space-y-2.5"
      }`}
    >
      <span
        className={`font-bold block text-center text-slate-700 uppercase tracking-widest font-mono ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {block.label}
      </span>
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <input
          type="email"
          required
          value={leadEmail}
          onChange={(e) => handlers.onLeadEmailChange?.(block.id, e.target.value)}
          placeholder="Enter your email"
          className={`w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
            compact ? "rounded-lg py-1.5 px-3.5 text-xs" : "rounded-xl py-2 px-3 text-xs"
          }`}
        />
        <button
          type="button"
          onClick={() => {
            if (!leadEmail || !leadEmail.includes("@")) {
              handlers.onToast?.(
                mode === "preview" ? "❌ Please enter your email first." : "Please enter a valid email address."
              );
              return;
            }
            if (mode === "preview") {
              handlers.onToast?.(`✅ Lead saved: ${leadEmail}`);
              handlers.onLeadEmailChange?.(block.id, "");
              return;
            }
            handlers.onLeadSubmit?.(block.id, leadEmail, destinationEmail);
          }}
          className={`w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold transition-colors shadow-md shadow-violet-500/25 ${
            compact ? "py-1.5 rounded-lg text-xs" : "py-2 rounded-xl text-xs"
          }`}
        >
          {mode === "preview" ? "Submit" : "Subscribe"}
        </button>
      </div>
    </div>
  );
}

export function VCardBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  return (
    <button
      type="button"
      onClick={() => {
        if (mode === "preview") {
          handlers.onToast?.("🪪 Simulated vCard contact info download saved to phone Contacts!");
          return;
        }
        if (handlers.onVCardDownload) {
          handlers.onVCardDownload(block);
          return;
        }
        const contactName =
          (typeof block.contactName === "string" && block.contactName.trim()) ||
          context.displayTitle ||
          block.label;
        const phone =
          (typeof block.phone === "string" && block.phone.trim()) ||
          (block.value?.includes("@") ? "" : block.value);
        const email =
          (typeof block.email === "string" && block.email.trim()) ||
          (block.value?.includes("@") ? block.value : destinationEmailFromBlock(block));
        downloadVCard({
          name: contactName,
          phone,
          email,
          handle: context.displayHandle
        });
        track(handlers, "click", `vCard Contact: ${block.label}`);
        handlers.onToast?.("Contact card downloaded to your device.");
      }}
      className={`w-full bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 border-0 ${
        compact ? "py-2.5 rounded-xl text-xs gap-1.5" : "py-3.5 rounded-2xl text-sm"
      }`}
    >
      <User className={compact ? "h-3.5 w-3.5 text-gray-400" : "h-4 w-4 text-slate-400"} />
      <span className="truncate">{block.label}</span>
    </button>
  );
}

export function VideoBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const thumb = getVideoThumbnail(block);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-colors">
      <button
        type="button"
        className={`w-full bg-slate-950 flex items-center justify-center relative group cursor-pointer border-0 p-0 ${
          compact ? "h-32" : "h-44"
        }`}
        onClick={() => {
          track(handlers, "click", `Video: ${block.label}`);
          if (mode === "preview") {
            handlers.onToast?.(`🎥 Playing Video: ${block.value || "https://youtube.com"}`);
            return;
          }
          openLink(handlers, mode, block.value || "", block.label);
        }}
      >
        <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url('${thumb}')` }} />
        <div
          className={`absolute bg-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-md transform group-hover:scale-110 transition-transform ${
            compact ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"
          }`}
        >
          ▶
        </div>
      </button>
      <div className={compact ? "p-2.5 text-left" : "p-3 text-left"}>
        <span className={`font-bold text-slate-800 block truncate ${compact ? "text-[10px]" : "text-xs"}`}>
          {block.label}
        </span>
      </div>
    </div>
  );
}

export function MusicBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const subtext = (block.subtext as string) || "Tap to listen";
  return (
    <button
      type="button"
      className={`w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm flex items-center justify-between cursor-pointer border-0 ${
        compact ? "p-3 rounded-2xl gap-3" : "p-4 rounded-2xl gap-3"
      }`}
      onClick={() => {
        track(handlers, "click", `Music Track: ${block.label}`);
        if (mode === "preview") {
          handlers.onToast?.(`🎵 Playing Audio: ${block.value || "Soundtrack"}`);
          return;
        }
        openLink(handlers, mode, block.value || "", block.label);
      }}
    >
      <div className={`flex items-center min-w-0 ${compact ? "gap-2.5" : "gap-3"}`}>
        <span className={compact ? "text-xl" : "text-2xl"}>🎵</span>
        <div className="min-w-0 text-left">
          <span className={`font-bold block truncate ${compact ? "text-[10px]" : "text-xs"}`}>{block.label}</span>
          <span className={`text-indigo-200 block ${compact ? "text-[8px] font-bold" : "text-[10px]"}`}>{subtext}</span>
        </div>
      </div>
      <div
        className={`bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white shrink-0 ${
          compact ? "h-7 w-7" : "h-9 w-9"
        }`}
      >
        ▶
      </div>
    </button>
  );
}

export function GalleryBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const images = getGalleryImages(block);
  if (!images.length && mode === "live") return null;

  return (
    <div className={`text-left ${compact ? "space-y-1.5" : "space-y-2 pt-2"}`}>
      <span
        className={`font-bold text-slate-400 block uppercase tracking-wider ${
          compact ? "text-[9px]" : "text-[10px] font-mono"
        }`}
      >
        {block.label}
      </span>
      {images.length > 0 ? (
        <div className={`grid grid-cols-3 ${compact ? "gap-1.5" : "gap-2"}`}>
          {images.map((src, index) =>
            mode === "live" ? (
              <button
                key={`${block.id}-${index}`}
                type="button"
                onClick={() => {
                  track(handlers, "click", `Gallery ${index + 1}: ${block.label}`);
                  handlers.onExternalLink?.(src, block.label);
                }}
                className={`w-full overflow-hidden rounded-xl border border-slate-100 p-0 ${
                  compact ? "h-14" : "h-20"
                }`}
              >
                <img
                  src={src}
                  alt={`Gallery ${index + 1}`}
                  className="h-full w-full object-cover hover:opacity-90 transition-opacity"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <img
                key={`${block.id}-${index}`}
                src={src}
                alt={`Gallery ${index + 1}`}
                onClick={() => handlers.onToast?.(`🖼️ Opened gallery image ${index + 1}`)}
                className={`w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                  compact ? "h-14" : "h-20"
                }`}
                referrerPolicy="no-referrer"
              />
            )
          )}
        </div>
      ) : (
        <p className={`text-slate-400 text-center py-2 ${compact ? "text-[9px]" : "text-[10px]"}`}>
          Add image URLs in block settings
        </p>
      )}
    </div>
  );
}

export function PdfBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const fileSize = (block.fileSize as string) || "";
  return (
    <button
      type="button"
      className={`w-full bg-white border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer shadow-sm text-left ${
        compact ? "p-3 rounded-2xl gap-3" : "p-4 rounded-2xl gap-3"
      }`}
      onClick={() => {
        track(handlers, "click", `PDF Download: ${block.label}`);
        if (mode === "preview") {
          handlers.onToast?.(`📄 Opening PDF Catalog: ${block.value || "catalog.pdf"}`);
          return;
        }
        openLink(handlers, mode, block.value || "", block.label);
      }}
    >
      <div className={`flex items-center min-w-0 ${compact ? "gap-2" : "gap-2.5"}`}>
        <span className={compact ? "text-xl" : "text-2xl"}>📄</span>
        <div className="min-w-0">
          <span className={`font-bold block text-slate-800 truncate ${compact ? "text-[10px]" : "text-xs"}`}>
            {block.label}
          </span>
          <span className={`text-slate-400 block font-mono ${compact ? "text-[8px]" : "text-[10px] mt-0.5"}`}>
            PDF Document{fileSize ? ` • ${fileSize}` : ""}
          </span>
        </div>
      </div>
      <span
        className={`bg-slate-100 text-slate-600 rounded-xl font-bold shrink-0 ${
          compact ? "text-xs px-2 py-1 rounded-lg" : "text-xs px-3 py-1.5"
        }`}
      >
        {compact ? "GET" : "OPEN"}
      </span>
    </button>
  );
}

export function EventsBlockView({ block, mode, context, handlers }: BlockViewProps) {
  const compact = context.compact;
  const eventMonth = (block.eventMonth as string) || "JUL";
  const eventDay = (block.eventDay as string) || "20";
  const eventMeta = (block.subtext as string) || "Tap to RSVP";

  return (
    <button
      type="button"
      className={`w-full bg-white border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer shadow-sm text-left ${
        compact ? "p-3 rounded-2xl gap-3" : "p-4 rounded-2xl gap-3"
      }`}
      onClick={() => {
        track(handlers, "click", `Event RSVP: ${block.label}`);
        if (mode === "preview") {
          handlers.onToast?.(`📅 RSVP Successful for Event: ${block.label}`);
          return;
        }
        openLink(handlers, mode, block.value || "", block.label);
      }}
    >
      <div className={`flex items-center min-w-0 ${compact ? "gap-2.5" : "gap-3"}`}>
        <div
          className={`bg-violet-50 border border-violet-100 text-violet-600 text-center shrink-0 font-bold ${
            compact ? "rounded-lg p-1 min-w-[34px]" : "rounded-xl p-1.5 min-w-[42px]"
          }`}
        >
          <span className={`block uppercase leading-none font-mono ${compact ? "text-[8px]" : "text-[9px]"}`}>
            {eventMonth}
          </span>
          <span className={`block leading-none mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>{eventDay}</span>
        </div>
        <div className="min-w-0">
          <span className={`font-bold block text-slate-800 truncate ${compact ? "text-[10px]" : "text-xs"}`}>
            {block.label}
          </span>
          <span className={`text-slate-500 block ${compact ? "text-[8px]" : "text-[10px] mt-0.5"}`}>{eventMeta}</span>
        </div>
      </div>
      <span
        className={`bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold shadow-md shadow-violet-500/25 shrink-0 ${
          compact ? "text-[9px] px-2.5 py-1.5 rounded-lg tracking-wide" : "text-xs px-4 py-2 rounded-xl"
        }`}
      >
        RSVP
      </span>
    </button>
  );
}

export function CountdownBlockViewWrapper({ block, context }: BlockViewProps) {
  return <CountdownBlockView block={block} compact={context.compact} />;
}

export function DefaultBlockView({ block, mode, handlers }: BlockViewProps) {
  return (
    <button
      type="button"
      onClick={() => {
        track(handlers, "click", `Action Block: ${block.label}`);
        if (mode === "preview") {
          handlers.onToast?.(`✨ Clicked block: ${block.label}`);
          return;
        }
        if (block.value && block.value !== block.label) {
          handlers.onExternalLink?.(block.value, block.label);
        } else {
          handlers.onToast?.(`${block.label} is not configured yet.`);
        }
      }}
      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-2xl text-xs shadow-sm border border-slate-200 transition-colors"
    >
      {block.label}
    </button>
  );
}

export function renderBlockView(props: BlockViewProps): React.ReactNode {
  switch (props.block.type) {
    case "Header":
      return <HeaderBlockView {...props} />;
    case "Text":
      return <TextBlockView {...props} />;
    case "Button":
    case "Deep Link":
      return <LinkButtonBlockView {...props} />;
    case "Socials":
      return <SocialsBlockView {...props} />;
    case "Shop":
      return <ShopBlockView {...props} />;
    case "Coupon":
      return <CouponBlockView {...props} />;
    case "Countdown":
      return <CountdownBlockViewWrapper {...props} />;
    case "Link Spin":
      return <LinkSpinBlockView {...props} />;
    case "WhatsApp":
      return <WhatsAppBlockView {...props} />;
    case "Smart Form":
      return <SmartFormBlockView {...props} />;
    case "vCard":
      return <VCardBlockView {...props} />;
    case "Video":
      return <VideoBlockView {...props} />;
    case "Music":
      return <MusicBlockView {...props} />;
    case "Gallery":
      return <GalleryBlockView {...props} />;
    case "PDF":
      return <PdfBlockView {...props} />;
    case "Events":
      return <EventsBlockView {...props} />;
    default:
      return <DefaultBlockView {...props} />;
  }
}
