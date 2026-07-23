import { getDnsProviderConnection } from "./connections";
import {
  createCloudflareOAuthAuthorizeUrl,
  isCloudflareOAuthConfigured
} from "../cloudflare/CloudflareOAuthService";

export type CloudflareBeginResult =
  | { mode: "ready"; reason: "saved_connection" }
  | { mode: "oauth"; authorizeUrl: string }
  | { mode: "manual"; message: string };

/**
 * Multi-tenant: never treat platform Cloudflare account as "ready" for a customer domain.
 * Customer must Connect Cloudflare (OAuth) or use manual DNS.
 */
export async function beginCloudflareAutoSetup(input: {
  ownerUserId: string;
  domainName: string;
  pageId: string;
}): Promise<CloudflareBeginResult> {
  try {
    const saved = await getDnsProviderConnection(input.ownerUserId, "cloudflare");
    if (saved?.connected && saved.accessToken) {
      return { mode: "ready", reason: "saved_connection" };
    }

    if (isCloudflareOAuthConfigured()) {
      const { authorizeUrl } = await createCloudflareOAuthAuthorizeUrl({
        userId: input.ownerUserId,
        domainName: input.domainName,
        pageId: input.pageId
      });
      return { mode: "oauth", authorizeUrl };
    }

    return {
      mode: "manual",
      message:
        "Connect Cloudflare is not configured yet. Add the CNAME yourself (guided steps), or ask your admin to set CLOUDFLARE_OAUTH_CLIENT_ID / SECRET."
    };
  } catch (error) {
    console.warn("[cloudflare-auto] begin failed:", error);
    if (isCloudflareOAuthConfigured()) {
      try {
        const { authorizeUrl } = await createCloudflareOAuthAuthorizeUrl({
          userId: input.ownerUserId,
          domainName: input.domainName,
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
        "Continue with setup — we'll add DNS automatically after you connect Cloudflare, or show simple copy steps."
    };
  }
}
