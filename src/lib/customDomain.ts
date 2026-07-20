import { apiUrl } from "./apiBase";
import {
  isPlatformApexHostname,
  isPlatformSubdomainHostname,
  parsePlatformSubdomainSlug
} from "./platformSubdomain";

const ROUTED_PAGE_COOKIE = "acn_routed_page";

function readRoutedPageCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ROUTED_PAGE_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function currentHostname() {
  return window.location.hostname.toLowerCase().replace(/:\d+$/, "");
}

export function isPlatformHostname(hostname = currentHostname()) {
  if (isPlatformSubdomainHostname(hostname)) return false;
  return isPlatformApexHostname(hostname);
}

export async function resolveBrandedDomainPageId(hostname = currentHostname()): Promise<string | null> {
  if (isPlatformHostname(hostname)) return null;

  const fromCookie = readRoutedPageCookie();
  if (fromCookie) return fromCookie;

  const platformSlug = parsePlatformSubdomainSlug(hostname);
  if (platformSlug) {
    try {
      const response = await fetch(
        apiUrl(`/api/public/platform-subdomain/${encodeURIComponent(platformSlug)}`),
        { headers: { Accept: "application/json" } }
      );
      if (response.ok) {
        const data = (await response.json()) as { pageId?: string };
        return data.pageId || null;
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const response = await fetch(
      apiUrl(`/api/public/custom-domain/${encodeURIComponent(hostname)}`),
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { pageId?: string };
    return data.pageId || null;
  } catch {
    return null;
  }
}

export function stripPreviewQueryFromUrl() {
  if (!window.location.search.includes("previewPageId")) return;
  window.history.replaceState({}, "", window.location.pathname);
}
