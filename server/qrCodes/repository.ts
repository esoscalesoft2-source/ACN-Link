import { getRootStore, setRootStore } from "../db/rootStore";

export type QrCodeRecord = {
  id: string;
  name: string;
  status: "Active" | "Paused";
  scans: string;
  uniqueScanners: string;
  topLocation?: string;
  conversionRate?: string;
  qrUrl: string;
  targetUrl: string;
  /** Fixed public URL encoded into the QR matrix — never rewrite after create. */
  scanUrl?: string;
  /** Short code in /q/:code — never rewrite after create. */
  publicCode?: string;
  customDesign: boolean;
  designColor?: string;
  designLogo?: string;
  designLogoUrl?: string;
  designPattern?: string;
  ownerUserId?: string;
};

const STORE_KEY = "qr_codes";
const MAX_SCAN_EVENTS = 2000;

type ScanEvent = { code: string; ip: string; at: string };

function readAll(): QrCodeRecord[] {
  const raw = getRootStore()[STORE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is QrCodeRecord =>
      Boolean(item) && typeof item === "object" && typeof (item as QrCodeRecord).id === "string"
  );
}

function writeAll(rows: QrCodeRecord[]) {
  const store = getRootStore();
  setRootStore({ ...store, [STORE_KEY]: rows });
}

function readScanEvents(): ScanEvent[] {
  const raw = getRootStore().qr_scan_events;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ScanEvent =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ScanEvent).code === "string" &&
      typeof (item as ScanEvent).ip === "string"
  );
}

function writeScanEvents(events: ScanEvent[]) {
  const store = getRootStore();
  setRootStore({ ...store, qr_scan_events: events.slice(0, MAX_SCAN_EVENTS) });
}

function normalizeCode(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function parseCount(value: string | undefined): number {
  const n = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function listQrCodes(): QrCodeRecord[] {
  return readAll();
}

export function resolvePublicQrCode(code: string): QrCodeRecord | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const rows = readAll();
  return (
    rows.find((row) => normalizeCode(row.publicCode || "") === normalized) ||
    rows.find((row) => normalizeCode(row.id) === normalized) ||
    null
  );
}

export function recordQrScan(
  code: string,
  ip: string
): { record: QrCodeRecord; scans: number; uniqueScanners: number } | null {
  const rows = readAll();
  const normalized = normalizeCode(code);
  const index = rows.findIndex(
    (row) =>
      normalizeCode(row.publicCode || "") === normalized || normalizeCode(row.id) === normalized
  );
  if (index < 0) return null;

  const current = rows[index];
  if (current.status !== "Active") {
    return {
      record: current,
      scans: parseCount(current.scans),
      uniqueScanners: parseCount(current.uniqueScanners)
    };
  }

  const now = new Date().toISOString();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const clientIp = String(ip || "unknown").slice(0, 64);

  const events = readScanEvents();
  const alreadyUniqueToday = events.some(
    (event) =>
      normalizeCode(event.code) === normalized &&
      event.ip === clientIp &&
      new Date(event.at).getTime() >= dayStartMs
  );

  const nextScans = parseCount(current.scans) + 1;
  const nextUnique = parseCount(current.uniqueScanners) + (alreadyUniqueToday ? 0 : 1);

  const next: QrCodeRecord = {
    ...current,
    scans: String(nextScans),
    uniqueScanners: String(nextUnique),
    conversionRate: `${((nextUnique / nextScans) * 100).toFixed(1)}%`
  };
  rows[index] = next;
  writeAll(rows);
  writeScanEvents([{ code: normalized, ip: clientIp, at: now }, ...events]);

  return { record: next, scans: nextScans, uniqueScanners: nextUnique };
}

export function mergeQrCodeLists(
  existingRaw: unknown,
  incomingRaw: unknown,
  options?: { pruneToIncomingForOwner?: string }
): QrCodeRecord[] {
  const existing = Array.isArray(existingRaw)
    ? existingRaw.filter(
        (item): item is QrCodeRecord =>
          Boolean(item) && typeof item === "object" && typeof (item as QrCodeRecord).id === "string"
      )
    : [];
  const incoming = Array.isArray(incomingRaw)
    ? incomingRaw.filter(
        (item): item is QrCodeRecord =>
          Boolean(item) && typeof item === "object" && typeof (item as QrCodeRecord).id === "string"
      )
    : [];

  const byId = new Map(existing.map((row) => [row.id, row]));
  for (const item of incoming) {
    const prev = byId.get(item.id);
    const prevScans = parseCount(prev?.scans);
    const nextScans = parseCount(item.scans);
    const prevUnique = parseCount(prev?.uniqueScanners);
    const nextUnique = parseCount(item.uniqueScanners);
    byId.set(item.id, {
      ...prev,
      ...item,
      ownerUserId: item.ownerUserId || prev?.ownerUserId || options?.pruneToIncomingForOwner,
      scans: String(Math.max(prevScans, nextScans)),
      uniqueScanners: String(Math.max(prevUnique, nextUnique)),
      // Frozen payload wins — never rewrite a printed scan URL/code.
      scanUrl: prev?.scanUrl || item.scanUrl,
      publicCode: prev?.publicCode || item.publicCode
    });
  }

  const merged = Array.from(byId.values());
  const ownerId = options?.pruneToIncomingForOwner;
  if (!ownerId) return merged;

  const incomingIds = new Set(incoming.map((item) => item.id));
  return merged.filter((row) => {
    if (incomingIds.has(row.id)) return true;
    // Only prune codes that clearly belong to this owner.
    if (!row.ownerUserId || row.ownerUserId !== ownerId) return true;
    return false;
  });
}

export function upsertQrCode(item: QrCodeRecord): QrCodeRecord {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === item.id);
  const prev = index >= 0 ? rows[index] : undefined;
  const next: QrCodeRecord = {
    ...prev,
    ...item,
    scans: String(Math.max(parseCount(prev?.scans), parseCount(item.scans))),
    uniqueScanners: String(Math.max(parseCount(prev?.uniqueScanners), parseCount(item.uniqueScanners))),
    scanUrl: prev?.scanUrl || item.scanUrl,
    publicCode: prev?.publicCode || item.publicCode
  };
  if (index >= 0) rows[index] = next;
  else rows.unshift(next);
  writeAll(rows);
  return next;
}

export function deleteQrCode(id: string): boolean {
  const rows = readAll();
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) return false;
  writeAll(next);
  return true;
}

export function upsertQrCodesFromWorkspace(items: unknown): void {
  writeAll(mergeQrCodeLists(readAll(), items));
}
