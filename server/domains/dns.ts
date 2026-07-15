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
  let verified = cnameMatches || addressMatches;
  let message = verified
    ? "DNS points to ACN Link."
    : `Create a CNAME record pointing ${host} to ${expectedTarget}.`;

  // Orange-cloud (proxied) CNAMEs often expose only Cloudflare edge IPs, so
  // resolveCname/resolve4 checks fail even when the customer hostname reaches us.
  if (!verified) {
    const reachable = await verifyHostnameReachability(host, expectedTarget);
    if (reachable) {
      verified = true;
      message =
        "DNS points to ACN Link (live check passed; Cloudflare proxy hides the CNAME from public DNS lookups).";
    }
  }

  return {
    verified,
    expectedTarget,
    cnames,
    addresses,
    txtRecords,
    checkedAt: new Date().toISOString(),
    message
  };
}

async function verifyHostnameReachability(hostname: string, expectedTarget: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(`https://${hostname}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timeout);
    if (!response.ok) return false;

    const data = (await response.json().catch(() => null)) as {
      status?: string;
      customDomains?: { cnameTarget?: string };
    } | null;
    if (data?.status !== "ok") return false;

    const reportedTarget = normalizeHostname(data.customDomains?.cnameTarget || "");
    const expected = normalizeHostname(expectedTarget);
    return reportedTarget === expected;
  } catch {
    return false;
  }
}
