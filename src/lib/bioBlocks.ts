import type { BioEditorBlock } from "../types";

export type BlockRecord = BioEditorBlock & Record<string, unknown>;

export interface SocialPlatformDef {
  id: string;
  label: string;
  field: string;
  placeholder: string;
  brandColor: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  { id: "instagram", label: "Instagram", field: "instagramUrl", placeholder: "https://instagram.com/yourbrand", brandColor: "#E4405F" },
  { id: "facebook", label: "Facebook", field: "facebookUrl", placeholder: "https://facebook.com/yourpage", brandColor: "#1877F2" },
  { id: "youtube", label: "YouTube", field: "youtubeUrl", placeholder: "https://youtube.com/@yourchannel", brandColor: "#FF0000" },
  { id: "tiktok", label: "TikTok", field: "tiktokUrl", placeholder: "https://tiktok.com/@yourbrand", brandColor: "#010101" },
  { id: "linkedin", label: "LinkedIn", field: "linkedinUrl", placeholder: "https://linkedin.com/in/you", brandColor: "#0A66C2" },
  { id: "x", label: "X (Twitter)", field: "xUrl", placeholder: "https://x.com/yourhandle", brandColor: "#000000" },
  { id: "whatsapp", label: "WhatsApp", field: "whatsappUrl", placeholder: "https://wa.me/919876543210", brandColor: "#25D366" },
  { id: "telegram", label: "Telegram", field: "telegramUrl", placeholder: "https://t.me/yourchannel", brandColor: "#229ED9" }
];

export function createDefaultSocialFields(): Record<string, string> {
  return Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform.field, ""]));
}

export interface SocialLinkItem {
  id: string;
  label: string;
  url: string;
  brandColor: string;
}

export function getSocialLinksFromBlock(block: BlockRecord): SocialLinkItem[] {
  const legacyWebsite =
    typeof block.websiteUrl === "string" && block.websiteUrl.trim() ? block.websiteUrl.trim() : "";

  const links: SocialLinkItem[] = [];

  for (const platform of SOCIAL_PLATFORMS) {
    const raw = block[platform.field];
    const url = typeof raw === "string" ? raw.trim() : "";
    if (url) {
      links.push({
        id: platform.id,
        label: platform.label,
        url,
        brandColor: platform.brandColor
      });
    }
  }

  if (links.length === 0 && legacyWebsite) {
    links.push({
      id: "website",
      label: "Website",
      url: legacyWebsite,
      brandColor: "#6366f1"
    });
  }

  return links;
}

export function getGalleryImages(block: BlockRecord): string[] {
  return [block.img1, block.img2, block.img3]
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .map((url) => url.trim());
}

export function defaultCountdownEndAt(daysFromNow = 9): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

function parseLegacyCountdownDays(value: string | undefined, fallback = 9): number {
  const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function resolveCountdownEndAt(block: BlockRecord): number {
  const endAt = typeof block.endAt === "string" ? block.endAt.trim() : "";
  if (endAt) {
    const parsed = Date.parse(endAt);
    if (Number.isFinite(parsed)) return parsed;
  }

  const days = parseLegacyCountdownDays(block.value, 9);
  return Date.parse(defaultCountdownEndAt(days));
}

export interface CountdownParts {
  days: number;
  hrs: number;
  mins: number;
  secs: number;
  expired: boolean;
}

export function computeCountdownParts(endAtMs: number, nowMs = Date.now()): CountdownParts {
  const diff = Math.max(0, endAtMs - nowMs);
  if (diff <= 0) {
    return { days: 0, hrs: 0, mins: 0, secs: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hrs = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return { days, hrs, mins, secs, expired: false };
}

export function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  if (!value.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|whatsapp:)/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) return `mailto:${trimmed}`;
  if (/^\+?[\d\s()-]{7,}$/.test(trimmed)) return `tel:${trimmed.replace(/\s/g, "")}`;
  return `https://${trimmed}`;
}

export interface ShopProductRecord {
  id: string;
  name: string;
  url: string;
  image: string;
  price: string;
}

export const DEFAULT_SHOP_PRODUCTS: ShopProductRecord[] = [
  {
    id: "p1",
    name: "Iron man",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1626278664285-f7c05fd17571?auto=format&fit=crop&q=80&w=300",
    price: "3999"
  },
  {
    id: "p2",
    name: "spiderman",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?auto=format&fit=crop&q=80&w=300",
    price: "2999"
  },
  {
    id: "p3",
    name: "halk",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=300",
    price: "1899"
  }
];

export const DEFAULT_LINK_SPIN_PRIZES = [
  "20% discount unlocked!",
  "Free gift with your next order!",
  "Free shipping on your order!",
  "Try again on your next visit!"
];

export function getCurrencySymbol(currency: string = "₹ INR"): string {
  if (currency.startsWith("₹")) return "₹";
  if (currency.startsWith("$")) return "$";
  if (currency.startsWith("€")) return "€";
  if (currency.startsWith("£")) return "£";
  if (currency.startsWith("¥")) return "¥";
  return currency.split(" ")[0] || "₹";
}

export function getVideoThumbnail(block: BlockRecord): string {
  const customThumb = typeof block.thumbUrl === "string" ? block.thumbUrl.trim() : "";
  if (customThumb) return customThumb;
  const url = typeof block.value === "string" ? block.value : "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i);
  if (ytMatch?.[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800";
}

export function getLinkSpinPrizes(block: BlockRecord): string[] {
  if (Array.isArray(block.prizes)) {
    const prizes = block.prizes
      .filter((prize): prize is string => typeof prize === "string" && prize.trim().length > 0)
      .map((prize) => prize.trim());
    if (prizes.length) return prizes;
  }
  if (typeof block.prizesText === "string" && block.prizesText.trim()) {
    const prizes = block.prizesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (prizes.length) return prizes;
  }
  return DEFAULT_LINK_SPIN_PRIZES;
}

export function getLinkSpinCouponCode(block: BlockRecord, fallback = "LUCKYSPIN20"): string {
  const code = typeof block.couponCode === "string" ? block.couponCode.trim() : "";
  return code || fallback;
}

export function destinationEmailFromBlock(block: BlockRecord): string | undefined {
  const direct = typeof block.email === "string" ? block.email.trim() : "";
  if (direct.includes("@")) return direct;
  const value = typeof block.value === "string" ? block.value.trim() : "";
  return value.includes("@") ? value : undefined;
}

export function downloadVCard(options: {
  name: string;
  phone?: string;
  email?: string;
  handle?: string;
}): void {
  const phone = options.phone?.replace(/[^\d+]/g, "") || "";
  const email = options.email?.includes("@") ? options.email : "";
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${options.name}`,
    options.handle ? `NICKNAME:${options.handle.replace(/^@/, "")}` : "",
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    email ? `EMAIL:${email}` : "",
    "END:VCARD"
  ]
    .filter(Boolean)
    .join("\r\n");
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${options.name.replace(/\s+/g, "-").toLowerCase() || "contact"}.vcf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function createDefaultLinkSpinFields(): Record<string, unknown> {
  return {
    couponCode: "LUCKYSPIN20",
    prizesText: DEFAULT_LINK_SPIN_PRIZES.join("\n")
  };
}

export function createDefaultVCardFields(): Record<string, string> {
  return {
    contactName: "",
    phone: "",
    email: ""
  };
}

export function createDefaultEventFields(): Record<string, string> {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return {
    eventMonth: month,
    eventDay: String(now.getDate()),
    subtext: "Tap to RSVP"
  };
}
