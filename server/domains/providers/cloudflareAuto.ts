import {
  createCloudflareOAuthAuthorizeUrl,
  isCloudflareOAuthConfigured
} from "../cloudflare/CloudflareOAuthService";

export type CloudflareBeginResult =
  | { mode: "oauth"; authorizeUrl: string }
  | { mode: "manual"; message: string };

/**
 * Multi-tenant: every Connect Domain → Cloudflare requires a fresh OAuth approve.
 * Do not return "ready" from a saved token — that confused users with a global
 * "Cloudflare Connected" state.
 */
export async function beginCloudflareAutoSetup(input: {
  ownerUserId: string;
  domainName: string;
  pageId: string;
}): Promise<CloudflareBeginResult> {
  try {
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
        "Cloudflare one-click is not configured on the server yet (missing OAuth app). Choose Manual to add the DNS record yourself."
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
        "Could not start Cloudflare connect. Go back and choose Manual to add the DNS record yourself."
    };
  }
}
