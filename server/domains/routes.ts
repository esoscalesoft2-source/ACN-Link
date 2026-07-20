import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../auth/routes";
import { getRootStore } from "../db/rootStore";
import {
  deleteCustomHostnamesForDomain,
  getCustomHostname,
  isCloudflareForSaasConfigured,
  registerCustomHostname,
  registerRootDomainHostnames,
  type ProviderHostname
} from "./cloudflare";
import { provisionCloudflareDnsRecords } from "./cloudflareDns";
import {
  detectDnsProvider,
  domainServesAcnBio,
  verifyDomainDns,
  verifyHostnameReachability,
  type DnsProviderDetection
} from "./dns";
import { buildDnsRecordSet } from "./dnsRecords";
import {
  assertSupportedCustomDomain,
  getCustomDomainKind,
  getDnsZoneDomain,
  getSubdomainHostLabel,
  normalizeHostname,
  resolveCnameTarget,
  resolveCustomDomainATarget,
  resolvePlatformHostname,
  sanitizeARecordTarget
} from "./hostname";
import {
  createDomain,
  findDomainById,
  findDomainByPageId,
  listDomains,
  removeDomain,
  updateDomain,
  appendDomainVerificationLog,
  type CustomDomainRecord,
  type DomainStatus
} from "./repository";

type AuthedRequest = Request & {
  authUser?: { id: string; email: string };
};

