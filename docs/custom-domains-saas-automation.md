# ACN Link — automatic custom domains (Cloudflare for SaaS)

## User experience (no admin work)

1. Login → create bio page  
2. Connect Domain → enter `tree.example.com`  
3. Copy DNS (CNAME only for subdomains)  
4. Add DNS at registrar  
5. Click Verify / Test Connection  
6. Status → **LIVE**

No Worker routes per customer.  
No Railway custom domains per customer.  
Railway keeps **only** `acnlink.mindflo.today`.

## Architecture

```text
Customer browser
  → DNS CNAME → acnlink.mindflo.today
  → Cloudflare for SaaS (SSL on customer hostname)
  → Origin Rule (mindflo.today, one-time):
       acn-customer-host = original host
       Host / SNI → acnlink.mindflo.today
  → Railway (single hostname)
  → Express routes bio page via acn-customer-host / X-Forwarded-Host
```

## Railway environment

```text
CLOUDFLARE_ZONE_ID=<mindflo.today zone id>
CLOUDFLARE_API_TOKEN=<token: SSL and Certificates Edit + Zone Read + Zone Rulesets Edit>
CLOUDFLARE_ACCOUNT_ID=<optional>
CLOUDFLARE_CUSTOM_HOSTNAME_ENABLED=true
CLOUDFLARE_SSL_VALIDATION_METHOD=http
CUSTOM_DOMAIN_CNAME_TARGET=acnlink.mindflo.today
CUSTOM_DOMAIN_A_TARGET=69.46.46.90
```

Set `CLOUDFLARE_CUSTOM_HOSTNAME_ENABLED=false` only if you intentionally disable SaaS registration.

## One-time Cloudflare setup (admin, once)

1. Enable **Cloudflare for SaaS** on `mindflo.today`.  
2. Fallback Origin = `acnlink.mindflo.today` (Active).  
3. Deploy ACN Link — on boot the server upserts Origin Rules automatically:
   - Transform: set `acn-customer-host` + `X-Forwarded-Host` from `http.host`
   - Origin: set Host header + SNI to `acnlink.mindflo.today` when host ≠ platform  
4. If API lacks Rulesets permission, create the same Origin Rule manually under  
   **Rules → Origin Rules** / **Transform Rules**.

Token needs at least:

- Zone → SSL and Certificates → Edit  
- Zone → Zone → Read  
- Zone → Zone WAF / Zone Rulesets → Edit (for Origin Rule automation)

## Status machine

| Status | Meaning |
|--------|---------|
| Pending DNS / Connecting | DNS not detected yet |
| DNS Verified / DNS OK | CNAME/A correct |
| Provisioning SSL | Cloudflare custom hostname / cert in progress |
| Waiting SSL | Cert active, waiting for live route |
| Verified / LIVE | `https://domain/api/health` returns ACN `status: ok` |
| Error / Failed | Provider or validation error — Retry |

SSL poller retries every ~2 minutes for pending domains.

## Free-plan Host rewrite (no Enterprise Origin Rules)

Host Header rewrite in Origin Rules is **Enterprise-only**.

Use this instead (one-time):

1. DNS: `cf-saas-origin` → CNAME → `acnlink.mindflo.today` (Proxied)
2. Fallback Origin = `cf-saas-origin.mindflo.today` (Active)
3. Worker `acnlink-custom-domain-proxy` with code from `workers/custom-domain-proxy.js`
4. Worker route on **mindflo.today**:

```text
*/*
```

   (Not only `cf-saas-origin…/*` — SaaS requests use the **customer** Host header.)

5. Custom Hostnames auto-register via API when users Connect Domain.

Traffic:

```text
tree.customer.com
  → Cloudflare for SaaS (SSL Active)
  → Worker */* on mindflo.today (Host → acnlink.mindflo.today)
  → Railway
  → ACN bio page
```

