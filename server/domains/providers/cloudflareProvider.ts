import { isCloudflareOAuthConfigured } from "../cloudflare/CloudflareOAuthService";
import { provisionCustomerDns } from "../cloudflare/CloudflareDNSService";
import { resolveCustomerDnsTokens } from "../cloudflare/CloudflareTokenService";
import type { DnsProviderAdapter, ProvisionDnsInput, ProvisionDnsResult } from "./types";

export const cloudflareProvider: DnsProviderAdapter = {
  capability: {
    id: "cloudflare",
    name: "Cloudflare",
    supportsAutoDns: true,
    supportsOAuth: isCloudflareOAuthConfigured(),
    logoUrl: "/dns-providers/cloudflare.svg",
    helpUrl: "https://developers.cloudflare.com/fundamentals/oauth/",
    blurb: "One click — authorize YOUR Cloudflare account and we add DNS for you."
  },

  async provisionDns(input: ProvisionDnsInput): Promise<ProvisionDnsResult> {
    const ownerUserId = input.ownerUserId || "";
    const { tokens, source } = await resolveCustomerDnsTokens({
      ownerUserId,
      preferredToken: input.accessToken
    });

    if (!tokens.length) {
      return {
        success: false,
        message:
          "Connect your Cloudflare account so ACN Link can add DNS automatically. Or use the manual DNS steps below.",
        needsOAuth: isCloudflareOAuthConfigured()
      };
    }

    let lastError = "Could not update DNS automatically.";
    let lastCode: string | undefined;
    for (const token of tokens) {
      const result = await provisionCustomerDns({
        apiToken: token,
        domainName: input.domainName,
        records: input.records
      });
      if (result.success) {
        return {
          success: true,
          message:
            source === "customer"
              ? result.message
              : `${result.message} (token source: ${source})`,
          providerAccountId: result.zoneId || null
        };
      }
      lastError = result.message;
      lastCode = result.code;
    }

    const needsOAuth =
      isCloudflareOAuthConfigured() &&
      (lastCode === "NO_TOKEN" ||
        lastCode === "PERMISSION_DENIED" ||
        lastCode === "NO_ZONE" ||
        source === "none");

    return {
      success: false,
      message:
        lastCode === "NO_ZONE"
          ? `${lastError} Make sure you approved the Cloudflare account that owns this domain.`
          : lastError,
      providerAccountId: null,
      needsOAuth
    };
  }
};
