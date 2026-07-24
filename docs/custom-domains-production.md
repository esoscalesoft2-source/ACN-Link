# ACN Link production custom domains (root + subdomain)

ACN Link supports **root domains** (`yourbrand.com`) and **subdomains** (`studio.yourbrand.com`).

## Railway variables

```text
APP_URL=https://acnlink.mindflo.today
API_URL=https://acnlink.mindflo.today
CORS_ORIGINS=https://acnlink.mindflo.today,https://www.acnlink.mindflo.today

CUSTOM_DOMAIN_A_TARGET=69.46.46.90
CUSTOM_DOMAIN_CNAME_TARGET=acnlink.mindflo.today

CLOUDFLARE_ZONE_ID=<mindflo.today zone ID>
CLOUDFLARE_API_TOKEN=<scoped token>
CLOUDFLARE_ACCOUNT_ID=<optional account id>
CLOUDFLARE_CUSTOM_HOSTNAME_ENABLED=true
CLOUDFLARE_SSL_VALIDATION_METHOD=http
```

| Variable | Purpose |
|----------|---------|
| `APP_URL` / `API_URL` | ACN Link platform hostname on Railway |
| `CUSTOM_DOMAIN_A_TARGET` | IP shown for root domain A record (`@`) |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Hostname for subdomain CNAME (defaults to `APP_URL` host) |
| `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` | Cloudflare for SaaS + Origin Rule automation |
| `CLOUDFLARE_CUSTOM_HOSTNAME_ENABLED` | `true` = auto-register custom hostnames (default when credentials set) |
| `CLOUDFLARE_SKIP_ORIGIN_REWRITE` | `true` = skip auto Origin Rule upsert |

See **[custom-domains-saas-automation.md](./custom-domains-saas-automation.md)** for the full automatic SaaS flow.

## One-time Cloudflare for SaaS setup

1. Cloudflare → **mindflo.today** → **SSL/TLS** → **Custom Hostnames**.
2. Enable Cloudflare for SaaS.
3. Fallback Origin = `acnlink.mindflo.today` (Active).
4. API token: SSL Edit + Zone Read + Rulesets Edit on `mindflo.today`.
5. Deploy — server creates Host-rewrite Origin Rules automatically.
6. Run `supabase/custom-domains-migration.sql` if not already applied.

## Customer flow

### Subdomain (`studio.yourbrand.com`)

```text
CNAME  studio  →  acnlink.mindflo.today
```

### Root domain (`yourbrand.com`)

```text
A  @  →  CUSTOM_DOMAIN_A_TARGET
```

User adds DNS → Verify → LIVE. No Worker routes. No Railway domain adds.

## Wildcard DNS (platform free URLs)

Free addresses look like `{slug}.acnlink.mindflo.today` (e.g. `krishna.acnlink.mindflo.today`).

In the **mindflo.today** zone (not a bare `*`):

```text
Type: CNAME
Name: *.acnlink
Target: acnlink.mindflo.today
Proxy: Proxied (orange cloud)
```

Without this record, browsers show `DNS_PROBE_FINISHED_NXDOMAIN`.

On deploy, the server upserts this record when `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` are set
(token needs **Zone → DNS → Edit**). Skip with `CLOUDFLARE_SKIP_PLATFORM_WILDCARD_DNS=true`.

For HTTPS on nested hosts (`*.acnlink.mindflo.today`), enable **SSL/TLS → Edge Certificates → Total TLS**
(or an Advanced Certificate covering `*.acnlink.mindflo.today`).

## Security

- Domain CRUD requires authenticated bearer token.
- Each domain maps to one bio page owned by the same user.
- Cloudflare tokens stay on Railway only.
