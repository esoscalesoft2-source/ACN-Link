/**
 * CloudflareVerificationService — user-facing verify helpers after DNS write.
 */
import { verifyDomainDns, domainServesAcnBio } from "../dns";

export type DomainVerifySnapshot = {
  dnsVerified: boolean;
  dnsMessage: string;
  servesAcn: boolean;
  statusHint: "pending_dns" | "dns_ok" | "live" | "ssl_pending";
};

export async function snapshotDomainVerification(hostname: string): Promise<DomainVerifySnapshot> {
  const dns = await verifyDomainDns(hostname);
  const servesAcn = dns.verified ? await domainServesAcnBio(hostname) : false;

  let statusHint: DomainVerifySnapshot["statusHint"] = "pending_dns";
  if (servesAcn) statusHint = "live";
  else if (dns.verified) statusHint = "dns_ok";

  return {
    dnsVerified: dns.verified,
    dnsMessage: dns.message,
    servesAcn,
    statusHint
  };
}
