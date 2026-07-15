# ACN Link production custom domains

The application uses Cloudflare for SaaS for customer-hostname registration and
certificate lifecycle. Railway remains the origin.

## One-time infrastructure setup

1. In Railway, add `domains.acnlink.mindflo.today` as another custom domain for
   the ACN-Link service on port 8080.
2. Add Railway's requested CNAME and ownership TXT records in Cloudflare. Keep
   the CNAME DNS-only until Railway validates and issues its origin certificate.
3. Turn the `domains.acnlink` CNAME to **Proxied** after Railway validation.
4. In Cloudflare **SSL/TLS → Custom Hostnames (Cloudflare for SaaS)**, set
   `domains.acnlink.mindflo.today` as the fallback origin.
5. Create a scoped Cloudflare API token for the `mindflo.today` zone with
   custom-hostname / SSL certificate edit permission. Never expose it to Vercel
   or browser code.
6. Run `supabase/custom-domains-migration.sql` once in Supabase SQL Editor.

## Railway variables

```text
API_URL=https://api.acnlink.mindflo.today
CUSTOM_DOMAIN_CNAME_TARGET=domains.acnlink.mindflo.today
CLOUDFLARE_ZONE_ID=<mindflo.today zone id>
CLOUDFLARE_API_TOKEN=<scoped secret token>
CLOUDFLARE_SSL_VALIDATION_METHOD=http
```

Existing variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`,
`APP_URL`, `CORS_ORIGINS`, `NODE_ENV`) remain required.

## Customer flow

1. User chooses a published website and enters `links.customer.com`.
2. Backend stores the hostname under the authenticated user's ID and registers
   it as a Cloudflare custom hostname.
3. UI instructs the customer to create:

   ```text
   CNAME links → domains.acnlink.mindflo.today
   ```

4. Verify performs live DNS resolution and refreshes Cloudflare hostname/SSL
   status. `Verified` requires active Cloudflare for SaaS SSL. Without SaaS,
   `DNS Verified` is enough for routing when the customer uses a Cloudflare
   Worker (see `docs/cloudflare-worker-free-custom-domain.md`).
5. Cloudflare (SaaS or customer Worker) forwards traffic to Railway. The server
   reads `X-Forwarded-Host` (or `Host`), resolves a **DNS Verified** or
   **Verified** hostname to its stored page, and serves the published website.

## Railway single-domain limit (free test)

Railway free/hobby plans often allow only one custom domain on the service
(`acnlink.mindflo.today`). Customer hostnames such as `links.customer.com`
cannot be added on Railway directly.

For a free test on a customer zone you control:

1. Customer CNAME: `links` → `acnlink.mindflo.today` (Proxied).
2. ACN Link shows **DNS Verified**.
3. Deploy a Cloudflare Worker on `links.customer.com` per
   `docs/cloudflare-worker-free-custom-domain.md`.

The Worker sends `Host: acnlink.mindflo.today` so Railway accepts the request,
and `X-Forwarded-Host: links.customer.com` so ACN Link routes correctly.

## Security notes

- Domain CRUD requires an ACN Link access token.
- Every query filters by `owner_user_id`.
- A domain can map only to a page owned by the same authenticated user.
- `service_role` and Cloudflare API tokens belong only in Railway.
- The old hardcoded A-record IP and timer-based verification are removed.
