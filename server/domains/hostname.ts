/** Default A record target for ACN Link on Railway (override with CUSTOM_DOMAIN_A_TARGET). */
export const DEFAULT_CUSTOM_DOMAIN_A_TARGET = "69.46.46.90";

/** Lovable/Vercel demo IP — must never be shown to ACN Link customers. */
export const LOVABLE_DEMO_A_RECORD_TARGET = "76.76.21.21";

const BLOCKED_A_RECORD_TARGETS = new Set([LOVABLE_DEMO_A_RECORD_TARGET]);

export function sanitizeARecordTarget(value: string | undefined | null): string {
  const trimmed = String(value || "").trim();
  if (!trimmed || BLOCKED_A_RECORD_TARGETS.has(trimmed)) {
    if (trimmed && BLOCKED_A_RECORD_TARGETS.has(trimmed)) {
      console.warn(
        `[custom-domains] Ignoring demo IP ${trimmed} (Lovable/Vercel). Using ACN Link IP ${DEFAULT_CUSTOM_DOMAIN_A_TARGET}.`
      );
    }
    return DEFAULT_CUSTOM_DOMAIN_A_TARGET;
  }
  return trimmed;
}

export function normalizeHostname(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

function getLabels(hostname: string): string[] {
  return normalizeHostname(hostname).split(".").filter(Boolean);
}

export function isRootDomain(hostname: string): boolean {
  const labels = getLabels(hostname);
  return labels.length === 2 && labels[0] !== "www";
}

export function isSubdomain(hostname: string): boolean {
  const labels = getLabels(hostname);
  return labels.length >= 3 && labels[0] !== "www";
}

export function getCustomDomainKind(hostname: string): "root" | "subdomain" | null {
  if (isRootDomain(hostname)) return "root";
  if (isSubdomain(hostname)) return "subdomain";
  return null;
}

export function isSupportedCustomDomain(hostname: string): boolean {
  return getCustomDomainKind(hostname) !== null;
}

export function getDnsZoneDomain(hostname: string): string {
  const labels = getLabels(hostname);
  if (labels.length <= 2) return labels.join(".");
  return labels.slice(-2).join(".");
}

export function getSubdomainHostLabel(hostname: string): string {
  const labels = getLabels(hostname);
  if (labels.length <= 2) return "@";
  return labels.slice(0, -2).join(".");
}

export function resolveCnameTarget(): string {
  const explicit = process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim();
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").split("/")[0];
  }

  const candidates = [process.env.API_URL, process.env.APP_URL].filter(Boolean);
  for (const raw of candidates) {
    try {
      const hostname = new URL(raw!.includes("://") ? raw! : `https://${raw}`).hostname.toLowerCase();
      if (hostname && hostname !== "localhost" && !hostname.startsWith("127.")) {
        return hostname;
      }
    } catch {
      /* ignore */
    }
  }
  return "acnlink.mindflo.today";
}

export function resolvePlatformHostname(): string {
  return resolveCnameTarget();
}

export function resolveCustomDomainATarget(): string {
  return sanitizeARecordTarget(process.env.CUSTOM_DOMAIN_A_TARGET);
}

export const CUSTOM_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?!www\.)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z0-9-]{2,63}(?<!-)$/i;

export function customDomainValidationError(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  const labels = getLabels(host);
  if (labels.length === 0) {
    return "Enter your domain or subdomain, for example yourbrand.com or studio.yourbrand.com.";
  }
  if (labels.length === 1) {
    return "Enter a full domain like yourbrand.com or links.yourbrand.com.";
  }
  if (labels[0] === "www" && labels.length === 2) {
    return "Enter yourbrand.com without the www prefix. ACN shows separate A records for @ and www.";
  }
  if (labels[0] === "www" && labels.length >= 3) {
    return "Remove the www prefix and enter the full address you want to connect, for example studio.yourbrand.com.";
  }
  if (!isSupportedCustomDomain(host)) {
    return "Enter a valid domain or subdomain, for example yourbrand.com or studio.yourbrand.com.";
  }
  return null;
}

export function assertSupportedCustomDomain(hostname: string): string | null {
  if (!CUSTOM_DOMAIN_PATTERN.test(hostname)) {
    return "Enter a valid domain or subdomain, for example yourbrand.com or studio.yourbrand.com.";
  }
  return customDomainValidationError(hostname);
}
