import { resolve4, resolve6, resolveNs, resolveCname } from "node:dns/promises";
import https from "node:https";
import {
  getCustomDomainKind,
  getDnsZoneDomain,
  getSubdomainHostLabel,
  normalizeHostname,
  resolveCnameTarget
} from "./hostname";

async function safeResolve<T>(resolver: () => Promise<T>): Promise<T | null> {
  try {
    return await resolver();
  } catch {
    return null;
  }
}

const NS_SUFFIX_TO_PROVIDER: { suffix: string; id: string; name: string }[] = [
  { suffix: "domaincontrol.com", id: "godaddy", name: "GoDaddy" },
  { suffix: "godaddy.com", id: "godaddy", name: "GoDaddy" },
  { suffix: "registrar-servers.com", id: "namecheap", name: "Namecheap" },
  { suffix: "namecheap.com", id: "namecheap", name: "Namecheap" },
  { suffix: "cloudflare.com", id: "cloudflare", name: "Cloudflare" },
  { suffix: "hostinger.com", id: "hostinger", name: "Hostinger" },
  { suffix: "hostinger.net", id: "hostinger", name: "Hostinger" },
  { suffix: "porkbun.com", id: "porkbun", name: "Porkbun" },
  { suffix: "dynadot.com", id: "dynadot", name: "Dynadot" },
  { suffix: "name.com", id: "namecom", name: "Name.com" },
  { suffix: "bluehost.com", id: "bluehost", name: "Bluehost" },
  { suffix: "siteground.net", id: "siteground", name: "SiteGround" },
  { suffix: "siteground.com", id: "siteground", name: "SiteGround" },
  { suffix: "hostgator.com", id: "hostgator", name: "HostGator" },
  { suffix: "wixdns.net", id: "wix", name: "Wix" },
  { suffix: "squarespace.com", id: "squarespace", name: "Squarespace" },
  { suffix: "google.com", id: "google", name: "Google Domains" },
  { suffix: "googledomains.com", id: "google", name: "Google Domains" },
  { suffix: "awsdns", id: "route53", name: "Amazon Route 53" },
  { suffix: "ionos.com", id: "ionos", name: "IONOS" },
  { suffix: "1and1.com", id: "ionos", name: "IONOS" }
];

function matchProvider(nameservers: string[]) {
  for (const nameserver of nameservers) {
    const lowered = nameserver.toLowerCase().replace(/\.$/, "");
    for (const entry of NS_SUFFIX_TO_PROVIDER) {
      if (lowered === entry.suffix || lowered.endsWith(`.${entry.suffix}`) || lowered.includes(entry.suffix)) {
        return entry;
      }
    }
  }
  return null;
}

const REGISTRAR_LABEL_HINTS: { pattern: RegExp; id: string; name: string }[] = [
  { pattern: /godaddy/i, id: "godaddy", name: "GoDaddy" },
  { pattern: /namecheap/i, id: "namecheap", name: "Namecheap" },
  { pattern: /cloudflare/i, id: "cloudflare", name: "Cloudflare" },
  { pattern: /hostinger/i, id: "hostinger", name: "Hostinger" },
  { pattern: /porkbun/i, id: "porkbun", name: "Porkbun" },
  { pattern: /dynadot/i, id: "dynadot", name: "Dynadot" },
  { pattern: /name\.com/i, id: "namecom", name: "Name.com" },
  { pattern: /bluehost/i, id: "bluehost", name: "Bluehost" },
  { pattern: /siteground/i, id: "siteground", name: "SiteGround" },
  { pattern: /hostgator/i, id: "hostgator", name: "HostGator" },
  { pattern: /wix/i, id: "wix", name: "Wix" },
  { pattern: /squarespace/i, id: "squarespace", name: "Squarespace" },
  { pattern: /google/i, id: "google", name: "Google Domains" },
  { pattern: /amazon|route\s*53|aws/i, id: "route53", name: "Amazon Route 53" },
  { pattern: /ionos|1&1|1and1/i, id: "ionos", name: "IONOS" }
];

function matchRegistrarLabel(label: string) {
  for (const hint of REGISTRAR_LABEL_HINTS) {
    if (hint.pattern.test(label)) return hint;
  }
  return null;
}

