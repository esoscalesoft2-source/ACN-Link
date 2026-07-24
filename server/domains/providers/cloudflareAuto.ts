import { getDnsProviderConnection } from "./connections";
import {
  createCloudflareOAuthAuthorizeUrl,
  isCloudflareOAuthConfigured
} from "../cloudflare/CloudflareOAuthService";
import { findZoneForHostname } from "../cloudflare/CloudflareZoneService";
import { getDnsZoneDomain, normalizeHostname } from "../hostname";

export type CloudflareBeginResult =
  | { mode: "ready"; reason: "zone_in_linked_account"; zoneName: string }
  | {
      mode: "oauth";
      authorizeUrl: string;
      /** True when a linked CF account exists but does not contain this domain's zone. */
      accountMismatch?: boolean;
      message?: string;
    }
  | { mode: "manual"; message: string };

/**
 * Multi-tenant Cloudflare begin:
 * - Linked token + zone exists in that account → ready (reuse; no login again)
 * - Linked token + zone NOT in that account → OAuth with prompt=login + mismatch message
 * - No token → OAuth Sign in / Authorize
 */
export async function beginCloudflareAutoSetup(input: {
  ownerUserId: string;
  domainName: string;
  pageId: string;
}): Promise<CloudflareBeginResult> {
  const hostname = normalizeHostname(input.domainName);
  const zoneHint = getDnsZoneDomain(hostname) || hostname;

  try {
    const saved = await getDnsProviderConnection(input.ownerUserId, "cloudflare");
    if (saved?.accessToken) {
      try {
        const zone = await findZoneForHostname(saved.accessToken, hostname);
        if (zone?.id) {
          return {
            mode: "ready",
            reason: "zone_in_linked_account",
            zoneName: zone.name || zoneHint
          };
        }

        // Token works, but this root is not in that Cloudflare account (e.g. acncart.in
        // while linked account only has acnfashionshop.com, …).
        if (isCloudflareOAuthConfigured()) {
          const { authorizeUrl } = await createCloudflareOAuthAuthorizeUrl({
            userId: input.ownerUserId,
            domainName: hostname,
            pageId: input.pageId
          });
          return {
            mode: "oauth",
            authorizeUrl,
            accountMismatch: true,
            message:
              `${zoneHint} is not in the Cloudflare account currently linked to ACN Link. ` +
              `Sign in with the Cloudflare account that owns ${zoneHint} ` +
              `(if the next screen shows a different email, click Edit and switch accounts).`
          };
        }
      } catch (zoneError) {
        console.warn("[cloudflare-auto] zone check failed, falling back to OAuth:", zoneError);
      }
    }

    if (isCloudflareOAuthConfigured()) {
      const { authorizeUrl } = await createCloudflareOAuthAuthorizeUrl({
        userId: input.ownerUserId,
        domainName: hostname,
        pageId: input.pageId
      });
      return { mode: "oauth", authorizeUrl };
    }

    return {
      mode: "manual",
      message:
        "Cloudflare one-click is not configured on the server yet (missing OAuth app). Choose Manual to add the DNS record yourself."
    };
  } catch (error) {
    console.warn("[cloudflare-auto] begin failed:", error);
    if (isCloudflareOAuthConfigured()) {
      try {
        const { authorizeUrl } = await createCloudflareOAuthAuthorizeUrl({
          userId: input.ownerUserId,
          domainName: hostname,
          pageId: input.pageId
        });
        return { mode: "oauth", authorizeUrl };
      } catch {
        /* fall through */
      }
    }
    return {
      mode: "manual",
      message:
        "Could not start Cloudflare connect. Go back and choose Manual to add the DNS record yourself."
    };
  }
}
