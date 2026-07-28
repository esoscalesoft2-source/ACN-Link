import { resolvePlatformHostname } from "../domains/hostname";

/** Canonical host baked into printed Smart QR codes (never change after print). */
export function qrPlatformHostname(): string {
  const fromEnv = String(process.env.QR_PUBLIC_HOST || process.env.APP_URL || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (fromEnv && fromEnv !== "localhost" && fromEnv !== "127.0.0.1") {
    return fromEnv;
  }
  return resolvePlatformHostname();
}

export function buildQrScanUrl(publicCode: string, host = qrPlatformHostname()): string {
  const code = String(publicCode || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return `https://${host}/q/${code}`;
}

export function normalizeQrPublicCode(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}
