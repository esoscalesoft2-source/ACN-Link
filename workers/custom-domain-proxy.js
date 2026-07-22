/**
 * ACN Link — customer Cloudflare Worker for custom domains on Railway.
 *
 * Deploy in the customer's Cloudflare zone (e.g. ezysellonline.com).
 * Routes (add all that apply):
 *   yourdomain.com/*
 *   www.yourdomain.com/*
 *   *.yourdomain.com/*          ← subdomains (king.ezysellonline.com, etc.)
 *
 * Forwards traffic to the ACN Link platform host and preserves the customer
 * hostname so ACN can resolve the correct bio page.
 *
 * LEGACY / optional: production SaaS path uses Cloudflare for SaaS + a one-time
 * Origin Rule on mindflo.today (Host rewrite). Do NOT add per-customer Worker
 * routes for normal ACN Link customers.
 *
 * Keep this Worker only for special zones that cannot use Cloudflare for SaaS.
 */
const PLATFORM_HOST = "acnlink.mindflo.today";

export default {
  async fetch(request) {
    const customerHost = new URL(request.url).hostname.toLowerCase();
    const upstreamUrl = new URL(request.url);
    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = PLATFORM_HOST;

    const headers = new Headers(request.headers);
    headers.set("Host", PLATFORM_HOST);
    headers.set("X-Forwarded-Host", customerHost);
    headers.set("acn-customer-host", customerHost);

    const init = {
      method: request.method,
      headers,
      redirect: "follow"
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    return fetch(upstreamUrl.toString(), init);
  }
};
