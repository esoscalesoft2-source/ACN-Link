import { resolve4, resolve6, resolveCname, resolveTxt } from "node:dns/promises";

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.$/, "");
}

async function safeResolve<T>(resolver: () => Promise<T>): Promise<T | null> {
  try {
    return await resolver();
  } catch {
    return null;
  }
}

export type DnsVerification = {
  verified: boolean;
  expectedTarget: string;
  cnames: string[];
  addresses: string[];
  txtRecords: string[];
  checkedAt: string;
  message: string;
};

/**
 * Proves DNS control by requiring the customer hostname to point to the
 * configured ACN Link SaaS target. For apex domains, matching A/AAAA records
 * are accepted when both names resolve to at least one common address.
 */
export async function verifyDomainDns(hostname: string): Promise<DnsVerification> {
  const host = normalizeHostname(hostname);
  const expectedTarget = normalizeHostname(
    process.env.CUSTOM_DOMAIN_CNAME_TARGET || "domains.acnlink.mindflo.today"
  );

  const [cnamesRaw, hostV4, hostV6, targetV4, targetV6, txtRaw] = await Promise.all([
    safeResolve(() => resolveCname(host)),
    safeResolve(() => resolve4(host)),
    safeResolve(() => resolve6(host)),
    safeResolve(() => resolve4(expectedTarget)),
    safeResolve(() => resolve6(expectedTarget)),
    safeResolve(() => resolveTxt(`_acnlink-verify.${host}`))
  ]);

  const cnames = (cnamesRaw || []).map(normalizeHostname);
  const addresses = [...(hostV4 || []), ...(hostV6 || [])];
  const targetAddresses = new Set([...(targetV4 || []), ...(targetV6 || [])]);
  const txtRecords = (txtRaw || []).map((parts) => parts.join(""));

  const cnameMatches = cnames.some(
    (name) => name === expectedTarget || name.endsWith(`.${expectedTarget}`)
  );
  const addressMatches =
    addresses.length > 0 && addresses.some((address) => targetAddresses.has(address));
  const verified = cnameMatches || addressMatches;

  return {
    verified,
    expectedTarget,
    cnames,
    addresses,
    txtRecords,
    checkedAt: new Date().toISOString(),
    message: verified
      ? "DNS points to ACN Link."
      : `Create a CNAME record pointing ${host} to ${expectedTarget}.`
  };
}
