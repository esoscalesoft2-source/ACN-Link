import type { LinkRotatorDestinationRecord } from "./types";

const URL_PATTERN = /^https?:\/\/.+/i;

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !URL_PATTERN.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function normalizeDestinations(
  input: unknown
): { destinations?: LinkRotatorDestinationRecord[]; error?: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "Add at least one destination URL." };
  }

  const destinations: LinkRotatorDestinationRecord[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const row = input[index];
    if (!row || typeof row !== "object") {
      return { error: `Destination ${index + 1} is invalid.` };
    }
    const url = String((row as { url?: unknown }).url || "").trim();
    const probabilityRaw = (row as { probability?: unknown }).probability;
    const probability = Number(probabilityRaw);
    const id =
      String((row as { id?: unknown }).id || "").trim() ||
      `dest_${Date.now()}_${index}`;

    if (!isValidHttpUrl(url)) {
      return { error: `Destination ${index + 1}: enter a valid URL (https://…).` };
    }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      return { error: `Destination ${index + 1}: probability must be between 0 and 100.` };
    }

    destinations.push({
      id,
      url,
      probability: Math.round(probability * 100) / 100
    });
  }

  const total = destinations.reduce((sum, item) => sum + item.probability, 0);
  if (Math.abs(total - 100) > 0.01) {
    return {
      error: `Total probability must equal exactly 100%. Current total: ${roundPercent(total)}%.`
    };
  }

  return { destinations };
}

export function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function pickDestinationByProbability(
  destinations: LinkRotatorDestinationRecord[]
): LinkRotatorDestinationRecord | null {
  const pool = destinations.filter((item) => item.probability > 0 && item.url);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, item) => sum + item.probability, 0);
  let cursor = Math.random() * total;
  for (const item of pool) {
    cursor -= item.probability;
    if (cursor <= 0) return item;
  }
  return pool[pool.length - 1] || null;
}