function titleCase(value: string) {
  return value
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferFromNameserver(nameserver: string) {
  const lowered = nameserver.toLowerCase().replace(/\.$/, "");
  const parts = lowered.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const root = parts.slice(-2).join(".");
  const direct = NS_SUFFIX_TO_PROVIDER.find((entry) => entry.suffix === root || lowered.includes(entry.suffix));
  if (direct) return direct;
  const labelMatch = matchRegistrarLabel(root);
  if (labelMatch) return labelMatch;
  const brand = titleCase(parts[parts.length - 2]);
  if (brand.length >= 3) return { suffix: root, id: root.replace(/\./g, "-"), name: brand };
  return null;
}

async function fetchRdap(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/rdap+json, application/json" } });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function detectViaRdap(domainName: string) {
  const tld = domainName.split(".").pop() || "com";
  const urls = [
    `https://rdap.org/domain/${encodeURIComponent(domainName)}`,
    `https://rdap.verisign.com/${tld}/v1/domain/${encodeURIComponent(domainName)}`
  ];

  for (const url of urls) {
    const data = await fetchRdap(url);
    if (!data) continue;
    const entities = Array.isArray(data.entities) ? data.entities : [];
    for (const entity of entities) {
      if (!entity || typeof entity !== "object") continue;
      const roles = (entity as { roles?: string[] }).roles;
      if (!roles?.includes("registrar")) continue;
      const vcard = (entity as { vcardArray?: unknown[] }).vcardArray?.[1];
      if (!Array.isArray(vcard)) continue;
      for (const row of vcard) {
        if (!Array.isArray(row) || row[0] !== "fn") continue;
        const match = matchRegistrarLabel(String(row[3] || ""));
        if (match) return match;
      }
    }
  }
  return null;
}

async function resolveNsViaDoh(domainName: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domainName)}&type=NS`,
      { headers: { Accept: "application/dns-json" } }
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { Answer?: { type: number; data: string }[] };
    return (data.Answer || [])
      .filter((answer) => answer.type === 2)
      .map((answer) => answer.data.replace(/\.$/, "").toLowerCase());
  } catch {
    return [];
  }
}

export type DnsProviderDetection = {
  domainName: string;
  providerId: string;
  providerName: string;
  nameservers: string[];
};

export async function detectDnsProvider(hostname: string): Promise<DnsProviderDetection> {
  const domainName = normalizeHostname(hostname);
  const zoneDomain = getDnsZoneDomain(domainName);
  let nameservers = (await safeResolve(() => resolveNs(zoneDomain))) || [];
  if (nameservers.length === 0) {
    nameservers = await resolveNsViaDoh(zoneDomain);
  }
  nameservers = nameservers.map((item) => item.toLowerCase().replace(/\.$/, ""));

  const match = matchProvider(nameservers);
  if (match) {
    return { domainName, providerId: match.id, providerName: match.name, nameservers };
  }

  const rdapMatch = await detectViaRdap(zoneDomain);
  if (rdapMatch) {
    return { domainName, providerId: rdapMatch.id, providerName: rdapMatch.name, nameservers };
  }

  if (nameservers.length > 0) {
    const inferred = inferFromNameserver(nameservers[0]);
    if (inferred) {
      return { domainName, providerId: inferred.id, providerName: inferred.name, nameservers };
    }
  }

  return {
    domainName,
    providerId: "unknown",
    providerName: "DNS Provider",
    nameservers
  };
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

function normalizeDnsTarget(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function cnameMatchesTarget(cnames: string[], expectedHost: string): boolean {
  const expected = normalizeDnsTarget(expectedHost);
  return cnames.some((entry) => {
    const normalized = normalizeDnsTarget(entry);
    return normalized === expected || normalized.endsWith(`.${expected}`);
  });
}

/**
 * Root domains: A records for @ and www.
 * Subdomains: CNAME to platform hostname or A record to platform IP.
 */
export async function verifyDomainDns(hostname: string): Promise<DnsVerification> {
  const host = normalizeHostname(hostname);
  const expectedARecord =
    process.env.CUSTOM_DOMAIN_A_TARGET?.trim() || "76.76.21.21";
  const expectedCname = resolveCnameTarget();
  const kind = getCustomDomainKind(host);

  if (!kind) {
    return {
      verified: false,
      expectedTarget: expectedARecord,
      cnames: [],
      addresses: [],
      txtRecords: [],
      checkedAt: new Date().toISOString(),
      message: "Enter a valid domain or subdomain, for example yourbrand.com or studio.yourbrand.com."
    };
  }

  if (kind === "subdomain") {
    const [cnames, v4, v6, aTargetV4] = await Promise.all([
      safeResolve(() => resolveCname(host)),
      safeResolve(() => resolve4(host)),
      safeResolve(() => resolve6(host)),
      safeResolve(() => resolve4(expectedARecord))
    ]);

    const resolvedCnames = cnames || [];
    const addresses = [...(v4 || []), ...(v6 || [])];
    const aRecordAddresses = new Set<string>([
      ...(aTargetV4 || []),
      ...(expectedARecord.match(/^\d+\.\d+\.\d+\.\d+$/) ? [expectedARecord] : [])
    ]);
    const cnameOk = cnameMatchesTarget(resolvedCnames, expectedCname);
    const aOk = addresses.some((address) => aRecordAddresses.has(address));
    let verified = cnameOk || aOk;
    const hostLabel = getSubdomainHostLabel(host);
    let message = verified
      ? "DNS points to ACN Link."
      : `Add a CNAME record at your DNS provider: Host ${hostLabel} → ${expectedCname}. You can also use an A record → ${expectedARecord}.`;

    if (!verified) {
      verified = await verifyHostnameReachability(host);
      if (verified) {
        message = "DNS points to ACN Link (live HTTPS check passed).";
      }
    }

    return {
      verified,
      expectedTarget: expectedCname,
      cnames: resolvedCnames,
      addresses,
      txtRecords: [],
      checkedAt: new Date().toISOString(),
      message
    };
  }

  const wwwHost = `www.${host}`;

  const [apexV4, apexV6, wwwV4, wwwV6, aTargetV4] = await Promise.all([
    safeResolve(() => resolve4(host)),
    safeResolve(() => resolve6(host)),
    safeResolve(() => resolve4(wwwHost)),
    safeResolve(() => resolve6(wwwHost)),
    safeResolve(() => resolve4(expectedARecord))
  ]);

  const aRecordAddresses = new Set([
    ...(aTargetV4 || []),
    ...(expectedARecord.match(/^\d+\.\d+\.\d+\.\d+$/) ? [expectedARecord] : [])
  ]);

  const apexAddresses = [...(apexV4 || []), ...(apexV6 || [])];
  const wwwAddresses = [...(wwwV4 || []), ...(wwwV6 || [])];
  const addresses = [...apexAddresses, ...wwwAddresses];

  const apexMatches = apexAddresses.some((address) => aRecordAddresses.has(address));
  const wwwMatches = wwwAddresses.some((address) => aRecordAddresses.has(address));
  let verified = apexMatches || wwwMatches;
  let message = verified
    ? "DNS A records point to ACN Link."
    : `Add A records at your registrar: Host www → ${expectedARecord} and Host @ → ${expectedARecord}.`;

  if (!verified) {
    const reachable =
      (await verifyHostnameReachability(host)) || (await verifyHostnameReachability(wwwHost));
    if (reachable) {
      verified = true;
      message = "DNS points to ACN Link (live HTTPS check passed).";
    }
  }

  return {
    verified,
    expectedTarget: expectedARecord,
    cnames: [],
    addresses,
    txtRecords: [],
    checkedAt: new Date().toISOString(),
    message
  };
}

export async function verifyHostnameReachability(hostname: string): Promise<boolean> {
  if (await fetchHealthJson(hostname)) return true;
  return fetchHealthJsonNode(hostname);
}

async function fetchHealthJson(hostname: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(`https://${hostname}/api/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "ACN-Link-DNS-Verify/1.0"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timeout);
    if (!response.ok) return false;
    const data = (await response.json().catch(() => null)) as { status?: string } | null;
    return data?.status === "ok";
  } catch {
    return false;
  }
}

function fetchHealthJsonNode(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(
      `https://${hostname}/api/health`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ACN-Link-DNS-Verify/1.0"
        },
        timeout: 15_000
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
            resolve(false);
            return;
          }
          try {
            const data = JSON.parse(body) as { status?: string };
            resolve(data.status === "ok");
          } catch {
            resolve(false);
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}
