import { resolvePlatformHostname } from "../domains/hostname";

export function linkRotatorPublicBase(): string {
  const fromEnv = (process.env.APP_URL || process.env.API_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) {
    try {
      const url = new URL(fromEnv.includes("://") ? fromEnv : `https://${fromEnv}`);
      return `${url.protocol}//${url.host}`;
    } catch {
      /* fall through */
    }
  }
  return `https://${resolvePlatformHostname()}`;
}

export function buildLinkRotatorPublicUrl(slug: string): string {
  return `${linkRotatorPublicBase()}/r/${slug}`;
}
