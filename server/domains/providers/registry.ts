import { cloudflareProvider } from "./cloudflareProvider";
import { manualProvider } from "./manualProvider";
import {
  godaddyProvider,
  hostingerProvider,
  namecheapProvider,
  porkbunProvider,
  squarespaceProvider
} from "./stubProviders";
import type { DnsProviderAdapter, DnsProviderCapability, DnsProviderId } from "./types";

const PROVIDERS: DnsProviderAdapter[] = [
  cloudflareProvider,
  godaddyProvider,
  hostingerProvider,
  namecheapProvider,
  porkbunProvider,
  squarespaceProvider,
  manualProvider
];

const BY_ID = new Map<DnsProviderId, DnsProviderAdapter>(
  PROVIDERS.map((provider) => [provider.capability.id, provider])
);

export function listDnsProviderCapabilities(): DnsProviderCapability[] {
  return PROVIDERS.map((provider) => provider.capability);
}

export function getDnsProvider(id: string | null | undefined): DnsProviderAdapter {
  const key = (id || "other").toLowerCase() as DnsProviderId;
  return BY_ID.get(key) || manualProvider;
}

export function normalizeDnsProviderId(id: string | null | undefined): DnsProviderId {
  const key = (id || "").toLowerCase();
  if (BY_ID.has(key as DnsProviderId)) return key as DnsProviderId;
  return "other";
}
