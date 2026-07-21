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
CLOUDFLARE_SSL_VALIDATION_METHOD=http
# Leave OFF on Railway free (1 custom domain). SaaS hostnames send Host: customer-domain → Railway 404.
# CLOUDFLARE_REGISTER_CUSTOM_HOSTNAMES=true
```

| Variable | Purpose |
|----------|---------|
| `APP_URL` / `API_URL` | ACN Link platform hostname on Railway |
| `CUSTOM_DOMAIN_A_TARGET` | IP shown for root domain A record (`@`) |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Hostname shown for subdomain CNAME records (defaults to `APP_URL` host) |
| `CLOUDFLARE_*` | Optional: cleanup / future SaaS; registration is **off by default** |
| `CLOUDFLARE_REGISTER_CUSTOM_HOSTNAMES` | Set `true` only if origin accepts any Host (not Railway free) |

## Recommended path (Railway free + Cloudflare Worker)

1. Customer DNS: `CNAME subdomain → acnlink.mindflo.today` (Proxied).
2. On the **customer Cloudflare zone**: Worker `acnlink-custom-domain-proxy` with route `*.customer.com/*` (rewrites `Host` to `acnlink.mindflo.today`).
3. Do **not** add those hostnames under `mindflo.today` → Custom Hostnames (SaaS).
4. ACN verifies with DNS + live `/api/health` only (`Verified` = actually reachable).

## Optional Cloudflare for SaaS (not for Railway free)

1. Cloudflare → **mindflo.today** → **SSL/TLS** → **Custom Hostnames**.
2. Enable Cloudflare for SaaS; Fallback Origin = `acnlink.mindflo.today`.
3. Set `CLOUDFLARE_REGISTER_CUSTOM_HOSTNAMES=true` on Railway **only** if Railway/origin accepts customer Host headers (or you rewrite Host at the edge).
4. Run `supabase/custom-domains-migration.sql` in Supabase SQL Editor.

## Wildcard DNS (Phase 3 — one-time in Cloudflare)

In the **mindflo.today** zone, add:

```text
CNAME  *  →  acnlink.mindflo.today   (Proxied)
```

This lets `{slug}.acnlink.mindflo.today` reach Railway without per-slug DNS records.

## Customer flow

### Root domain (`yourbrand.com`)

1. User opens **Custom Domains** → **Connect Domain** → enters `yourbrand.com`.
2. ACN shows one A record:

   ```text
   A  @  →  CUSTOM_DOMAIN_A_TARGET
   ```

3. User adds the record at their DNS provider and verifies.

   For `www.yourbrand.com`, connect it as a **separate subdomain** (CNAME `www` → platform hostname).

### Subdomain (`studio.yourbrand.com`)

1. User enters the full subdomain (e.g. `vickys-trx-fitness-studio.wheree.com`).
2. ACN shows one CNAME record:

   ```text
   CNAME  vickys-trx-fitness-studio  →  CUSTOM_DOMAIN_CNAME_TARGET
   ```

3. User must have permission to edit DNS for the parent zone (`wheree.com`).
4. Verify → **Verified** → the subdomain serves the bio page with HTTPS.

## Security

- Domain CRUD requires authenticated bearer token.
- Each domain maps to one bio page owned by the same user.
- Cloudflare tokens stay on Railway only.
