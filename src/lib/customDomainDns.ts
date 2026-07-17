/** First DNS label for typical subdomains (links.example.com → links). */
export function getDnsHostLabel(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return "@";
  return labels[0];
}

export function getDnsRootDomain(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  return labels.slice(1).join(".");
}

export interface DnsRecordInstructions {
  type: "CNAME";
  hostLabel: string;
  hostDisplay: string;
  pointsTo: string;
  fullHostname: string;
}

export function buildDnsInstructions(
  domainName: string,
  dnsTarget: string
): DnsRecordInstructions {
  const hostLabel = getDnsHostLabel(domainName);
  return {
    type: "CNAME",
    hostLabel,
    hostDisplay: hostLabel === "@" ? "@ (root / apex)" : hostLabel,
    pointsTo: dnsTarget,
    fullHostname: domainName.trim().toLowerCase()
  };
}
