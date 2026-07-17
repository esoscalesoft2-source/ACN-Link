import { isCloudflareForSaasConfigured } from "./cloudflare";

export function getCustomDomainPlatformConfig() {
  const saasConfigured = isCloudflareForSaasConfigured();
  const cnameTarget =
    process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || "acnlink.mindflo.today";

  return {
    provider: saasConfigured ? ("cloudflare" as const) : ("manual" as const),
    cnameTarget,
    selfServeEnabled: saasConfigured,
    sslAutomatic: saasConfigured,
    workerRequired: !saasConfigured,
    cloudflareEnvConfigured: saasConfigured,
    steps: saasConfigured
      ? [
          "Connect your hostname in ACN Link and pick the published page.",
          `At your DNS provider, create a CNAME: your subdomain → ${cnameTarget}.`,
          "Return here and click Check DNS and SSL. HTTPS is issued automatically."
        ]
      : [
          "Connect your hostname in ACN Link and pick the published page.",
          `At your DNS provider, create a CNAME: your subdomain → ${cnameTarget}.`,
          "Click Check DNS and SSL after DNS propagates.",
          "Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN on Railway for automatic SSL for all users."
        ]
  };
}
