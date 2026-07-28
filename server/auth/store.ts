import { getRootStore, setRootStore } from "../db/rootStore";
import {
  AuthStoreShape,
  AuthUserRecord,
  hashPassword,
  publicUser,
  randomToken,
  verifyPassword
} from "./crypto";
import { buildDefaultAvatarUrl } from "./avatars";

function readRootStore(): Record<string, unknown> {
  return getRootStore();
}

function writeRootStore(data: Record<string, unknown>) {
  setRootStore(data);
}

function emptyAuthStore(): AuthStoreShape {
  // NOTE: Registered users live in root.auth.users (persisted via rootStore).
  // Admin page to list/manage these records can be added later — do not block signup on that.
  return {
    users: [],
    sessions: [],
    passwordResetTokens: [],
    emailVerificationTokens: [],
    oauthAccounts: [],
    loginHistory: [],
    auditLogs: [],
    rateLimits: {}
  };
}

const DEMO_EMAIL = "acnlink@gmail.com";
const DEMO_PASSWORD = "acnlink1234";

/** Returns true when the auth store was mutated (create or password repair). */
function seedDemoUser(store: AuthStoreShape): boolean {
  const email = DEMO_EMAIL;
  const existing = store.users.find((user) => (user.email || "").trim().toLowerCase() === email);
  const now = new Date().toISOString();

  if (existing) {
    const passwordOk =
      Boolean(existing.passwordHash) &&
      Boolean(existing.passwordSalt) &&
      verifyPassword(DEMO_PASSWORD, existing.passwordSalt, existing.passwordHash);

    let mutated = false;
    if (!passwordOk) {
      const { salt, hash } = hashPassword(DEMO_PASSWORD);
      existing.passwordHash = hash;
      existing.passwordSalt = salt;
      mutated = true;
    }

    if (existing.status !== "active") {
      existing.status = "active";
      mutated = true;
    }
    if (!existing.emailVerified || !existing.isVerified) {
      existing.emailVerified = true;
      existing.isVerified = true;
      mutated = true;
    }
    if (existing.lockedUntil || existing.failedLoginAttempts > 0) {
      existing.lockedUntil = null;
      existing.failedLoginAttempts = 0;
      mutated = true;
    }
    if (mutated) existing.updatedAt = now;
    return mutated;
  }

  const { salt, hash } = hashPassword(DEMO_PASSWORD);
  const demo: AuthUserRecord = {
    id: "user_demo_acnlink",
    email,
    passwordHash: hash,
    passwordSalt: salt,
    firstName: "ACN",
    lastName: "Link",
    companyName: "ACN Link",
    businessName: "ACN Link",
    phone: "",
    country: "United States",
    avatarUrl: buildDefaultAvatarUrl("acn"),
    plan: "Free Plan",
    isVerified: true,
    emailVerified: true,
    status: "active",
    mfaEnabled: false,
    newsletterOptIn: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  store.users.unshift(demo);
  return true;
}

function shouldSeedDemoUser(): boolean {
  if (process.env.AUTH_SEED_DEMO === "true") return true;
  if (process.env.AUTH_SEED_DEMO === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function readAuthStore(): AuthStoreShape {
  const root = readRootStore();
  const raw = (root.auth as AuthStoreShape | undefined) || emptyAuthStore();
  const store: AuthStoreShape = {
    ...emptyAuthStore(),
    ...raw,
    users: Array.isArray(raw.users) ? raw.users : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    passwordResetTokens: Array.isArray(raw.passwordResetTokens) ? raw.passwordResetTokens : [],
    emailVerificationTokens: Array.isArray(raw.emailVerificationTokens)
      ? raw.emailVerificationTokens
      : [],
    oauthAccounts: Array.isArray(raw.oauthAccounts) ? raw.oauthAccounts : [],
    loginHistory: Array.isArray(raw.loginHistory) ? raw.loginHistory : [],
    auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : [],
    rateLimits: raw.rateLimits && typeof raw.rateLimits === "object" ? raw.rateLimits : {}
  };

  if (shouldSeedDemoUser()) {
    const mutated = seedDemoUser(store);
    if (mutated) {
      root.auth = store;
      writeRootStore(root);
    }
  }
  return store;
}

export function writeAuthStore(store: AuthStoreShape) {
  const root = readRootStore();
  root.auth = store;
  writeRootStore(root);
}

export function findUserByEmail(store: AuthStoreShape, email: string) {
  const normalized = email.trim().toLowerCase();
  return (
    store.users.find((user) => (user.email || "").trim().toLowerCase() === normalized) || null
  );
}

export function findUserById(store: AuthStoreShape, id: string) {
  return store.users.find((user) => user.id === id) || null;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomToken(4)}`;
}

export function audit(
  store: AuthStoreShape,
  action: string,
  userId: string | null,
  meta: Record<string, unknown> = {}
) {
  store.auditLogs.unshift({
    id: createId("audit"),
    userId,
    action,
    meta,
    createdAt: new Date().toISOString()
  });
  store.auditLogs = store.auditLogs.slice(0, 500);
}

export function recordLogin(
  store: AuthStoreShape,
  input: {
    userId: string | null;
    email: string;
    success: boolean;
    reason: string;
    ip: string;
    userAgent: string;
  }
) {
  store.loginHistory.unshift({
    id: createId("login"),
    ...input,
    createdAt: new Date().toISOString()
  });
  store.loginHistory = store.loginHistory.slice(0, 500);
}

export function checkRateLimit(
  store: AuthStoreShape,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const current = store.rateLimits[key];
  if (!current || now - current.windowStart > windowMs) {
    store.rateLimits[key] = { count: 1, windowStart: now };
    return { allowed: true, retryAfterSec: 0 };
  }
  if (current.count >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - current.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  current.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export { publicUser };
