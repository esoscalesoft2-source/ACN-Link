import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../auth/routes";
import { getRootStore } from "../db/rootStore";
import {
  deleteCustomHostname,
  getCustomHostname,
  isCloudflareForSaasConfigured,
  registerCustomHostname,
  type ProviderHostname
} from "./cloudflare";
import { detectDnsProvider, domainServesAcnBio, verifyDomainDns, verifyHostnameReachability } from "./dns";
import {
  assertSupportedCustomDomain,
  getCustomDomainKind,
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

function publicDomain(record: CustomDomainRecord) {
  const saasConfigured = isCloudflareForSaasConfigured();
  const kind = getCustomDomainKind(record.domainName);
  const isSubdomain = kind === "subdomain";

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
    errorMessage: record.errorMessage,
    setupHint: buildSetupHint(record, saasConfigured),
    selfServeEnabled: saasConfigured,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function buildSetupHint(record: CustomDomainRecord, saasConfigured: boolean): string | null {
  if (record.status === "Verified") {
    return "Your domain is live with HTTPS. Share this address with visitors.";
  }
  if (record.status === "Provisioning SSL") {
    return saasConfigured
      ? "DNS is correct. SSL certificate is being issued — this usually takes a few minutes."
      : "DNS is correct. Waiting for SSL to finish provisioning.";
  }
  if (record.status === "DNS Verified") {
    return saasConfigured
      ? "DNS is verified. SSL is still provisioning — click Test Connection in a minute."
      : "DNS is verified. Click Test Connection — when your domain reaches ACN Link, status becomes Verified.";
  }
  if (record.status === "Pending DNS") {
    const kind = getCustomDomainKind(record.domainName);
    if (kind === "subdomain") {
      const hostLabel = getSubdomainHostLabel(record.domainName);
      const cnameTarget = resolveCnameTarget();
      return `Cloudflare DNS: CNAME · Name ${hostLabel} · Target ${cnameTarget} (Proxied). Then click Test.`;
    }
    const aTarget = resolveCustomDomainATarget();
    return (
      `Cloudflare DNS: two A records — Name www → ${aTarget} and Name @ → ${aTarget} (Proxied). ` +
      `Remove old Hostinger A records. Root domains on Railway also need a Cloudflare Worker (see docs). Then click Test.`
    );
  }
  return record.errorMessage;
}

function providerPatch(provider: ProviderHostname) {
  return {
    provider: "cloudflare",
    provider_hostname_id: provider.id,
    provider_status: provider.status,
    ssl_status: provider.sslStatus,
    ownership_verification:
      provider.ownershipVerification || provider.ownershipVerificationHttp || null,
    error_message: null
  };
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

async function runConnectionTest(domainName: string): Promise<DomainConnectionTest & { checkedAt: string }> {
  const dns = await verifyDomainDns(domainName);
  const servesAcn = await domainServesAcnBio(domainName);
  const sslAutomatic = isCloudflareForSaasConfigured();
  const checkedAt = dns.checkedAt;

  if (dns.verified && servesAcn) {
    return {
      checkedAt,
      dnsVerified: true,
      dnsMessage: dns.message,
      servesAcn: true,
      sslAutomatic,
      connectionState: "live",
      summary: `${domainName} is connected and serving ACN Link.`,
      nextStep: null
    };
  }

  if (dns.verified) {
    return {
      checkedAt,
      dnsVerified: true,
      dnsMessage: dns.message,
      servesAcn: false,
      sslAutomatic,
      connectionState: "connecting",
      summary: "DNS records look correct, but this domain does not reach ACN Link yet.",
      nextStep: sslAutomatic
        ? "SSL is still provisioning. Wait a few minutes, then Test Connection again."
        : "Confirm DNS points to ACN (A → platform IP or CNAME → acnlink.mindflo.today) and that traffic reaches our server."
    };
  }

  return {
    checkedAt,
    dnsVerified: false,
    dnsMessage: dns.message,
    servesAcn: false,
    sslAutomatic,
    connectionState: "offline",
    summary: dns.message,
    nextStep: "Add the DNS records shown under Show DNS, wait 5–15 minutes, then Test Connection."
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
            "Click Connect Domain, enter your domain, and choose which published bio page should open.",
            "Add the DNS records ACN shows at your provider (A records for root domains, CNAME for subdomains).",
            "Confirm records are added, then ACN verifies DNS and issues HTTPS.",
            "Your bio page opens on your address with HTTPS."
          ]
        : [
            "Click Connect Domain, enter your domain, and choose which published bio page should open.",
            "Add the DNS records ACN shows at your provider.",
            "Confirm records are added, then ACN verifies DNS automatically.",
            "Automatic HTTPS requires Cloudflare for SaaS (see docs/custom-domains-production.md)."
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
      res.json({ domains: rows.map(publicDomain) });
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

      const test = await runConnectionTest(record.domainName);
      let providerState: ProviderHostname | undefined;

      if (isCloudflareForSaasConfigured() && record.providerHostnameId) {
        try {
          providerState = await getCustomHostname(record.providerHostnameId);
        } catch {
          // keep manual reachability result
        }
      }

      const status = await resolveFinalStatus(test.dnsVerified, record.domainName, providerState);
      record = await updateDomain(record.id, req.authUser!.id, {
        status,
        dns_verified_at: test.dnsVerified ? test.checkedAt : null,
        last_checked_at: test.checkedAt,
        ...(providerState ? providerPatch(providerState) : {}),
        error_message: test.connectionState === "offline" ? test.dnsMessage : null
      });

      res.status(200).json({
        test,
        domain: publicDomain(record)
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
      res.json({
        servesAcn,
        message: servesAcn
          ? null
          : `${record.domainName} still opens another website (not ACN Link). Set @ and www A records to ${aTarget} in Cloudflare, remove duplicate root A records and old Hostinger redirects, then verify again.`
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_SERVES_ACN_FAILED" });
    }
  });

  router.post("/", async (req: AuthedRequest, res: Response) => {
    const domainName = normalizeHostname(req.body?.domainName);
    const pageId = String(req.body?.pageId || "").trim();
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
    const dnsTarget =
      kind === "subdomain"
        ? resolveCnameTarget()
        : resolveCustomDomainATarget();

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
          const registered = await registerCustomHostname(domainName);
          record = await updateDomain(record.id, req.authUser!.id, providerPatch(registered));
        } catch (providerError) {
          record = await updateDomain(record.id, req.authUser!.id, {
            provider_status: "error",
            ssl_status: "error",
            error_message: errorMessage(providerError)
          });
        }
      } else {
        record = await updateDomain(record.id, req.authUser!.id, {
          provider_status: "configuration_required",
          error_message: null
        });
      }

      res.status(201).json({ domain: publicDomain(record) });
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
      let providerState: ProviderHostname | undefined;

      if (isCloudflareForSaasConfigured()) {
        try {
          if (!record.providerHostnameId) {
            providerState = await registerCustomHostname(record.domainName);
          } else {
            providerState = await getCustomHostname(record.providerHostnameId);
          }
        } catch (providerError) {
          let dnsVerified = dns.verified;
          if (!dnsVerified) {
            dnsVerified = await verifyHostnameReachability(record.domainName);
          }
          record = await updateDomain(record.id, req.authUser!.id, {
            status: dnsVerified ? "DNS Verified" : "Pending DNS",
            dns_verified_at: dnsVerified ? dns.checkedAt : null,
            last_checked_at: dns.checkedAt,
            provider_status: "error",
            ssl_status: "error",
            error_message: errorMessage(providerError)
          });
          res.status(200).json({
            domain: publicDomain(record),
            dns,
            warning: "DNS was checked, but SSL provider status could not be updated."
          });
          return;
        }
      }

      // Cloudflare's active custom-hostname status is also authoritative proof
      // that the hostname routes to this SaaS zone (including proxied CNAMEs,
      // where public DNS resolvers intentionally return Cloudflare A records).
      let dnsVerified = dns.verified;
      if (!dnsVerified) {
        dnsVerified = await verifyHostnameReachability(record.domainName);
      }
      const status = await resolveFinalStatus(dnsVerified, record.domainName, providerState);
      record = await updateDomain(record.id, req.authUser!.id, {
        status,
        dns_verified_at: dnsVerified ? dns.checkedAt : null,
        last_checked_at: dns.checkedAt,
        ...(providerState ? providerPatch(providerState) : {}),
        error_message: !dnsVerified
          ? dns.message
          : providerState
            ? null
            : record.provider === "manual" && record.status === "DNS Verified"
              ? null
              : record.provider === "manual"
                ? null
                : "DNS is verified, but automatic SSL is not configured."
      });

      res.status(200).json({
        domain: publicDomain(record),
        dns
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "DOMAIN_VERIFY_FAILED" });
    }
  });

  router.delete("/:id", async (req: AuthedRequest, res: Response) => {
    try {
      const record = await findDomainById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Domain not found." });
        return;
      }
      if (record.providerHostnameId && isCloudflareForSaasConfigured()) {
        await deleteCustomHostname(record.providerHostnameId);
      }
      await removeDomain(record.id, req.authUser!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(502).json({ error: errorMessage(error), code: "DOMAIN_DELETE_FAILED" });
    }
  });

  return router;
}
