export function labelCount(hostname: string): number {
  return hostname.trim().toLowerCase().replace(/\.$/, "").split(".").filter(Boolean).length;
}

/** ACN Link production server IP for root domain A records (@ and www). */
export const ACN_LINK_A_RECORD_TARGET = "69.46.46.90";

/** Lovable/Vercel demo IP copied from reference docs — never show to ACN users. */
const LOVABLE_DEMO_A_RECORD_TARGET = "76.76.21.21";

export function sanitizeARecordTarget(value: string | undefined | null): string {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === LOVABLE_DEMO_A_RECORD_TARGET) {
    return ACN_LINK_A_RECORD_TARGET;
  }
  return trimmed;
}

function getLabels(hostname: string): string[] {
  return hostname.trim().toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
}

export function normalizeCustomHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/\.$/, "");
}

/** Root domain: yourbrand.com (exactly two labels, not starting with www). */
export function isRootDomain(hostname: string): boolean {
  const labels = getLabels(hostname);
  return labels.length === 2 && labels[0] !== "www";
}

/** Subdomain: studio.yourbrand.com or vickys-trx-fitness-studio.wheree.com */
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

/** DNS zone for provider login (wheree.com for vickys-trx-fitness-studio.wheree.com). */
export function getDnsZoneDomain(hostname: string): string {
  const labels = getLabels(hostname);
  if (labels.length <= 2) return labels.join(".");
  return labels.slice(-2).join(".");
}

/** Host label to enter at the DNS provider for a subdomain record. */
export function getSubdomainHostLabel(hostname: string): string {
  const labels = getLabels(hostname);
  if (labels.length <= 2) return "@";
  return labels.slice(0, -2).join(".");
}

export function getDnsRootDomain(hostname: string): string {
  return normalizeCustomHostname(hostname);
}

export type DnsRecordType = "A" | "CNAME";

export interface DnsRecordInstruction {
  id: string;
  type: DnsRecordType;
  hostLabel: string;
  hostDisplay: string;
  value: string;
}

export interface DnsInstructionSet {
  domainName: string;
  rootDomain: string;
  kind: "root" | "subdomain";
  records: DnsRecordInstruction[];
}

export function resolveCnameTarget(explicitTarget?: string, platformUrl?: string): string {
  const fromEnv = explicitTarget?.trim().replace(/^https?:\/\//, "").split("/")[0];
  if (fromEnv) return fromEnv;

  const candidates = [
    platformUrl,
    typeof import.meta !== "undefined" ? (import.meta.env.VITE_API_URL as string | undefined) : undefined,
    typeof import.meta !== "undefined" ? (import.meta.env.VITE_APP_URL as string | undefined) : undefined
  ].filter(Boolean);

  for (const raw of candidates) {
    try {
      const hostname = new URL(String(raw).includes("://") ? String(raw) : `https://${raw}`).hostname.toLowerCase();
      if (hostname && hostname !== "localhost" && !hostname.startsWith("127.")) {
        return hostname;
      }
    } catch {
      /* ignore */
    }
  }
  return "acnlink.mindflo.today";
}

/** Root: A records for www and @. Subdomain: CNAME to platform (with A fallback in verification). */
export function buildDnsRecordSet(
  domainName: string,
  aRecordTarget: string,
  options?: { cnameTarget?: string; platformUrl?: string }
): DnsInstructionSet {
  const host = normalizeCustomHostname(domainName);
  const kind = getCustomDomainKind(host);

  if (kind === "subdomain") {
    const hostLabel = getSubdomainHostLabel(host);
    const cnameTarget = resolveCnameTarget(options?.cnameTarget, options?.platformUrl);
    return {
      domainName: host,
      rootDomain: getDnsZoneDomain(host),
      kind: "subdomain",
      records: [
        {
          id: "subdomain-cname",
          type: "CNAME",
          hostLabel,
          hostDisplay: hostLabel,
          value: cnameTarget
        }
      ]
    };
  }

  return {
    domainName: host,
    rootDomain: host,
    kind: "root",
    records: [
      {
        id: "www",
        type: "A",
        hostLabel: "www",
        hostDisplay: "www",
        value: aRecordTarget
      },
      {
        id: "apex",
        type: "A",
        hostLabel: "@",
        hostDisplay: "@ (root)",
        value: aRecordTarget
      }
    ]
  };
}

export function customDomainValidationError(hostname: string): string | null {
  const host = normalizeCustomHostname(hostname);
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

/** @deprecated Use customDomainValidationError */
export function rootDomainValidationError(hostname: string): string | null {
  return customDomainValidationError(hostname);
}
