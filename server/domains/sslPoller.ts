import { getCustomHostname, isCloudflareForSaasConfigured, type ProviderHostname } from "./cloudflare";
import { domainServesAcnBio, verifyDomainDns } from "./dns";
import {
  appendDomainVerificationLog,
  listDomainsForSslPolling,
  updateDomainById,
  type CustomDomainRecord,
  type DomainStatus
} from "./repository";

function providerPatch(provider: ProviderHostname) {
  return {
    provider_status: provider.status,
    ssl_status: provider.sslStatus,
    ownership_verification:
      provider.ownershipVerification || provider.ownershipVerificationHttp || null,
    error_message: null
  };
}

async function resolveStatus(
  record: CustomDomainRecord,
  dnsVerified: boolean,
  _provider?: ProviderHostname
): Promise<DomainStatus> {
  if (!dnsVerified) return "Pending DNS";
  // Verified only when the hostname actually serves ACN (not merely Cloudflare SaaS "active").
  if (await domainServesAcnBio(record.domainName)) return "Verified";
  return "DNS Verified";
}

async function refreshDomain(record: CustomDomainRecord): Promise<boolean> {
  const dns = await verifyDomainDns(record.domainName);
  let dnsVerified = dns.verified || Boolean(record.dnsVerifiedAt);

  let providerState: ProviderHostname | undefined;
  if (isCloudflareForSaasConfigured() && record.providerHostnameId) {
    try {
      providerState = await getCustomHostname(record.providerHostnameId);
    } catch (error) {
      console.warn(`[ssl-poller] Cloudflare status failed for ${record.domainName}:`, error);
    }
  }

  const nextStatus = await resolveStatus(record, dnsVerified, providerState);
  const changed =
    nextStatus !== record.status ||
    providerState?.sslStatus !== record.sslStatus ||
    providerState?.status !== record.providerStatus;

  if (!changed && nextStatus === record.status) return false;

  await updateDomainById(record.id, {
    status: nextStatus,
    dns_verified_at: dnsVerified ? record.dnsVerifiedAt || dns.checkedAt : null,
    last_checked_at: new Date().toISOString(),
    ...(providerState ? providerPatch(providerState) : {}),
    error_message: !dnsVerified ? dns.message : null
  });

  await appendDomainVerificationLog({
    domainId: record.id,
    ownerUserId: record.ownerUserId,
    event: "ssl_poll",
    status: nextStatus,
    message: dns.message,
    metadata: {
      sslStatus: providerState?.sslStatus || record.sslStatus,
      providerStatus: providerState?.status || record.providerStatus
    }
  });

  if (nextStatus === "Verified" && record.status !== "Verified") {
    console.log(`[ssl-poller] ${record.domainName} is now Verified`);
  }

  return true;
}

let pollRunning = false;

export async function pollPendingSslDomains(): Promise<{ checked: number; updated: number }> {
  if (pollRunning) return { checked: 0, updated: 0 };
  pollRunning = true;
  let checked = 0;
  let updated = 0;

  try {
    const domains = await listDomainsForSslPolling();
    for (const domain of domains) {
      checked += 1;
      try {
        const didUpdate = await refreshDomain(domain);
        if (didUpdate) updated += 1;
      } catch (error) {
        console.warn(`[ssl-poller] Failed for ${domain.domainName}:`, error);
      }
    }
  } finally {
    pollRunning = false;
  }

  return { checked, updated };
}

const POLL_INTERVAL_MS = Number(process.env.DOMAIN_SSL_POLL_MS) || 2 * 60 * 1000;

export function startSslPollingLoop() {
  if (process.env.DISABLE_DOMAIN_SSL_POLL === "true") {
    console.log("[ssl-poller] Disabled via DISABLE_DOMAIN_SSL_POLL");
    return;
  }

  const tick = () => {
    void pollPendingSslDomains().then(({ checked, updated }) => {
      if (updated > 0) {
        console.log(`[ssl-poller] Updated ${updated}/${checked} domain(s)`);
      }
    });
  };

  setTimeout(tick, 15_000);
  setInterval(tick, POLL_INTERVAL_MS);
  console.log(`[ssl-poller] Started (every ${Math.round(POLL_INTERVAL_MS / 1000)}s)`);
}
