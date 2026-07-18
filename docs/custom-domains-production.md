# ACN Link production custom domains (root + subdomain)

ACN Link supports **root domains** (`yourbrand.com`) and **subdomains** (`studio.yourbrand.com`).

## Railway variables

```text
APP_URL=https://acnlink.mindflo.today
API_URL=https://acnlink.mindflo.today
CORS_ORIGINS=https://acnlink.mindflo.today,https://www.acnlink.mindflo.today

CUSTOM_DOMAIN_A_TARGET=76.76.21.21
CUSTOM_DOMAIN_CNAME_TARGET=acnlink.mindflo.today

CLOUDFLARE_ZONE_ID=<mindflo.today zone ID>
CLOUDFLARE_API_TOKEN=<scoped token>
CLOUDFLARE_SSL_VALIDATION_METHOD=http
```

| Variable | Purpose |
|----------|---------|
| `APP_URL` / `API_URL` | ACN Link platform hostname on Railway |
| `CUSTOM_DOMAIN_A_TARGET` | IP shown for root domain A records (`@` and `www`) |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Hostname shown for subdomain CNAME records (defaults to `APP_URL` host) |
| `CLOUDFLARE_*` | Cloudflare for SaaS — automatic HTTPS per customer hostname |

## One-time Cloudflare for SaaS setup

1. Cloudflare → **mindflo.today** zone → **SSL/TLS** → **Custom Hostnames**.
2. Enable Cloudflare for SaaS if prompted.
3. Set **Fallback Origin** to `acnlink.mindflo.today` (your Railway custom domain).
4. Create API token with Custom Hostnames + SSL edit on `mindflo.today`.
5. Run `supabase/custom-domains-migration.sql` in Supabase SQL Editor.

See earlier sections in git history for detailed Cloudflare token steps, or copy Zone ID / token from Cloudflare dashboard.

## Customer flow

### Root domain (`yourbrand.com`)

1. User opens **Custom Domains** → **Connect Domain** → enters `yourbrand.com`.
2. ACN shows two A records:

   ```text
   A  www  →  CUSTOM_DOMAIN_A_TARGET
   A  @    →  CUSTOM_DOMAIN_A_TARGET
   ```

3. User adds records at their DNS provider and verifies.

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
