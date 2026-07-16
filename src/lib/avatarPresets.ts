const MEMOJI_API = "https://tapback.co/api/avatar";

/** Curated 3D memoji seeds — each maps to a unique round avatar. */
export const ACN_MEMOJI_SEEDS = [
  "arjun",
  "maya",
  "jordan",
  "sam",
  "riley",
  "leo",
  "zara",
  "kai",
  "nova",
  "blake",
  "sage",
  "drew"
] as const;

export function buildMemojiAvatarUrl(seed: string): string {
  const normalized = seed.trim().toLowerCase().replace(/\s+/g, "-") || "acn";
  return `${MEMOJI_API}/${encodeURIComponent(normalized)}.webp`;
}

export const ACN_AVATAR_PRESETS = ACN_MEMOJI_SEEDS.map(buildMemojiAvatarUrl);

export const DEFAULT_ACN_AVATAR_URL = ACN_AVATAR_PRESETS[0];

export function defaultAvatarUrlForEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "acn";
  return buildMemojiAvatarUrl(local);
}
