import { getSupabase } from "../db/supabase";

export type DomainStatus =
  | "Pending DNS"
  | "DNS Verified"
  | "Provisioning SSL"
  | "Verified"
  | "Error";

export type CustomDomainRecord = {
  id: string;
  ownerUserId: string;
  pageId: string;
  domainName: string;
  status: DomainStatus;
  dnsTarget: string;
  dnsVerifiedAt: string | null;
  provider: "cloudflare" | "manual";
  providerHostnameId: string | null;
  providerStatus: string;
  sslStatus: string;
  ownershipVerification: Record<string, unknown> | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type DomainRow = {
  id: string;
  owner_user_id: string;
  page_id: string;
  domain_name: string;
  status: DomainStatus;
  dns_target: string;
  dns_verified_at: string | null;
  provider: "cloudflare" | "manual";
  provider_hostname_id: string | null;
  provider_status: string;
  ssl_status: string;
  ownership_verification: Record<string, unknown> | null;
  last_checked_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function mapRow(row: DomainRow): CustomDomainRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    pageId: row.page_id,
    domainName: row.domain_name,
    status: row.status,
    dnsTarget: row.dns_target,
    dnsVerifiedAt: row.dns_verified_at,
    provider: row.provider,
    providerHostnameId: row.provider_hostname_id,
    providerStatus: row.provider_status,
    sslStatus: row.ssl_status,
    ownershipVerification: row.ownership_verification,
    lastCheckedAt: row.last_checked_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listDomains(ownerUserId: string): Promise<CustomDomainRecord[]> {
  const { data, error } = await db()
    .from("custom_domains")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as DomainRow[]).map(mapRow);
}

export async function findDomainById(
  id: string,
  ownerUserId: string
): Promise<CustomDomainRecord | null> {
  const { data, error } = await db()
    .from("custom_domains")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as DomainRow) : null;
}

/** Hostnames that may serve a published page (full SSL or DNS-only + customer proxy). */
export const ROUTABLE_DOMAIN_STATUSES: DomainStatus[] = ["Verified", "DNS Verified"];

export async function findDomainByHostname(
  hostname: string
): Promise<CustomDomainRecord | null> {
  const { data, error } = await db()
    .from("custom_domains")
    .select("*")
    .eq("domain_name", hostname.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as DomainRow) : null;
}

export async function findRoutableDomainByHostname(
  hostname: string
): Promise<CustomDomainRecord | null> {
  const { data, error } = await db()
    .from("custom_domains")
    .select("*")
    .eq("domain_name", hostname.toLowerCase())
    .in("status", ROUTABLE_DOMAIN_STATUSES)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapRow(data as DomainRow);

  // Keep serving after a successful verify even if status was reset to Pending DNS.
  const { data: fallback, error: fallbackError } = await db()
    .from("custom_domains")
    .select("*")
    .eq("domain_name", hostname.toLowerCase())
    .not("dns_verified_at", "is", null)
    .maybeSingle();
  if (fallbackError) throw new Error(fallbackError.message);
  if (fallback) return mapRow(fallback as DomainRow);

  // Route branded traffic once the customer connected the hostname in ACN Link.
  // DNS/Worker already deliver requests here; verify updates the dashboard status.
  return findDomainByHostname(hostname);
}

/** @deprecated Use findRoutableDomainByHostname */
export const findVerifiedDomainByHostname = findRoutableDomainByHostname;

export async function createDomain(input: {
  id: string;
  ownerUserId: string;
  pageId: string;
  domainName: string;
  dnsTarget: string;
  provider: "cloudflare" | "manual";
}): Promise<CustomDomainRecord> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("custom_domains")
    .insert({
      id: input.id,
      owner_user_id: input.ownerUserId,
      page_id: input.pageId,
      domain_name: input.domainName,
      type: "CNAME",
      target_ip: input.dnsTarget,
      status: "Pending DNS",
      dns_target: input.dnsTarget,
      provider: input.provider,
      provider_status: "pending",
      ssl_status: "pending",
      created_at: now,
      updated_at: now
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as DomainRow);
}

export async function updateDomain(
  id: string,
  ownerUserId: string,
  patch: Record<string, unknown>
): Promise<CustomDomainRecord> {
  const { data, error } = await db()
    .from("custom_domains")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as DomainRow);
}

export async function removeDomain(id: string, ownerUserId: string): Promise<void> {
  const { error } = await db()
    .from("custom_domains")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);
  if (error) throw new Error(error.message);
}
