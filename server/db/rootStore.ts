import fs from "fs";
import path from "path";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { syncRootToNormalizedTables } from "./syncNormalized";

const STORE_FILE = path.join(process.cwd(), "data-store.json");
const ROOT_KEY = "root";

let memory: Record<string, unknown> = {};
let initialized = false;
let writeChain: Promise<void> = Promise.resolve();
let backend: "supabase" | "file" = "file";
let lastError: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastNormalizedSyncError: string | null = null;

function readFileRoot(): Record<string, unknown> {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) as Record<string, unknown>;
    }
  } catch (error) {
    console.error("Error reading data store file:", error);
  }
  return {};
}

function writeFileRoot(data: Record<string, unknown>) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing data store file:", error);
  }
}

async function loadFromSupabase(): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("app_kv").select("value").eq("key", ROOT_KEY).maybeSingle();
  if (error) {
    lastError = error.message;
    console.error("Supabase load failed:", error.message);
    return null;
  }
  lastError = null;
  if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
    return data.value as Record<string, unknown>;
  }
  return {};
}

async function persistToSupabase(data: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("app_kv").upsert(
    { key: ROOT_KEY, value: data, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) {
    lastError = error.message;
    console.error("Supabase persist failed:", error.message);
    throw error;
  }
  lastError = null;
}

function scheduleNormalizedSync() {
  if (backend !== "supabase" || !isSupabaseConfigured()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    writeChain = writeChain
      .then(async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        const result = await syncRootToNormalizedTables(supabase, memory);
        if (!result.ok) {
          lastNormalizedSyncError = result.error;
          console.error("Normalized table sync failed:", result.error);
        } else {
          lastNormalizedSyncError = null;
        }
      })
      .catch((err) => console.error("Normalized sync queue error:", err));
  }, 1500);
}

export async function initRootStore(): Promise<void> {
  if (initialized) return;

  if (isSupabaseConfigured()) {
    const remote = await loadFromSupabase();
    if (remote) {
      memory = remote;
      backend = "supabase";
      if (Object.keys(memory).length === 0) {
        const local = readFileRoot();
        if (Object.keys(local).length > 0) {
          memory = local;
          try {
            await persistToSupabase(memory);
            console.log("Migrated local data-store.json → Supabase app_kv");
          } catch {
            /* logged in persist */
          }
        }
      }
      console.log("Data store: Supabase (app_kv)");
      const supabase = getSupabase();
      if (supabase && Object.keys(memory).length > 0) {
        const result = await syncRootToNormalizedTables(supabase, memory);
        if (result.ok) {
          console.log("Normalized tables synced:", result.counts);
        } else {
          lastNormalizedSyncError = result.error;
          console.warn("Normalized sync skipped/failed:", result.error);
        }
      }
    } else {
      memory = readFileRoot();
      backend = "file";
      console.warn("Data store: file fallback (Supabase unavailable — run supabase/schema.sql?)");
    }
  } else {
    memory = readFileRoot();
    backend = "file";
    console.log("Data store: local file (data-store.json)");
  }

  initialized = true;
}

export function getRootStore(): Record<string, unknown> {
  if (!initialized) {
    memory = readFileRoot();
    initialized = true;
    backend = isSupabaseConfigured() ? "supabase" : "file";
  }
  return memory;
}

export function setRootStore(data: Record<string, unknown>): void {
  memory = data;
  if (backend === "supabase" && isSupabaseConfigured()) {
    // Mirror to disk so saves survive Supabase timeouts / slow app_kv upserts.
    writeFileRoot(memory);
    writeChain = writeChain
      .then(() => persistToSupabase(memory))
      .catch((err) => console.error("Queued Supabase write failed:", err));
    scheduleNormalizedSync();
  } else {
    writeFileRoot(memory);
  }
}

export async function flushRootStore(): Promise<void> {
  await writeChain;
}

export function getDataStoreStatus(): {
  backend: "supabase" | "file";
  supabaseConfigured: boolean;
  lastError: string | null;
  lastNormalizedSyncError: string | null;
} {
  return {
    backend,
    supabaseConfigured: isSupabaseConfigured(),
    lastError,
    lastNormalizedSyncError
  };
}
