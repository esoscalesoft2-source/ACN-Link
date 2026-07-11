import { BioEditorBlock, BioEditorState, BioPageDraft, BioPageTemplate } from "../types";
import { apiUrl } from "../lib/apiBase";

export const DRAFTS_STORAGE_KEY = "acnlink_bio_page_drafts";
export const TEMPLATES_STORAGE_KEY = "acnlink_bio_page_templates";
const LEGACY_DRAFTS_KEY = "savedDrafts";
const LEGACY_TEMPLATES_KEY = "savedTemplates";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn(
        `Local storage is full; "${key}" will continue syncing through the server instead.`
      );
      return false;
    }

    console.error(`Failed to persist "${key}" to local storage:`, error);
    return false;
  }
}

/** Deep-clone blocks so nested widget config is persisted safely */
export function cloneBlocks(blocks: BioEditorBlock[]): BioEditorBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as BioEditorBlock[];
}

export function buildEditorState(
  title: string,
  shortBio: string,
  coverImage: string,
  blocks: BioEditorBlock[],
  slug?: string
): BioEditorState {
  return {
    pageMeta: {
      title: title || "Untitled Page",
      slug,
      shortBio: shortBio || "Write a short bio...",
      coverImage: coverImage || DEFAULT_COVER
    },
    blocks: cloneBlocks(blocks)
  };
}

function isBioEditorState(value: unknown): value is BioEditorState {
  if (!value || typeof value !== "object") return false;
  const state = value as BioEditorState;
  return (
    !!state.pageMeta &&
    typeof state.pageMeta.title === "string" &&
    Array.isArray(state.blocks)
  );
}

/** Normalize legacy flat draft/template records into typed models */
function legacyToEditorState(record: Record<string, unknown>): BioEditorState {
  if (isBioEditorState(record.data)) {
    return {
      pageMeta: { ...record.data.pageMeta },
      blocks: cloneBlocks(record.data.blocks)
    };
  }

  const title = (record.title as string) || (record.name as string) || "Untitled";
  return buildEditorState(
    title,
    (record.bio as string) || "Write a short bio...",
    (record.coverPhoto as string) || DEFAULT_COVER,
    cloneBlocks((record.blocks as BioEditorBlock[]) || []),
    record.slug as string | undefined
  );
}

export function normalizeDraft(record: Record<string, unknown>): BioPageDraft {
  const pageId =
    (record.pageId as string) ||
    (record.id as string)?.replace(/^draft_/, "") ||
    `page_${Date.now()}`;
  const now = new Date().toISOString();

  return {
    id: (record.id as string) || `draft_${pageId}`,
    pageId,
    pageSlug: record.pageSlug as string | undefined,
    data: legacyToEditorState(record),
    createdAt: (record.createdAt as string) || now,
    updatedAt: (record.updatedAt as string) || now
  };
}

export function normalizeTemplate(record: Record<string, unknown>): BioPageTemplate {
  const data = legacyToEditorState(record);
  const now = new Date().toISOString();
  const name =
    (record.name as string) ||
    (record.title as string) ||
    data.pageMeta.title ||
    "Untitled Template";

  return {
    id: (record.id as string) || `tpl_${Date.now()}`,
    name,
    sourcePageId: record.sourcePageId as string | undefined,
    previewImage:
      (record.previewImage as string) ||
      (record.coverPhoto as string) ||
      data.pageMeta.coverImage,
    description: (record.description as string) || undefined,
    data,
    createdAt: (record.createdAt as string) || now,
    updatedAt: (record.updatedAt as string) || now,
    isBuiltIn: !!record.isBuiltIn
  };
}

export function migrateLegacyStorage(): void {
  const existingDrafts = readStorage<BioPageDraft[]>(DRAFTS_STORAGE_KEY, []);
  const existingTemplates = readStorage<BioPageTemplate[]>(TEMPLATES_STORAGE_KEY, []);

  if (existingDrafts.length === 0) {
    const legacyDrafts = readStorage<Record<string, unknown>[]>(LEGACY_DRAFTS_KEY, []);
    if (legacyDrafts.length > 0) {
      const migrated = legacyDrafts.map(normalizeDraft);
      if (writeStorage(DRAFTS_STORAGE_KEY, migrated)) {
        localStorage.removeItem(LEGACY_DRAFTS_KEY);
      }
    }
  }

  if (existingTemplates.length === 0) {
    const legacyTemplates = readStorage<Record<string, unknown>[]>(LEGACY_TEMPLATES_KEY, []);
    if (legacyTemplates.length > 0) {
      const migrated = legacyTemplates.map(normalizeTemplate);
      if (writeStorage(TEMPLATES_STORAGE_KEY, migrated)) {
        localStorage.removeItem(LEGACY_TEMPLATES_KEY);
      }
    }
  }
}

export function getAllDrafts(): BioPageDraft[] {
  migrateLegacyStorage();
  return readStorage<BioPageDraft[]>(DRAFTS_STORAGE_KEY, []);
}

