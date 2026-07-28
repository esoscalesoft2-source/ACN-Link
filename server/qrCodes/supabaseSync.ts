import { getSupabase, isSupabaseConfigured } from "../db/supabase";
import type { QrCodeRecord } from "./repository";

const TABLE = "qr_codes";

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

function mapRecordToRow(record: QrCodeRecord): Record<string, unknown> {
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
    scan_url: record.scanUrl ?? null,
    public_code: record.publicCode ?? null,
    custom_design: Boolean(record.customDesign),
    design_color: record.designColor ?? null,
    design_logo: record.designLogo ?? null,
    design_logo_url: record.designLogoUrl ?? null,
    design_pattern: record.designPattern ?? null,
    owner_user_id: record.ownerUserId ?? null
  };
}

/**
 * Direct, single-row Supabase sync for QR codes — independent of the large
 * root-blob app_kv upsert (which can time out). Keeps /q/:code redirects
 * working across server processes even when the root blob write is slow/fails.
 */
export async function upsertQrCodeToSupabase(record: QrCodeRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).upsert(mapRecordToRow(record), { onConflict: "id" });
  if (error) {
    console.error("Direct QR Supabase upsert failed:", error.message);
  }
}

export async function deleteQrCodeFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("Direct QR Supabase delete failed:", error.message);
  }
}

/** Fast single-row lookup by publicCode (or id) — used as a fallback on cache miss. */
export async function fetchQrCodeFromSupabaseByCode(code: string): Promise<QrCodeRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const byCode = await supabase.from(TABLE).select("*").eq("public_code", code).maybeSingle();
    if (byCode.data) return mapRowToRecord(byCode.data as Record<string, unknown>);
    const byId = await supabase.from(TABLE).select("*").eq("id", code).maybeSingle();
    if (byId.data) return mapRowToRecord(byId.data as Record<string, unknown>);
    return null;
  } catch (error) {
    console.error("Direct QR Supabase lookup failed:", error);
    return null;
  }
}
