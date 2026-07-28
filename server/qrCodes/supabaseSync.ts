import { getSupabase, isSupabaseConfigured } from "../db/supabase";
import type { QrCodeRecord } from "./repository";
import { upsertQrCode } from "./repository";

const TABLE = "qr_codes";
const INDEX_KEY = "qr_redirect_index";

type QrIndexEntry = {
  id: string;
  name?: string;
  status: "Active" | "Paused";
  targetUrl: string;
  scanUrl?: string;
  publicCode: string;
};

function mapRowToRecord(row: Record<string, unknown>): QrCodeRecord {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    status: row.status === "Paused" ? "Paused" : "Active",
    scans: String(row.scans ?? "0"),
    uniqueScanners: String(row.unique_scanners ?? "0"),
    topLocation: row.top_location ? String(row.top_location) : undefined,
    conversionRate: row.conversion_rate ? String(row.conversion_rate) : undefined,
    qrUrl: String(row.qr_url || ""),
    targetUrl: String(row.target_url || ""),
    scanUrl: row.scan_url ? String(row.scan_url) : undefined,
    publicCode: row.public_code ? String(row.public_code) : undefined,
    customDesign: Boolean(row.custom_design),
    designColor: row.design_color ? String(row.design_color) : undefined,
    designLogo: row.design_logo ? String(row.design_logo) : undefined,
    designLogoUrl: row.design_logo_url ? String(row.design_logo_url) : undefined,
    designPattern: row.design_pattern ? String(row.design_pattern) : undefined,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined
  };
}

function mapRecordToBaseRow(record: QrCodeRecord): Record<string, unknown> {
  return {
    id: record.id,
    name: record.name || "",
    status: record.status || "Active",
    scans: record.scans || "0",
    unique_scanners: record.uniqueScanners || "0",
    top_location: record.topLocation ?? null,
    conversion_rate: record.conversionRate ?? null,
    qr_url: record.qrUrl || "",
    target_url: record.targetUrl || "",
    custom_design: Boolean(record.customDesign),
    design_color: record.designColor ?? null,
    design_logo: record.designLogo ?? null,
    design_pattern: record.designPattern ?? null,
    owner_user_id: record.ownerUserId ?? null
  };
}

function mapRecordToFullRow(record: QrCodeRecord): Record<string, unknown> {
  return {
    ...mapRecordToBaseRow(record),
    scan_url: record.scanUrl ?? null,
    public_code: record.publicCode ?? null,
    design_logo_url: record.designLogoUrl ?? null
  };
}

async function upsertQrRedirectIndex(record: QrCodeRecord): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !record.publicCode) return;

  const { data, error: readError } = await supabase
    .from("app_kv")
    .select("value")
    .eq("key", INDEX_KEY)
    .maybeSingle();
  if (readError) {
    console.error("QR redirect index read failed:", readError.message);
    return;
  }

  const current =
    data?.value && typeof data.value === "object" && !Array.isArray(data.value)
      ? ({ ...(data.value as Record<string, QrIndexEntry>) } as Record<string, QrIndexEntry>)
      : {};

  current[String(record.publicCode).toLowerCase()] = {
    id: record.id,
    name: record.name,
    status: record.status,
    targetUrl: record.targetUrl,
    scanUrl: record.scanUrl,
    publicCode: String(record.publicCode)
  };

  const { error } = await supabase.from("app_kv").upsert(
    { key: INDEX_KEY, value: current, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) {
    console.error("QR redirect index upsert failed:", error.message);
  }
}

async function deleteFromQrRedirectIndex(id: string, publicCode?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.from("app_kv").select("value").eq("key", INDEX_KEY).maybeSingle();
  if (!data?.value || typeof data.value !== "object" || Array.isArray(data.value)) return;
  const current = { ...(data.value as Record<string, QrIndexEntry>) };
  let changed = false;
  if (publicCode && current[publicCode.toLowerCase()]) {
    delete current[publicCode.toLowerCase()];
    changed = true;
  }
  for (const [code, entry] of Object.entries(current)) {
    if (entry?.id === id) {
      delete current[code];
      changed = true;
    }
  }
  if (!changed) return;
  await supabase.from("app_kv").upsert(
    { key: INDEX_KEY, value: current, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

async function fetchFromQrRedirectIndex(code: string): Promise<QrCodeRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("app_kv").select("value").eq("key", INDEX_KEY).maybeSingle();
  if (error || !data?.value || typeof data.value !== "object" || Array.isArray(data.value)) {
    return null;
  }
  const entry = (data.value as Record<string, QrIndexEntry>)[code.toLowerCase()];
  if (!entry?.id || !entry.targetUrl) return null;
  return {
    id: entry.id,
    name: entry.name || "Smart QR",
    status: entry.status === "Paused" ? "Paused" : "Active",
    scans: "0",
    uniqueScanners: "0",
    qrUrl: "",
    targetUrl: entry.targetUrl,
    scanUrl: entry.scanUrl,
    publicCode: entry.publicCode || code,
    customDesign: false
  };
}

/**
 * Direct QR sync — small table row + compact redirect index.
 * Independent of the large root-blob app_kv upsert that often times out.
 */
export async function upsertQrCodeToSupabase(record: QrCodeRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const full = mapRecordToFullRow(record);
  const { error } = await supabase.from(TABLE).upsert(full, { onConflict: "id" });
  if (error) {
    // Older DBs may lack scan_url / public_code / design_logo_url — retry with base columns.
    const missingColumn =
      /scan_url|public_code|design_logo_url|schema cache/i.test(error.message || "");
    if (missingColumn) {
      const { error: baseError } = await supabase
        .from(TABLE)
        .upsert(mapRecordToBaseRow(record), { onConflict: "id" });
      if (baseError) {
        console.error("Direct QR Supabase upsert failed:", baseError.message);
      }
    } else {
      console.error("Direct QR Supabase upsert failed:", error.message);
    }
  }

  await upsertQrRedirectIndex(record);
}

export async function deleteQrCodeFromSupabase(id: string, publicCode?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("Direct QR Supabase delete failed:", error.message);
  }
  await deleteFromQrRedirectIndex(id, publicCode);
}

/** Fast lookup by publicCode — table first, then compact redirect index. */
export async function fetchQrCodeFromSupabaseByCode(code: string): Promise<QrCodeRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const byCode = await supabase.from(TABLE).select("*").eq("public_code", code).maybeSingle();
    if (!byCode.error && byCode.data) {
      return mapRowToRecord(byCode.data as Record<string, unknown>);
    }
    const byId = await supabase.from(TABLE).select("*").eq("id", code).maybeSingle();
    if (!byId.error && byId.data) {
      return mapRowToRecord(byId.data as Record<string, unknown>);
    }
    return await fetchFromQrRedirectIndex(code);
  } catch (error) {
    console.error("Direct QR Supabase lookup failed:", error);
    try {
      return await fetchFromQrRedirectIndex(code);
    } catch {
      return null;
    }
  }
}

/** Cache a remote record into local root memory after a successful lookup. */
export function cacheResolvedQrCode(record: QrCodeRecord): void {
  upsertQrCode(record);
}
