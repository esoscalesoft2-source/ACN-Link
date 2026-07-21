type CloudflareResult<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
};

export type ProviderHostname = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  ownershipVerification: Record<string, unknown> | null;
  ownershipVerificationHttp: Record<string, unknown> | null;
  raw: Record<string, unknown>;
};

type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  ssl?: {
    status?: string;
    validation_errors?: Array<{ message?: string }>;
  };
  ownership_verification?: Record<string, unknown>;
  ownership_verification_http?: Record<string, unknown>;
  [key: string]: unknown;
};

function config() {
  return {
    token: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
    zoneId: process.env.CLOUDFLARE_ZONE_ID?.trim() || "",
    apiBase: (process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4").replace(/\/$/, "")
  };
}

export function isCloudflareForSaasConfigured() {
  const { token, zoneId } = config();
  return Boolean(token && zoneId);
}

/**
 * When true, Connect/Test Connection registers hostnames on mindflo.today
 * (Cloudflare for SaaS). That sends Host: customer-domain to Railway.
 *
 * Railway free plans only accept acnlink.mindflo.today → "train not arrived" 404
 * unless each hostname is also added on Railway (plan limit).
 *
 * Default OFF: rely on customer-zone Worker (Host rewrite) + live /api/health.
 * Set CLOUDFLARE_REGISTER_CUSTOM_HOSTNAMES=true only if origin accepts any Host.
 */
export function shouldRegisterCloudflareCustomHostnames() {
  if (!isCloudflareForSaasConfigured()) return false;
  const flag = (process.env.CLOUDFLARE_REGISTER_CUSTOM_HOSTNAMES || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function normalizeResult(item: CloudflareCustomHostname): ProviderHostname {
  return {
    id: item.id,
    hostname: item.hostname,
    status: item.status || "pending",
    sslStatus: item.ssl?.status || "pending",
    ownershipVerification: item.ownership_verification || null,
    ownershipVerificationHttp: item.ownership_verification_http || null,
    raw: item
  };
}

async function cloudflareRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token, zoneId, apiBase } = config();
  if (!token || !zoneId) {
    throw new Error(
      "Cloudflare for SaaS is not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID."
    );
  }

  const response = await fetch(`${apiBase}/zones/${zoneId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const body = (await response.json().catch(() => null)) as CloudflareResult<T> | null;
  const method = (init.method || "GET").toUpperCase();
  const resultOk =
    method === "DELETE" ? body?.success === true : body?.success === true && body.result !== undefined;

  if (!response.ok || !resultOk) {
    const message =
      body?.errors?.map((error) => error.message || `Cloudflare error ${error.code}`).join("; ") ||
      `Cloudflare request failed (${response.status})`;
    throw new Error(message);
  }
  return body!.result as T;
}

export async function registerCustomHostname(hostname: string): Promise<ProviderHostname> {
  const result = await cloudflareRequest<CloudflareCustomHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: process.env.CLOUDFLARE_SSL_VALIDATION_METHOD || "http",
        type: "dv",
        settings: {
          min_tls_version: "1.2"
        }
      }
    })
  });
  return normalizeResult(result);
}

export async function getCustomHostname(providerId: string): Promise<ProviderHostname> {
  const result = await cloudflareRequest<CloudflareCustomHostname>(
    `/custom_hostnames/${encodeURIComponent(providerId)}`
  );
  return normalizeResult(result);
}

export async function deleteCustomHostname(providerId: string): Promise<void> {
  const { token, zoneId, apiBase } = config();
  if (!token || !zoneId) return;

  const response = await fetch(
    `${apiBase}/zones/${zoneId}/custom_hostnames/${encodeURIComponent(providerId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
  const body = (await response.json().catch(() => null)) as CloudflareResult<unknown> | null;

  if (response.ok && body?.success) return;

  const message =
    body?.errors?.map((error) => error.message || `Cloudflare error ${error.code}`).join("; ") ||
    `Cloudflare request failed (${response.status})`;
  const notFound =
    response.status === 404 ||
    /not found|does not exist|already deleted|invalid identifier/i.test(message);

  if (notFound) return;

  throw new Error(message);
}

type CloudflareHostnameList = {
  result?: CloudflareCustomHostname[];
};

/** Best-effort cleanup for apex + www when removing a connected domain. */
export async function deleteCustomHostnamesForDomain(
  domainName: string,
  providerHostnameId?: string | null
): Promise<void> {
  if (!isCloudflareForSaasConfigured()) return;

  const normalized = domainName.trim().toLowerCase();
  const hostnames = [normalized];

  if (providerHostnameId) {
    try {
      await deleteCustomHostname(providerHostnameId);
    } catch (error) {
      console.warn(`[cloudflare] Could not delete hostname id ${providerHostnameId}:`, error);
    }
  }

  const { token, zoneId, apiBase } = config();
  for (const hostname of hostnames) {
    try {
      const response = await fetch(
        `${apiBase}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      const body = (await response.json().catch(() => null)) as CloudflareHostnameList | null;
      const matches = body?.result || [];
      for (const item of matches) {
        if (item?.id) {
          await deleteCustomHostname(item.id);
        }
      }
    } catch (error) {
      console.warn(`[cloudflare] Could not delete hostname ${hostname}:`, error);
    }
  }
}

/** Register apex custom hostname for root domains (Cloudflare for SaaS). */
export async function registerRootDomainHostnames(apexHostname: string): Promise<{
  apex: ProviderHostname;
  www: ProviderHostname | null;
}> {
  const apex = await registerCustomHostname(apexHostname);
  return { apex, www: null };
}