export function getDraftByPageId(pageId: string): BioPageDraft | null {
  return getAllDrafts().find((draft) => draft.pageId === pageId) ?? null;
}

export function persistDrafts(drafts: BioPageDraft[]): boolean {
  // The legacy copy doubles localStorage usage and is no longer required.
  localStorage.removeItem(LEGACY_DRAFTS_KEY);
  return writeStorage(DRAFTS_STORAGE_KEY, drafts);
}

export function upsertDraft(draft: BioPageDraft, drafts: BioPageDraft[]): BioPageDraft[] {
  const index = drafts.findIndex((item) => item.pageId === draft.pageId);
  if (index >= 0) {
    const next = [...drafts];
    next[index] = { ...draft, id: drafts[index].id, createdAt: drafts[index].createdAt };
    return next;
  }
  return [...drafts, draft];
}

export function deleteDraftByPageId(pageId: string, drafts: BioPageDraft[]): BioPageDraft[] {
  return drafts.filter((draft) => draft.pageId !== pageId);
}

export function getAllUserTemplates(): BioPageTemplate[] {
  migrateLegacyStorage();
  return readStorage<BioPageTemplate[]>(TEMPLATES_STORAGE_KEY, []);
}

export function getTemplateById(id: string): BioPageTemplate | null {
  return getAllUserTemplates().find((template) => template.id === id) ?? null;
}

export function persistTemplates(templates: BioPageTemplate[]): boolean {
  // Keep only the canonical key. The former legacy duplicate can easily
  // exceed the browser's ~5 MB quota for image-heavy templates.
  localStorage.removeItem(LEGACY_TEMPLATES_KEY);

  const persisted = writeStorage(TEMPLATES_STORAGE_KEY, templates);
  if (!persisted) {
    // The in-memory state and /api/templates server sync remain authoritative
    // for this session; remove an oversized stale cache to recover space.
    try {
      localStorage.removeItem(TEMPLATES_STORAGE_KEY);
    } catch {
      // Storage access is unavailable; the server sync still preserves data.
    }
  }
  return persisted;
}

export function upsertTemplate(
  template: BioPageTemplate,
  templates: BioPageTemplate[]
): BioPageTemplate[] {
  const index = templates.findIndex((item) => item.id === template.id);
  if (index >= 0) {
    const next = [...templates];
    next[index] = { ...template, createdAt: templates[index].createdAt };
    return next;
  }
  return [...templates, template];
}

export function deleteTemplateById(id: string, templates: BioPageTemplate[]): BioPageTemplate[] {
  return templates.filter((template) => template.id !== id);
}

export function getTemplateEditorPayload(template: BioPageTemplate | Record<string, unknown>): BioEditorState {
  return normalizeTemplate(template as Record<string, unknown>).data;
}

export function formatStorageDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

/** Write preview keys used by PublicBioPageView */
export function persistPagePreviewStorage(
  pageId: string,
  pageSlug: string,
  blocks: BioEditorBlock[],
  details: { title: string; bio: string; coverPhoto: string }
): void {
  try {
    const blocksJson = JSON.stringify(blocks);
    const detailsJson = JSON.stringify(details);
    localStorage.setItem(`biolink_blocks_${pageId}`, blocksJson);
    localStorage.setItem(`biolink_blocks_${pageSlug}`, blocksJson);
    localStorage.setItem(`biolink_details_${pageId}`, detailsJson);
    localStorage.setItem(`biolink_details_${pageSlug}`, detailsJson);
  } catch (err) {
    console.error("Failed to persist page preview storage:", err);
  }
}

export function mergeTemplates(
  local: BioPageTemplate[],
  remote: BioPageTemplate[]
): BioPageTemplate[] {
  const map = new Map<string, BioPageTemplate>();
  for (const tpl of remote) {
    map.set(tpl.id, tpl);
  }
  for (const tpl of local) {
    const existing = map.get(tpl.id);
    if (!existing || new Date(tpl.updatedAt) >= new Date(existing.updatedAt)) {
      map.set(tpl.id, tpl);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function fetchServerTemplates(): Promise<BioPageTemplate[]> {
  try {
    const res = await fetch(apiUrl("/api/templates"));
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item) => normalizeTemplate(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function syncTemplateToServer(template: BioPageTemplate): Promise<void> {
  try {
    await fetch(apiUrl("/api/templates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template })
    });
  } catch (err) {
    console.error("Failed to sync template to server:", err);
  }
}

export async function deleteTemplateOnServer(id: string): Promise<void> {
  try {
    await fetch(apiUrl(`/api/templates/${id}`), { method: "DELETE" });
  } catch (err) {
    console.error("Failed to delete template on server:", err);
  }
}

export async function syncAllTemplatesToServer(templates: BioPageTemplate[]): Promise<void> {
  try {
    await fetch(apiUrl("/api/templates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates })
    });
  } catch (err) {
    console.error("Failed to bulk sync templates:", err);
  }
}

export { DEFAULT_COVER };
