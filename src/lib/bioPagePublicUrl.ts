import type { BioPage, CustomDomain } from "../types";
import { PRIMARY_DOMAIN } from "../storage/publishStorage";

export function getShareableOrigin(): string {
  if (typeof window === "undefined") return `https://${PRIMARY_DOMAIN}`;
  let origin = window.location.origin;
  if (origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

/** Production platform host for labels and share links (not localhost). */
export function getPlatformPublicOrigin(): string {
  const origin = getShareableOrigin();
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return `https://${PRIMARY_DOMAIN}`;
  }
  return origin;
}

export function isCustomDomainLive(domain: CustomDomain): boolean {
  return domain.status === "Verified" || domain.status === "DNS Verified";
}

export function findLiveDomainForPage(pageId: string, domains: CustomDomain[]): CustomDomain | null {
  return domains.find((domain) => domain.pageId === pageId && isCustomDomainLive(domain)) ?? null;
}

export interface BioPagePublicLink {
  /** Canonical URL for copy, QR, and sharing */
  shareUrl: string;
  /** URL for Open / visit (works on localhost in dev) */
  openUrl: string;
  /** Short label shown under the page title */
  displayLabel: string;
  kind: "custom" | "platform";
}

export function resolveBioPagePublicLink(page: BioPage, domains: CustomDomain[] = []): BioPagePublicLink {
  const liveDomain = findLiveDomainForPage(page.id, domains);
  if (liveDomain) {
    const url = `https://${liveDomain.domainName}`;
    return {
      shareUrl: url,
      openUrl: url,
      displayLabel: liveDomain.domainName,
      kind: "custom"
    };
  }

  const platformOrigin = getPlatformPublicOrigin();
  const shareUrl = `${platformOrigin}/?previewPageId=${encodeURIComponent(page.id)}`;
  const openUrl = `${getShareableOrigin()}/?previewPageId=${encodeURIComponent(page.id)}`;
  const displayHost = platformOrigin.replace(/^https?:\/\//, "");

  return {
    shareUrl,
    openUrl,
    displayLabel: `${displayHost}/?previewPageId=${page.id}`,
    kind: "platform"
  };
}

export function sortPagesByPublicLinkKind(pages: BioPage[], domains: CustomDomain[]): BioPage[] {
  return [...pages].sort((a, b) => {
    const aCustom = findLiveDomainForPage(a.id, domains) ? 1 : 0;
    const bCustom = findLiveDomainForPage(b.id, domains) ? 1 : 0;
    if (aCustom !== bCustom) return bCustom - aCustom;
    return 0;
  });
}
