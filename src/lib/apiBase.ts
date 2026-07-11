/**
 * API base for Path A: Vercel UI → Railway backend.
 * - Dev (same Express+Vite): leave VITE_API_URL unset → relative `/api/...`
 * - Production static (Vercel): set VITE_API_URL=https://your-app.up.railway.app
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";
  return raw.replace(/\/$/, "");
}

/** Build absolute or relative API path. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
