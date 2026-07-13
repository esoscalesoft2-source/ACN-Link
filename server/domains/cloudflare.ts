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
  if (!response.ok || !body?.success || body.result === undefined) {
    const message =
      body?.errors?.map((error) => error.message || `Cloudflare error ${error.code}`).join("; ") ||
      `Cloudflare request failed (${response.status})`;
    throw new Error(message);
  }
  return body.result;
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
  await cloudflareRequest<Record<string, never>>(
    `/custom_hostnames/${encodeURIComponent(providerId)}`,
    { method: "DELETE" }
  );
}
