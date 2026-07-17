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
import { getCustomDomainPlatformConfig } from "./platformConfig";
import { verifyDomainDns, verifyHostnameReachability } from "./dns";
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

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z0-9-]{2,63}(?<!-)$/i;

function normalizeHostname(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

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
  const dnsHostLabel = (() => {
    const labels = record.domainName.split(".").filter(Boolean);
    if (labels.length <= 2) return "@";
    return labels[0];
  })();

  return {
    id: record.id,
    pageId: record.pageId,
    domainName: record.domainName,
    type: "CNAME",
    dnsTarget: record.dnsTarget,
    dnsHostLabel,
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
    return `Add a CNAME record: Host ${dnsHostLabelFor(record.domainName)} → ${record.dnsTarget}, then click Check DNS and SSL.`;
  }
  return record.errorMessage;
}

function dnsHostLabelFor(domainName: string): string {
  const labels = domainName.split(".").filter(Boolean);
  if (labels.length <= 2) return "@";
  return labels[0];
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
    res.json(getCustomDomainPlatformConfig());
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
    if (!HOSTNAME_PATTERN.test(domainName)) {
      res.status(400).json({ error: "Enter a valid hostname such as links.example.com." });
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

    const appHosts = [
      process.env.APP_URL,
      process.env.API_URL,
      process.env.CUSTOM_DOMAIN_CNAME_TARGET
    ]
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
    const dnsTarget =
      process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || "acnlink.mindflo.today";

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
