import { getDnsZoneDomain, normalizeHostname } from "./hostname";

/** Free plan: up to this many custom hostnames per root zone (any root the user connects). */
export const FREE_CUSTOM_DOMAINS_PER_ROOT = 3;

export function userHasPaidCustomDomains(plan: string | undefined | null): boolean {
  const value = String(plan || "").trim().toLowerCase();
  if (!value) return false;
  return (
    /\bpro\b/.test(value) ||
    value.includes("paid") ||
    value.includes("smart marketing") ||
    value.includes("business") ||
    value.includes("enterprise") ||
    value.includes("unlimited")
  );
}

export function countDomainsOnRootZone(
  domains: Array<{ domainName: string }>,
  hostname: string
): number {
  const zone = getDnsZoneDomain(normalizeHostname(hostname));
  if (!zone) return 0;
  return domains.filter((item) => getDnsZoneDomain(item.domainName) === zone).length;
}

export function freeRootDomainLimitMessage(zone: string, used: number): string {
  return (
    `Free plan allows up to ${FREE_CUSTOM_DOMAINS_PER_ROOT} custom domains on ${zone} ` +
    `(you already have ${used}). This limit applies per root for every domain you connect — ` +
    `not only one brand. Upgrade to a paid plan to add more on ${zone}.`
  );
}
