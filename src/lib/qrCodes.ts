import { getPublicAppHostname, isEphemeralHostname } from "./publicAppUrl";
import type { QRCodeItem } from "../types";

export function generateQrPublicCode(): string {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function buildQrImageUrl(scanUrl: string, color: string, size = 250): string {
  const hex = color.replace("#", "");
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=${hex}&data=${encodeURIComponent(scanUrl)}`;
}

export function buildQrSvgImageUrl(scanUrl: string, color: string, size = 500): string {
  const hex = color.replace("#", "");
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=${hex}&format=svg&data=${encodeURIComponent(scanUrl)}`;
}

export function buildFixedQrScanUrl(publicCode: string, host = getPublicAppHostname()): string {
  const code = normalizePublicCode(publicCode);
  return `https://${host}/q/${code}`;
}

function normalizePublicCode(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Keep each QR's publicCode forever.
 * Upgrade localhost/LAN scan URLs → production /q/{code}.
 */
export function canonicalizeQrScanUrl(publicCode: string, scanUrl?: string): string {
  const code = normalizePublicCode(publicCode);
  const fallback = buildFixedQrScanUrl(code);
  if (!scanUrl || !code) return fallback;
  try {
    const url = new URL(scanUrl);
    const pathMatch = url.pathname.match(/^\/q\/([^/]+)\/?$/i);
    const codeFromPath = pathMatch?.[1] ? normalizePublicCode(pathMatch[1]) : "";
    const resolvedCode = codeFromPath || code;
    if (isEphemeralHostname(url.hostname)) {
      return buildFixedQrScanUrl(resolvedCode);
    }
    return `${url.protocol}//${url.host}/q/${resolvedCode}`;
  } catch {
    return fallback;
  }
}

/** Ensure QR has a frozen scanUrl/publicCode; never rewrite publicCode after create. */
export function ensureStableQrPayload(item: QRCodeItem): QRCodeItem {
  const color = item.designColor || extractQrColor(item.qrUrl);
  const publicCode = item.publicCode || generateQrPublicCodeFromId(item.id);
  const scanUrl = canonicalizeQrScanUrl(publicCode, item.scanUrl);
  return {
    ...item,
    publicCode,
    scanUrl,
    designColor: color,
    qrUrl: buildQrImageUrl(scanUrl, color, 250)
  };
}

function generateQrPublicCodeFromId(id: string): string {
  const cleaned = String(id || "")
    .replace(/^qr_?/i, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();
  return cleaned || generateQrPublicCode();
}

export function extractQrColor(qrUrl: string, fallback = "#4F46E5"): string {
  const match = qrUrl.match(/color=([0-9A-Fa-f]{6})/i);
  return match?.[1] ? `#${match[1]}` : fallback;
}

export function formatQrScanExact(value: string | number | undefined): string {
  const n = Math.max(0, Math.floor(Number(String(value ?? "0").replace(/,/g, "")) || 0));
  return n.toLocaleString("en-IN");
}
