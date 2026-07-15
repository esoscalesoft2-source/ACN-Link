import { apiUrl } from "./apiBase";

export function currentHostname() {
  return window.location.hostname.toLowerCase().replace(/:\d+$/, "");
}

export function isPlatformHostname(hostname = currentHostname()) {
  const host = hostname.toLowerCase().replace(/:\d+$/, "");
  if (!host || host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".up.railway.app")) return true;

  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (appUrl) {
    try {
      const configured = new URL(appUrl.includes("://") ? appUrl : `https://${appUrl}`).hostname.toLowerCase();
      if (configured === host) return true;
    } catch {
      /* ignore */
    }
  }

  return host === "acnlink.mindflo.today";
}

export async function resolveBrandedDomainPageId(hostname = currentHostname()): Promise<string | null> {
  if (isPlatformHostname(hostname)) return null;
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
