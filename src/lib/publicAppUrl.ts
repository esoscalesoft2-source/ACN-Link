import { PRIMARY_DOMAIN } from "../storage/publishStorage";

/**
 * Canonical public origin for share links and Smart QR matrices.
 * Never returns localhost / 127.0.0.1 / Vite preview hosts for printed assets.
 *
 * Resolution order:
 * 1. VITE_APP_URL (safe public Vite env)
 * 2. PRIMARY_DOMAIN platform host
 */
export function getPublicAppOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv && /^https?:\/\//i.test(fromEnv) && !isEphemeralOrigin(fromEnv)) {
    return fromEnv;
  }
  return `https://${PRIMARY_DOMAIN}`;
}

export function getPublicAppHostname(): string {
  try {
    return new URL(getPublicAppOrigin()).hostname.toLowerCase();
  } catch {
    return PRIMARY_DOMAIN;
  }
}

export function isEphemeralOrigin(value: string): boolean {
  try {
    const host = new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
    return isEphemeralHostname(host);
  } catch {
    return true;
  }
}

export function isEphemeralHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.includes("ais-dev-") || host.includes("ais-pre-")) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/** Absolute public URL path on the platform origin (e.g. /q/abc). */
export function buildPublicAppUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getPublicAppOrigin()}${path}`;
}
