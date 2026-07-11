import { getRootStore, setRootStore } from "../db/rootStore";
import {
  AuthStoreShape,
  AuthUserRecord,
  hashPassword,
  publicUser,
  randomToken
} from "./crypto";

function readRootStore(): Record<string, unknown> {
  return getRootStore();
}

function writeRootStore(data: Record<string, unknown>) {
  setRootStore(data);
}

function emptyAuthStore(): AuthStoreShape {
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

function seedDemoUser(store: AuthStoreShape): AuthStoreShape {
  const email = "acnlink@gmail.com";
  if (store.users.some((user) => user.email === email)) return store;

  const { salt, hash } = hashPassword("acnlink1234");
  const now = new Date().toISOString();
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
    avatarUrl: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=ACN",
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
  return store;
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
  const allowDemo =
    process.env.AUTH_SEED_DEMO === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.AUTH_SEED_DEMO !== "false");
  return allowDemo ? seedDemoUser(store) : store;
}

export function writeAuthStore(store: AuthStoreShape) {
  const root = readRootStore();
  root.auth = store;
  writeRootStore(root);
}

export function findUserByEmail(store: AuthStoreShape, email: string) {
  const normalized = email.trim().toLowerCase();
  return store.users.find((user) => user.email === normalized) || null;
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
