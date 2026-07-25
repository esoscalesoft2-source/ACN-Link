import { getRootStore, setRootStore } from "../db/rootStore";
import { normalizeLinkRotatorHost } from "./publicUrl";
import type { LinkRotatorDestinationRecord, LinkRotatorRecord, LinkRotatorStatus } from "./types";

const STORE_KEY = "link_rotators";

function readAll(): LinkRotatorRecord[] {
  const raw = getRootStore()[STORE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is LinkRotatorRecord =>
        Boolean(item) && typeof item === "object" && typeof (item as LinkRotatorRecord).id === "string"
    )
    .map((item) => ({
      ...item,
      hostDomain: normalizeLinkRotatorHost(item.hostDomain)
    }));
}

function writeAll(rows: LinkRotatorRecord[]) {
  const store = getRootStore();
  setRootStore({ ...store, [STORE_KEY]: rows });
}

export function listLinkRotators(ownerUserId: string): LinkRotatorRecord[] {
  return readAll()
    .filter((row) => row.ownerUserId === ownerUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findLinkRotatorById(
  id: string,
  ownerUserId: string
): LinkRotatorRecord | null {
  return readAll().find((row) => row.id === id && row.ownerUserId === ownerUserId) || null;
}

export function findLinkRotatorBySlug(slug: string, hostDomain?: string): LinkRotatorRecord | null {
  const normalized = slug.trim().toLowerCase();
  const host = hostDomain ? normalizeLinkRotatorHost(hostDomain) : "";
  return (
    readAll().find((row) => {
      if (row.slug !== normalized) return false;
      if (!host) return true;
      return normalizeLinkRotatorHost(row.hostDomain) === host;
    }) || null
  );
}

/**
 * Resolve an active rotator for a public /r/:slug hit.
 * Cloudflare Origin Rules may rewrite Host → platform host, so when the request
 * host is the platform we also accept a unique slug match on a custom-domain rotator.
 */
export function resolvePublicLinkRotator(
  slug: string,
  requestHostname: string,
  platformHostname: string
): LinkRotatorRecord | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const host = normalizeLinkRotatorHost(requestHostname);
  const platform = normalizeLinkRotatorHost(platformHostname);

  const exact = findLinkRotatorBySlug(normalized, host);
  if (exact?.status === "Active") return exact;

  const matches = readAll().filter(
    (row) => row.slug === normalized && row.status === "Active"
  );
  if (matches.length === 0) return null;

  // Prefer exact host, then platform-bound, then sole active match when Host was rewritten.
  const byHost = matches.find((row) => normalizeLinkRotatorHost(row.hostDomain) === host);
  if (byHost) return byHost;

  if (host === platform) {
    if (matches.length === 1) return matches[0];
    const platformBound = matches.find(
      (row) => normalizeLinkRotatorHost(row.hostDomain) === platform
    );
    if (platformBound) return platformBound;
    // Host rewrite dropped customer host — still serve the only/custom rotator by slug.
    return matches[0];
  }

  return null;
}

export function isLinkRotatorSlugTaken(
  slug: string,
  hostDomain: string,
  excludeId?: string
): boolean {
  const normalized = slug.trim().toLowerCase();
  const host = normalizeLinkRotatorHost(hostDomain);
  return readAll().some(
    (row) =>
      row.slug === normalized &&
      normalizeLinkRotatorHost(row.hostDomain) === host &&
      row.id !== excludeId
  );
}

export function createLinkRotator(input: {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  slug: string;
  hostDomain: string;
  status: LinkRotatorStatus;
  destinations: LinkRotatorDestinationRecord[];
}): LinkRotatorRecord {
  const now = new Date().toISOString();
  const record: LinkRotatorRecord = {
    id: input.id,
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: input.description,
    slug: input.slug,
    hostDomain: normalizeLinkRotatorHost(input.hostDomain),
    status: input.status,
    destinations: input.destinations,
    totalClicks: 0,
    createdAt: now,
    updatedAt: now
  };
  writeAll([record, ...readAll()]);
  return record;
}

export function updateLinkRotator(
  id: string,
  ownerUserId: string,
  patch: {
    name?: string;
    description?: string;
    status?: LinkRotatorStatus;
    hostDomain?: string;
    slug?: string;
    destinations?: LinkRotatorDestinationRecord[];
  }
): LinkRotatorRecord | null {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === id && row.ownerUserId === ownerUserId);
  if (index < 0) return null;

  const current = rows[index];
  const next: LinkRotatorRecord = {
    ...current,
    name: patch.name ?? current.name,
    description: patch.description ?? current.description,
    status: patch.status ?? current.status,
    slug: patch.slug ?? current.slug,
    hostDomain:
      patch.hostDomain !== undefined
        ? normalizeLinkRotatorHost(patch.hostDomain)
        : current.hostDomain,
    destinations: patch.destinations ?? current.destinations,
    updatedAt: new Date().toISOString()
  };
  rows[index] = next;
  writeAll(rows);
  return next;
}

export function removeLinkRotator(id: string, ownerUserId: string): boolean {
  const rows = readAll();
  const next = rows.filter((row) => !(row.id === id && row.ownerUserId === ownerUserId));
  if (next.length === rows.length) return false;
  writeAll(next);
  return true;
}

export function incrementLinkRotatorClicks(id: string): LinkRotatorRecord | null {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const current = rows[index];
  const next: LinkRotatorRecord = {
    ...current,
    totalClicks: (current.totalClicks || 0) + 1,
    updatedAt: new Date().toISOString()
  };
  rows[index] = next;
  writeAll(rows);
  return next;
}
