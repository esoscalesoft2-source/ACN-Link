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
import { detectDnsProvider, verifyDomainDns, verifyHostnameReachability } from "./dns";
import {
  assertSupportedCustomDomain,
  getCustomDomainKind,
  getSubdomainHostLabel,
  normalizeHostname,
  resolveCnameTarget
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
      ? "DNS is verified. SSL should finish automatically — click Check DNS and SSL again in a minute."
      : "DNS is verified. Your site can route traffic once platform SSL is enabled for your hostname.";
  }
  if (record.status === "Pending DNS") {
    const kind = getCustomDomainKind(record.domainName);
    if (kind === "subdomain") {
      const hostLabel = getSubdomainHostLabel(record.domainName);
      const cnameTarget = resolveCnameTarget();
      return `Add a CNAME record at your DNS provider: Host ${hostLabel} → ${cnameTarget}, then verify here.`;
    }
    const aTarget = process.env.CUSTOM_DOMAIN_A_TARGET?.trim() || "76.76.21.21";
    return `Add A records at your DNS provider: www → ${aTarget} and @ → ${aTarget}, then verify here.`;
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

function finalStatus(dnsVerified: boolean, provider?: ProviderHostname): DomainStatus {
  if (!dnsVerified) return "Pending DNS";
  if (!provider) return "DNS Verified";
  if (provider.status === "active" && provider.sslStatus === "active") return "Verified";
  return "Provisioning SSL";
}

export function createDomainsRouter() {
  const router = Router();

  router.get("/config", (_req, res: Response) => {
    const saasConfigured = isCloudflareForSaasConfigured();
    const aRecordTarget =
      process.env.CUSTOM_DOMAIN_A_TARGET?.trim() || "76.76.21.21";
    const platformUrl =
      process.env.APP_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ||
      "acnlink.mindflo.today";
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
            "Click Connect Domain and enter your domain or subdomain (yourbrand.com or studio.yourbrand.com).",
            "Add the DNS records ACN shows at your provider (A records for root domains, CNAME for subdomains).",
            "Choose which published bio page should open on that address.",
            "Your bio page opens on your address with HTTPS."
          ]
        : [
            "Click Connect Domain and enter your domain or subdomain (yourbrand.com or studio.yourbrand.com).",
            "Add the DNS records ACN shows at your provider.",
            "Choose which published bio page should open on that address.",
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
        : process.env.CUSTOM_DOMAIN_A_TARGET?.trim() || "76.76.21.21";

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
      dnsVerified = dnsVerified || providerState?.status === "active";
      const status = finalStatus(dnsVerified, providerState);
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