function domainId() {
  return `domain_${Date.now()}_${randomBytes(5).toString("hex")}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function pageBelongsToUser(pageId: string, userId: string) {
  const pages = getRootStore().pages_list;
  return (
    Array.isArray(pages) &&
    pages.some(
      (page) =>
        page &&
        typeof page === "object" &&
        page.id === pageId &&
        page.ownerUserId === userId
    )
  );
}

const DNS_PROVIDER_CACHE_MS = 5 * 60 * 1000;
const dnsProviderCache = new Map<string, { at: number; value: DnsProviderDetection }>();

async function getDnsProviderForDomain(domainName: string): Promise<DnsProviderDetection> {
  const zone = getDnsZoneDomain(normalizeHostname(domainName));
  const cached = dnsProviderCache.get(zone);
  if (cached && Date.now() - cached.at < DNS_PROVIDER_CACHE_MS) {
    return cached.value;
  }
  const value = await detectDnsProvider(domainName);
  dnsProviderCache.set(zone, { at: Date.now(), value });
  return value;
}

function providerDnsLabel(detection: DnsProviderDetection): string {
  if (detection.providerId !== "unknown" && detection.providerName !== "DNS Provider") {
    return detection.providerName;
  }
  return "your DNS provider";
}

function proxySuffix(providerId: string): string {
  return providerId === "cloudflare" ? " (Proxied orange cloud)" : "";
}

async function buildSetupHint(
  record: CustomDomainRecord,
  saasConfigured: boolean
): Promise<{ hint: string | null; dnsProviderName: string | null; dnsProviderId: string | null }> {
  if (record.status === "Verified") {
    return {
      hint: "Your domain is live with HTTPS. Share this address with visitors.",
      dnsProviderName: null,
      dnsProviderId: null
    };
  }
  if (record.status === "Provisioning SSL") {
    return {
      hint: saasConfigured
        ? "DNS is correct. SSL certificate is being issued — this usually takes a few minutes."
        : "DNS is correct. Waiting for SSL to finish provisioning.",
      dnsProviderName: null,
      dnsProviderId: null
    };
  }
  if (record.status === "DNS Verified") {
    const kind = getCustomDomainKind(record.domainName);
    if (kind === "subdomain") {
      return {
        hint: saasConfigured
          ? `DNS CNAME is correct. SSL is still finishing — click Test Connection. When status is Verified, ${record.domainName} will open your bio page.`
          : `DNS CNAME looks correct. Click Test Connection — when ${record.domainName} reaches ACN Link, status becomes Verified.`,
        dnsProviderName: null,
        dnsProviderId: null
      };
    }
    return {
      hint: saasConfigured
        ? "DNS is verified. SSL is still provisioning — click Test Connection in a minute."
        : "DNS is verified. Click Test Connection — when your domain reaches ACN Link, status becomes Verified.",
      dnsProviderName: null,
      dnsProviderId: null
    };
  }
  if (record.status === "Pending DNS") {
    const detected = await getDnsProviderForDomain(record.domainName);
    const label = providerDnsLabel(detected);
    const kind = getCustomDomainKind(record.domainName);
    const aTarget = resolveCustomDomainATarget();
    const cnameTarget = resolveCnameTarget();

    if (kind === "root") {
      return {
        hint:
          `At ${label}: add A record · Name @ → ${aTarget}${proxySuffix(detected.providerId)}. ` +
          "Root domains use A records only. Then click Test Connection.",
        dnsProviderName: detected.providerName,
        dnsProviderId: detected.providerId
      };
    }

    const hostLabel = getSubdomainHostLabel(record.domainName);
    return {
      hint:
        `At ${label}: add CNAME · Name ${hostLabel} → ${cnameTarget}${proxySuffix(detected.providerId)}. ` +
        "Subdomains use CNAME only — do not add an A record. Then click Test Connection.",
      dnsProviderName: detected.providerName,
      dnsProviderId: detected.providerId
    };
  }
  return { hint: record.errorMessage, dnsProviderName: null, dnsProviderId: null };
}

function isWrongSubdomainARecordMessage(message: string, hostLabel: string): boolean {
  if (/do not use an a record/i.test(message)) return false;
  if (/subdomains use cname only/i.test(message)) return false;
  if (/dns cname points/i.test(message)) return false;
  if (/dns cname configured/i.test(message)) return false;
  if (new RegExp(`Host ${hostLabel} → \\d+\\.\\d+\\.\\d+\\.\\d+`, "i").test(message)) return true;
  if (/Add an A record/i.test(message)) return true;
  if (/ to A →/i.test(message)) return true;
  return false;
}

function sanitizeStoredErrorMessage(domainName: string, message: string | null): string | null {
  if (!message) return null;
  const kind = getCustomDomainKind(domainName);
  if (kind === "subdomain") {
    const hostLabel = getSubdomainHostLabel(domainName);
    const cnameTarget = resolveCnameTarget();
    if (isWrongSubdomainARecordMessage(message, hostLabel)) {
      return (
        `Subdomains use CNAME only: Host ${hostLabel} → ${cnameTarget}. ` +
        "Remove any A record for this host."
      );
    }
  }
  if (kind === "root" && /cname.*www/i.test(message)) {
    const aTarget = resolveCustomDomainATarget();
    return `Root domains use A record only: Host @ → ${aTarget}. Connect www.yourbrand.com separately as a subdomain if needed.`;
  }
  return message;
}

async function publicDomain(record: CustomDomainRecord) {
  const saasConfigured = isCloudflareForSaasConfigured();
  const kind = getCustomDomainKind(record.domainName);
  const isSubdomain = kind === "subdomain";
  const { hint, dnsProviderName, dnsProviderId } = await buildSetupHint(record, saasConfigured);

  return {
    id: record.id,
    pageId: record.pageId,
    domainName: record.domainName,
    type: isSubdomain ? "CNAME" : "A",
    dnsTarget: record.dnsTarget,
    dnsHostLabel: isSubdomain ? getSubdomainHostLabel(record.domainName) : "@",
    status: record.status,
    dnsVerifiedAt: record.dnsVerifiedAt,
    provider: record.provider,
    providerStatus: record.providerStatus,
    sslStatus: record.sslStatus,
    ownershipVerification: record.ownershipVerification,
    lastCheckedAt: record.lastCheckedAt,
    errorMessage:
      record.status === "Pending DNS"
        ? null
        : sanitizeStoredErrorMessage(record.domainName, record.errorMessage),
    setupHint: hint,
    dnsProviderName,
    dnsProviderId,
    selfServeEnabled: saasConfigured,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function providerPatch(provider: ProviderHostname) {
  return {
    provider: "cloudflare" as const,
    provider_hostname_id: provider.id,
    provider_status: provider.status,
    ssl_status: provider.sslStatus,
    ownership_verification:
      provider.ownershipVerification || provider.ownershipVerificationHttp || null,
    error_message: null
  };
}

async function resolveCloudflareProviderState(record: CustomDomainRecord): Promise<{
  provider?: ProviderHostname;
  providerError?: string;
}> {
  if (!isCloudflareForSaasConfigured()) return {};
  try {
    if (record.providerHostnameId) {
      return { provider: await getCustomHostname(record.providerHostnameId) };
    }
    return { provider: await registerCustomHostname(record.domainName) };
  } catch (error) {
    return { providerError: errorMessage(error) };
  }
}

function connectionReachable(
  domainName: string,
  servesAcn: boolean,
  provider?: ProviderHostname
): boolean {
  if (servesAcn) return true;
  if (provider?.status === "active" && provider.sslStatus === "active") return true;
  return false;
}

async function resolveFinalStatus(
  dnsVerified: boolean,
  domainName: string,
  provider?: ProviderHostname
): Promise<DomainStatus> {
  if (!dnsVerified) return "Pending DNS";
  if (provider) {
    if (provider.status === "active" && provider.sslStatus === "active") return "Verified";
    if (await domainServesAcnBio(domainName)) return "Verified";
    return "Provisioning SSL";
  }
  if (await domainServesAcnBio(domainName)) return "Verified";
  return "DNS Verified";
}

export type DomainConnectionTest = {
  dnsVerified: boolean;
  dnsMessage: string;
  servesAcn: boolean;
  sslAutomatic: boolean;
  connectionState: "live" | "connecting" | "offline";
  summary: string;
  nextStep: string | null;
};

async function runConnectionTest(
  domainName: string,
  provider?: ProviderHostname
): Promise<DomainConnectionTest & { checkedAt: string }> {
  const dns = await verifyDomainDns(domainName);
  const sslAutomatic = isCloudflareForSaasConfigured();
  const kind = getCustomDomainKind(domainName);
  const checkedAt = dns.checkedAt;

  let dnsVerified = dns.verified;
  if (!dnsVerified) {
    dnsVerified = await verifyHostnameReachability(domainName);
  }
  if (!dnsVerified && provider?.status === "active") {
    dnsVerified = true;
  }

  let servesAcn = await domainServesAcnBio(domainName);
  const live = connectionReachable(domainName, servesAcn, provider);
  if (!servesAcn && live) servesAcn = true;

  const dnsMessage = dnsVerified
    ? kind === "subdomain"
      ? "DNS CNAME points to ACN Link."
      : "DNS A record points to ACN Link."
    : dns.message;

  if (dnsVerified && live) {
    return {
      checkedAt,
      dnsVerified: true,
      dnsMessage,
      servesAcn: true,
      sslAutomatic,
      connectionState: "live",
      summary: `${domainName} is connected and serving ACN Link.`,
      nextStep: null
    };
  }

  if (dnsVerified) {
    return {
      checkedAt,
      dnsVerified: true,
      dnsMessage,
      servesAcn: false,
      sslAutomatic,
      connectionState: "connecting",
      summary: "DNS is correct. ACN Link is still registering SSL and routing for this address.",
      nextStep:
        kind === "subdomain"
          ? sslAutomatic
            ? provider?.sslStatus === "active"
              ? "SSL is active but routing is still updating — wait 2–5 minutes and Test Connection again."
              : "DNS is correct at Cloudflare. Click Test Connection — ACN Link registers SSL and routing (usually 2–5 minutes)."
            : "DNS CNAME is correct. Ensure CLOUDFLARE_* is configured on the server, then Test Connection again."
          : sslAutomatic
            ? "SSL is still provisioning. Wait a few minutes, then Test Connection again."
            : "Root domain needs A record @ → platform IP. Open Show DNS, then Test Connection again."
    };
  }

  return {
    checkedAt,
    dnsVerified: false,
    dnsMessage: dns.message,
    servesAcn: false,
    sslAutomatic,
    connectionState: "offline",
    summary: "DNS not detected yet.",
    nextStep:
      kind === "subdomain"
        ? `Confirm CNAME ${getSubdomainHostLabel(domainName)} → ${resolveCnameTarget()} at Cloudflare (Proxied is OK), then Test Connection again.`
        : "Add the DNS records shown under Show DNS, wait 5–15 minutes, then Test Connection."
  };
}

export function createDomainsRouter() {
  const router = Router();

  router.get("/config", (_req, res: Response) => {
    const saasConfigured = isCloudflareForSaasConfigured();
    const aRecordTarget = sanitizeARecordTarget(resolveCustomDomainATarget());
    const platformUrl = resolvePlatformHostname();
    const cnameTarget = resolveCnameTarget();
    res.json({
      provider: saasConfigured ? "cloudflare" : "manual",
      platformUrl,
      aRecordTarget,
      cnameTarget,
      selfServeEnabled: saasConfigured,
      sslAutomatic: saasConfigured,
      cloudflareEnvConfigured: saasConfigured,
      autoDnsViaCloudflare: true,
      registrars: [
        { id: "godaddy", name: "GoDaddy", dnsHelpUrl: "https://www.godaddy.com/help/manage-dns-records-680" },
        { id: "namecheap", name: "Namecheap", dnsHelpUrl: "https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/" },
        { id: "cloudflare", name: "Cloudflare", dnsHelpUrl: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/" },
        { id: "hostinger", name: "Hostinger", dnsHelpUrl: "https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records" },
        { id: "porkbun", name: "Porkbun", dnsHelpUrl: "https://kb.porkbun.com/article/68-how-to-edit-dns-records" },
        { id: "dynadot", name: "Dynadot", dnsHelpUrl: "https://www.dynadot.com/community/help/question/set-DNS-settings" },
        { id: "namecom", name: "Name.com", dnsHelpUrl: "https://www.name.com/support/articles/205934547-Managing-DNS-records" }
      ],
      steps: saasConfigured
        ? [
            "Enter your domain and choose which bio page should open.",
            "Connect — ACN registers SSL and can update Cloudflare DNS automatically.",
            "We verify in the background. No double setup at your provider and ACN.",
            "Your bio page opens on your address with HTTPS."
          ]
        : [
            "Enter your domain and choose which bio page should open.",
            "Connect — ACN handles registration on our side automatically.",
            "For Cloudflare domains, paste an API token once and ACN updates DNS for you.",
            "We verify in the background until your address is live."
          ]
    });
  });

  router.get("/analyze", async (req, res: Response) => {
    const domainName = normalizeHostname(req.query.domainName);
    const validationError = assertSupportedCustomDomain(domainName);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      const analysis = await detectDnsProvider(domainName);
      res.json({ analysis: { ...analysis, domainName } });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_ANALYZE_FAILED" });
    }
  });

  router.use(requireAuth);
  // Domain mutations require an explicit bearer token. This prevents a
  // third-party site from using cross-site cookies to add/delete hostnames.
  router.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }
    if (!req.headers.authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Bearer token required.", code: "BEARER_REQUIRED" });
      return;
    }
    next();
  });

  router.post("/check-dns", async (req: AuthedRequest, res: Response) => {
    const domainName = normalizeHostname(req.body?.domainName);
    const validationError = assertSupportedCustomDomain(domainName);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      const dns = await verifyDomainDns(domainName);
      res.json({ dns });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_DNS_CHECK_FAILED" });
    }
  });

  router.get("/", async (req: AuthedRequest, res: Response) => {
    try {
      const rows = await listDomains(req.authUser!.id);
      res.json({ domains: await Promise.all(rows.map(publicDomain)) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_LIST_FAILED" });
    }
  });

  router.post("/:id/test-connection", async (req: AuthedRequest, res: Response) => {
    try {
      let record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }

      const { provider: providerState, providerError } = await resolveCloudflareProviderState(record);
      const test = await runConnectionTest(record.domainName, providerState);
      const status =
        test.connectionState === "live"
          ? ("Verified" as DomainStatus)
          : await resolveFinalStatus(test.dnsVerified, record.domainName, providerState);

      record = await updateDomain(record.id, req.authUser!.id, {
        status,
        dns_verified_at: test.dnsVerified ? test.checkedAt : null,
        last_checked_at: test.checkedAt,
        ...(providerState ? providerPatch(providerState) : {}),
        error_message: test.connectionState === "offline" ? test.dnsMessage : null
      });

      res.status(200).json({
        test,
        domain: await publicDomain(record),
        warning: providerError && test.dnsVerified
          ? "DNS looks correct. Cloudflare SSL registration had an issue — retry Test Connection in a minute."
          : undefined
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_TEST_CONNECTION_FAILED" });
    }
  });

  router.get("/:id/serves-acn", async (req: AuthedRequest, res: Response) => {
    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }

      const servesAcn = await domainServesAcnBio(record.domainName);
      const aTarget = resolveCustomDomainATarget();
      const detected = await getDnsProviderForDomain(record.domainName);
      const label = providerDnsLabel(detected);
      const kind = getCustomDomainKind(record.domainName);
      const cnameTarget = resolveCnameTarget();
      res.json({
        servesAcn,
        message: servesAcn
          ? null
          : kind === "subdomain"
            ? `${record.domainName} does not reach ACN Link yet. At ${label}, set CNAME ${getSubdomainHostLabel(record.domainName)} → ${cnameTarget} and remove any A record.`
            : `${record.domainName} still opens another website (not ACN Link). At ${label}, set A record @ → ${aTarget}, remove duplicate records and old redirects, then verify again.`
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_SERVES_ACN_FAILED" });
    }
  });

  router.post("/", async (req: AuthedRequest, res: Response) => {
    const domainName = normalizeHostname(req.body?.domainName);
    const pageId = String(req.body?.pageId || "").trim();
    const cloudflareApiToken = String(req.body?.cloudflareApiToken || "").trim();
    const validationError = assertSupportedCustomDomain(domainName);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    if (!pageId || !pageBelongsToUser(pageId, req.authUser!.id)) {
      res.status(400).json({ error: "Select a valid website page for this domain." });
      return;
    }

    const existingForPage = await findDomainByPageId(pageId, req.authUser!.id);
    if (existingForPage) {
      res.status(409).json({
        error: `This page is already connected to ${existingForPage.domainName}. Each page can only use one custom domain.`
      });
      return;
    }

    const appHosts = [process.env.APP_URL, process.env.API_URL]
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(String(value).includes("://") ? String(value) : `https://${value}`).hostname;
        } catch {
          return "";
        }
      });
    if (appHosts.includes(domainName)) {
      res.status(400).json({ error: "This hostname is reserved by ACN Link." });
      return;
    }

    const provider = isCloudflareForSaasConfigured() ? "cloudflare" : "manual";
    const kind = getCustomDomainKind(domainName);
    const dnsTarget = resolveCustomDomainATarget();

    try {
      let record = await createDomain({
        id: domainId(),
        ownerUserId: req.authUser!.id,
        pageId,
        domainName,
        dnsTarget,
        provider
      });

      if (provider === "cloudflare") {
        try {
          const registered =
            kind === "subdomain"
              ? { apex: await registerCustomHostname(domainName), www: null }
              : await registerRootDomainHostnames(domainName);
          record = await updateDomain(record.id, req.authUser!.id, providerPatch(registered.apex));
          await appendDomainVerificationLog({
            domainId: record.id,
            ownerUserId: req.authUser!.id,
            event: "cloudflare_register",
            status: registered.www ? "apex_and_www" : "apex_only",
            message: registered.www
              ? `Registered ${domainName} and www.${domainName} with Cloudflare for SaaS.`
              : `Registered ${domainName} with Cloudflare for SaaS.`
          });
        } catch (providerError) {
          record = await updateDomain(record.id, req.authUser!.id, {
            provider_status: "error",
            ssl_status: "error",
            error_message: errorMessage(providerError)
          });
          await appendDomainVerificationLog({
            domainId: record.id,
            ownerUserId: req.authUser!.id,
            event: "cloudflare_register",
            status: "error",
            message: errorMessage(providerError)
          });
        }
      } else {
        record = await updateDomain(record.id, req.authUser!.id, {
          provider_status: "configuration_required",
          error_message: null
        });
      }

      let dnsAutoProvisioned = false;
      let dnsProvisionMessage: string | null = null;

      if (cloudflareApiToken) {
        try {
          const dnsRecords = buildDnsRecordSet(domainName).records;
          const provision = await provisionCloudflareDnsRecords(
            cloudflareApiToken,
            domainName,
            dnsRecords
          );
          dnsAutoProvisioned = provision.success;
          dnsProvisionMessage = provision.message;
          await appendDomainVerificationLog({
            domainId: record.id,
            ownerUserId: req.authUser!.id,
            event: "auto_dns",
            status: "success",
            message: provision.message
          });
        } catch (provisionError) {
          dnsProvisionMessage = errorMessage(provisionError);
          await appendDomainVerificationLog({
            domainId: record.id,
            ownerUserId: req.authUser!.id,
            event: "auto_dns",
            status: "error",
            message: dnsProvisionMessage
          });
        }
      }

      res.status(201).json({
        domain: await publicDomain(record),
        dnsAutoProvisioned,
        dnsProvisionMessage
      });
    } catch (error) {
      const message = errorMessage(error);
      const duplicate = /duplicate|unique/i.test(message);
      res.status(duplicate ? 409 : 500).json({
        error: duplicate ? "This hostname is already connected." : message,
        code: duplicate ? "DOMAIN_EXISTS" : "DOMAIN_CREATE_FAILED"
      });
    }
  });

  router.post("/:id/verify", async (req: AuthedRequest, res: Response) => {
    try {
      let record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }

      const dns = await verifyDomainDns(record.domainName);
      const { provider: providerState, providerError } = await resolveCloudflareProviderState(record);

      if (providerError && !dns.verified) {
        record = await updateDomain(record.id, req.authUser!.id, {
          status: "Pending DNS",
          last_checked_at: dns.checkedAt,
          provider_status: "error",
          ssl_status: "error",
          error_message: dns.message
        });
        res.status(200).json({
          domain: await publicDomain(record),
          dns,
          warning: providerError
        });
        return;
      }

      if (providerError && dns.verified) {
        record = await updateDomain(record.id, req.authUser!.id, {
          status: "DNS Verified",
          dns_verified_at: dns.checkedAt,
          last_checked_at: dns.checkedAt,
          provider_status: "error",
          ssl_status: "error",
          error_message: null
        });
        res.status(200).json({
          domain: await publicDomain(record),
          dns,
          warning:
            "DNS is correct. SSL provider setup failed — click Test Connection again in a minute."
        });
        return;
      }

      let dnsVerified = dns.verified;
      if (!dnsVerified) {
        dnsVerified = await verifyHostnameReachability(record.domainName);
      }
      if (!dnsVerified && providerState?.status === "active") {
        dnsVerified = true;
      }

      const status = await resolveFinalStatus(dnsVerified, record.domainName, providerState);
      record = await updateDomain(record.id, req.authUser!.id, {
        status,
        dns_verified_at: dnsVerified ? dns.checkedAt : null,
        last_checked_at: dns.checkedAt,
        ...(providerState ? providerPatch(providerState) : {}),
        error_message: dnsVerified ? null : dns.message
      });

      await appendDomainVerificationLog({
        domainId: record.id,
        ownerUserId: req.authUser!.id,
        event: "verify_dns",
        status: record.status,
        message: dns.message,
        metadata: { dnsVerified, servesAcn: await domainServesAcnBio(record.domainName) }
      });

      res.status(200).json({
        domain: await publicDomain(record),
        dns
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_VERIFY_FAILED" });
    }
  });

  router.get("/:id/dns-records", async (req: AuthedRequest, res: Response) => {
    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }
      const dns = buildDnsRecordSet(record.domainName);
      res.json({
        domainName: dns.domainName,
        kind: dns.kind,
        records: dns.records,
        ownershipVerification: record.ownershipVerification
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_DNS_RECORDS_FAILED" });
    }
  });

  router.post("/:id/repair-dns", async (req: AuthedRequest, res: Response) => {
    const cloudflareApiToken = String(req.body?.cloudflareApiToken || "").trim();
    if (!cloudflareApiToken) {
      res.status(400).json({ error: "Cloudflare API token is required to repair DNS automatically." });
      return;
    }

    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }

      const dnsRecords = buildDnsRecordSet(record.domainName).records;
      const provision = await provisionCloudflareDnsRecords(
        cloudflareApiToken,
        record.domainName,
        dnsRecords
      );

      await appendDomainVerificationLog({
        domainId: record.id,
        ownerUserId: req.authUser!.id,
        event: "repair_dns",
        status: "success",
        message: provision.message
      });

      const dns = await verifyDomainDns(record.domainName);
      const dnsVerified = dns.verified;
      let providerState: ProviderHostname | null = null;
      if (record.providerHostnameId) {
        try {
          providerState = await getCustomHostname(record.providerHostnameId);
        } catch {
          providerState = null;
        }
      }
      const status = await resolveFinalStatus(dnsVerified, record.domainName, providerState || undefined);
      const updated = await updateDomain(record.id, req.authUser!.id, {
        status,
        dns_verified_at: dnsVerified ? dns.checkedAt : null,
        last_checked_at: dns.checkedAt,
        error_message: dnsVerified ? null : dns.message
      });

      res.json({
        domain: await publicDomain(updated),
        dns,
        dnsAutoProvisioned: provision.success,
        dnsProvisionMessage: provision.message
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_REPAIR_DNS_FAILED" });
    }
  });

  router.patch("/:id", async (req: AuthedRequest, res: Response) => {
    const pageId = String(req.body?.pageId || "").trim();
    if (!pageId || !pageBelongsToUser(pageId, req.authUser!.id)) {
      res.status(400).json({ error: "Select a valid website page for this domain." });
      return;
    }

    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }
      if (record.pageId === pageId) {
        res.json({ domain: await publicDomain(record) });
        return;
      }

      const existingForPage = await findDomainByPageId(pageId, req.authUser!.id);
      if (existingForPage && existingForPage.id !== record.id) {
        res.status(409).json({
          error: `That page is already connected to ${existingForPage.domainName}. Each page can only use one custom domain.`
        });
        return;
      }

      const updated = await updateDomain(record.id, req.authUser!.id, { page_id: pageId });
      await appendDomainVerificationLog({
        domainId: updated.id,
        ownerUserId: req.authUser!.id,
        event: "reassign_page",
        status: updated.status,
        message: `Linked ${updated.domainName} to page ${pageId}.`,
        metadata: { pageId, previousPageId: record.pageId }
      });

      res.json({ domain: await publicDomain(updated) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_PATCH_FAILED" });
    }
  });

  router.get("/:id/status", async (req: AuthedRequest, res: Response) => {
    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }
      const test = await runConnectionTest(record.domainName);
      res.json({
        domain: await publicDomain(record),
        verification: test
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_STATUS_FAILED" });
    }
  });

  router.delete("/:id", async (req: AuthedRequest, res: Response) => {
    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }

      try {
        await deleteCustomHostnamesForDomain(record.domainName, record.providerHostnameId);
      } catch (providerError) {
        console.warn(
          `[domains] Cloudflare cleanup failed for ${record.domainName}, removing from ACN anyway:`,
          providerError
        );
      }

      await removeDomain(record.id, req.authUser!.id);

      await appendDomainVerificationLog({
        domainId: record.id,
        ownerUserId: req.authUser!.id,
        event: "delete",
        status: "removed",
        message: `Removed ${record.domainName} from ACN Link.`
      });

      res.json({ success: true, domainName: record.domainName });
    } catch (error) {
      res.status(502).json({ error: errorMessage(error), code: "DOMAIN_DELETE_FAILED" });
    }
  });

  return router;
}
