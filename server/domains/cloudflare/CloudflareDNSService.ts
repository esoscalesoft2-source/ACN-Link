/**
 * CloudflareDNSService — create/update DNS in the CUSTOMER zone using THEIR token.
 */
import { getDnsZoneDomain, normalizeHostname } from "../hostname";
import { buildDnsRecordSet, type DnsRecordInstruction } from "../dnsRecords";
import { provisionCloudflareDnsRecords } from "../cloudflareDns";
import { findZoneForHostname } from "./CloudflareZoneService";

export type ProvisionCustomerDnsResult = {
  success: boolean;
  message: string;
  changes: number;
  zoneId?: string;
  zoneName?: string;
  code?:
    | "NO_TOKEN"
    | "NO_ZONE"
    | "PERMISSION_DENIED"
    | "RATE_LIMIT"
    | "DNS_FAILED"
    | "OK";
};

/**
 * Proxy (orange cloud): default OFF for CF-for-SaaS reliability.
 * Set CLOUDFLARE_CUSTOMER_CNAME_PROXIED=true only if your edge design requires it.
 */
export function customerDnsProxiedPreferred(): boolean {
  return process.env.CLOUDFLARE_CUSTOMER_CNAME_PROXIED === "true";
}

export async function provisionCustomerDns(input: {
  apiToken: string;
  domainName: string;
  records?: DnsRecordInstruction[];
}): Promise<ProvisionCustomerDnsResult> {
  const token = input.apiToken.trim();
  if (!token) {
    return {
      success: false,
      message: "Connect Cloudflare to continue automatic DNS setup.",
      changes: 0,
      code: "NO_TOKEN"
    };
  }

  const host = normalizeHostname(input.domainName);
  const zoneDomain = getDnsZoneDomain(host);

  try {
    const zone = await findZoneForHostname(token, host);
    if (!zone) {
      return {
        success: false,
        message: `No matching Cloudflare zone found for ${zoneDomain}. Add this domain to your Cloudflare account, then reconnect.`,
        changes: 0,
        code: "NO_ZONE"
      };
    }

    const records = input.records || buildDnsRecordSet(host).records;
    const result = await provisionCloudflareDnsRecords(token, host, records);
    return {
      success: result.success,
      message: result.message,
      changes: result.changes,
      zoneId: zone.id,
      zoneName: zone.name,
      code: result.success ? "OK" : "DNS_FAILED"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    let code: ProvisionCustomerDnsResult["code"] = "DNS_FAILED";
    if (/authenticat|authoriz|permission|forbidden|401|403/.test(lower)) code = "PERMISSION_DENIED";
    if (/rate limit|429/.test(lower)) code = "RATE_LIMIT";
    if (/zone not found|no matching/.test(lower)) code = "NO_ZONE";
    return { success: false, message, changes: 0, code };
  }
}
