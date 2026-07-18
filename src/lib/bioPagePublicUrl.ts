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

export function isCustomDomainLinked(domain: CustomDomain): boolean {
  return (
    domain.status === "Verified" ||
    domain.status === "DNS Verified" ||
    domain.status === "Provisioning SSL"
  );
}

/** @deprecated Use isCustomDomainLinked for UI badges or isCustomDomainPublicReady for open/share URLs. */
export function isCustomDomainLive(domain: CustomDomain): boolean {
  return isCustomDomainLinked(domain);
}

/** Custom domain URL is safe to open only when fully verified on the platform. */
export function isCustomDomainPublicReady(domain: CustomDomain): boolean {
  return domain.status === "Verified";
}

export function findLiveDomainForPage(pageId: string, domains: CustomDomain[]): CustomDomain | null {
  return domains.find((domain) => domain.pageId === pageId && isCustomDomainLinked(domain)) ?? null;
}

export function findPublicReadyDomainForPage(pageId: string, domains: CustomDomain[]): CustomDomain | null {
  return domains.find((domain) => domain.pageId === pageId && isCustomDomainPublicReady(domain)) ?? null;
}

export interface BioPagePublicLink {
  /** Canonical URL for copy, QR, and sharing */
  shareUrl: string;
  /** URL for Open / visit (works on localhost in dev) */
  openUrl: string;
  /** Short label shown under the page title */
  displayLabel: string;
  kind: "custom" | "platform";
  /** Custom domain is fully Verified and safe to open on the live domain */
  publicReady: boolean;
  /** DNS verified — Open goes to the custom domain URL */
  canOpen: boolean;
}

export function resolveBioPagePublicLink(page: BioPage, domains: CustomDomain[] = []): BioPagePublicLink {
  const linkedDomain = findLiveDomainForPage(page.id, domains);
  const publicReadyDomain = findPublicReadyDomainForPage(page.id, domains);
  const platformOrigin = getPlatformPublicOrigin();
  const previewOpenUrl = `${getShareableOrigin()}/?previewPageId=${encodeURIComponent(page.id)}`;
  const previewShareUrl = `${platformOrigin}/?previewPageId=${encodeURIComponent(page.id)}`;
  const displayHost = platformOrigin.replace(/^https?:\/\//, "");

  if (linkedDomain) {
    const customUrl = `https://${linkedDomain.domainName}`;
    const publicReady = Boolean(publicReadyDomain);
    const canOpen = isCustomDomainLinked(linkedDomain);
    return {
      shareUrl: publicReady ? customUrl : previewShareUrl,
      openUrl: canOpen ? customUrl : previewOpenUrl,
      displayLabel: linkedDomain.domainName,
      kind: "custom",
      publicReady,
      canOpen
    };
  }

  return {
    shareUrl: previewShareUrl,
    openUrl: previewOpenUrl,
    displayLabel: `${displayHost}/?previewPageId=${page.id}`,
    kind: "platform",
    publicReady: true,
    canOpen: true
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
