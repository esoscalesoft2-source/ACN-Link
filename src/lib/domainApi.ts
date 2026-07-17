import type { CustomDomain, CustomDomainPlatformConfig } from "../types";
import { apiUrl } from "./apiBase";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  isPreviewToken,
  refreshSession
} from "./authApi";

export class DomainApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "DOMAIN_REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function domainFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  if (isPreviewToken(token)) {
    throw new DomainApiError(
      "Sign in with a real account to manage custom domains.",
      401,
      "PREVIEW_SESSION"
    );
  }

  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include"
    });
  } catch {
    throw new DomainApiError("Could not reach the domain service.", 0, "NETWORK_ERROR");
  }

  if (response.status === 401 && retry && getRefreshToken()) {
    try {
      await refreshSession();
      return domainFetch<T>(path, init, false);
    } catch {
      clearAuthSession();
    }
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DomainApiError(
      data?.error || "Domain request failed.",
      response.status,
      data?.code || "DOMAIN_REQUEST_FAILED"
    );
  }
  return data as T;
}

export async function fetchCustomDomainPlatformConfig(): Promise<CustomDomainPlatformConfig> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/domains/config"), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
  } catch {
    throw new DomainApiError("Could not reach the domain service.", 0, "NETWORK_ERROR");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DomainApiError(
      data?.error || "Could not load domain settings.",
      response.status,
      data?.code || "DOMAIN_CONFIG_FAILED"
    );
  }
  return data as CustomDomainPlatformConfig;
}

export async function fetchDomains(): Promise<CustomDomain[]> {
  const result = await domainFetch<{ domains: CustomDomain[] }>("/api/domains");
  return result.domains;
}

export async function connectDomain(domainName: string, pageId: string): Promise<CustomDomain> {
  const result = await domainFetch<{ domain: CustomDomain }>("/api/domains", {
    method: "POST",
    body: JSON.stringify({ domainName, pageId })
  });
  return result.domain;
}

export async function verifyDomain(id: string): Promise<CustomDomain> {
  const result = await domainFetch<{ domain: CustomDomain }>(`/api/domains/${id}/verify`, {
    method: "POST"
  });
  return result.domain;
}

export async function deleteDomain(id: string): Promise<void> {
  await domainFetch<{ success: boolean }>(`/api/domains/${id}`, { method: "DELETE" });
}
