/**
 * ACN Link — Cloudflare Worker for Cloudflare for SaaS (FREE plan).
 *
 * Deploy once on the PLATFORM zone: mindflo.today
 *
 * Required Worker route on zone mindflo.today:
 *   match ALL hosts and paths  (pattern: star / star)
 *
 * Why that route?
 * Custom hostnames (tree.ezysellonline.com, …) arrive with Host = customer domain.
 * A route like only cf-saas-origin.mindflo.today does NOT match them, so traffic
 * hits Railway with the wrong Host → "train has not arrived" 404.
 *
 * This Worker:
 * - Platform hosts (*.mindflo.today): pass through to Railway (no Host rewrite loop)
 * - Customer custom hostnames: rewrite Host → acnlink.mindflo.today + preserve
 *   acn-customer-host / X-Forwarded-Host for Express routing
 *
 * Fallback Origin in Cloudflare for SaaS should remain:
 *   cf-saas-origin.mindflo.today
 */
const PLATFORM_HOST = "acnlink.mindflo.today";
/** CNAME target of acnlink.mindflo.today — avoids Worker loops on a catch-all route */
const RAILWAY_HOST = "uewsld8v.up.railway.app";

function isPlatformZoneHost(host) {
  return (
    host === PLATFORM_HOST ||
    host === "cf-saas-origin.mindflo.today" ||
    host === "mindflo.today" ||
    host === "www.mindflo.today" ||
    host.endsWith(".mindflo.today")
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Own zone hostnames → Railway directly (keep original Host)
    if (isPlatformZoneHost(host)) {
      return fetch(request, {
        cf: { resolveOverride: RAILWAY_HOST }
      });
    }

    // Cloudflare for SaaS custom hostname → Railway with platform Host
    const upstreamUrl = new URL(request.url);
    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = PLATFORM_HOST;

    const headers = new Headers(request.headers);
    headers.set("Host", PLATFORM_HOST);
    headers.set("X-Forwarded-Host", host);
    headers.set("acn-customer-host", host);

    const init = {
      method: request.method,
      headers,
      redirect: "follow",
      cf: { resolveOverride: RAILWAY_HOST }
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    return fetch(upstreamUrl.toString(), init);
  }
};
