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
APP_URL=https://acnlink.mindflo.today
API_URL=https://acnlink.mindflo.today
CUSTOM_DOMAIN_CNAME_TARGET=acnlink.mindflo.today
CORS_ORIGINS=https://acnlink.mindflo.today

CLOUDFLARE_ZONE_ID=<paste from Cloudflare — see below>
CLOUDFLARE_API_TOKEN=<paste from Cloudflare — see below>
CLOUDFLARE_SSL_VALIDATION_METHOD=http
```

> **Railway free plan (1 custom domain):** use `acnlink.mindflo.today` as
> `CUSTOM_DOMAIN_CNAME_TARGET`. Do not add `domains.acnlink.mindflo.today` on
> Railway — you will hit the custom-domain limit. Paid plans can use a separate
> fallback hostname such as `domains.acnlink.mindflo.today`.

Existing variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`,
`NODE_ENV`) remain required.

## Where to copy each Cloudflare value (step by step)

### 1. `CLOUDFLARE_ZONE_ID`

This is the ID of your **platform zone** (`mindflo.today`), not a customer domain.

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Click the **mindflo.today** site (not a customer’s domain).
3. On **Overview**, scroll down the right-hand column.
4. Under **API**, copy **Zone ID** (32-character hex string, e.g. `a1b2c3d4e5f6...`).
5. Paste into Railway as:
   ```text
   CLOUDFLARE_ZONE_ID=a1b2c3d4e5f6789012345678901234ab
   ```

**Do not** copy Account ID — only **Zone ID** for `mindflo.today`.

---

### 2. `CLOUDFLARE_API_TOKEN`

Create a **scoped token** (never use the Global API Key).

1. Cloudflare Dashboard → click your **profile icon** (top right).
2. **My Profile** → left menu **API Tokens**.
3. Click **Create Token**.
4. Choose **Create Custom Token** (recommended) or start from **Edit zone DNS** and customize.

**Custom token settings:**

| Field | Value |
|--------|--------|
| Token name | `ACN Link Custom Hostnames` |
| Permissions | **Zone** → **SSL and Certificates** → **Edit** |
| Permissions | **Zone** → **Custom Hostnames** → **Edit** (if listed) |
| Zone Resources | **Include** → **Specific zone** → **mindflo.today** |

5. Click **Continue to summary** → **Create Token**.
6. **Copy the token immediately** (shown once only). It looks like a long random string.
7. Paste into Railway as:
   ```text
   CLOUDFLARE_API_TOKEN=paste_the_full_token_here
   ```

Store it only in **Railway Variables** (or local `.env` for dev). Never commit to git or put in Vercel/browser code.

**Test the token (optional):** after saving on Railway, redeploy and open:

`https://acnlink.mindflo.today/api/domains/config`

You should see `"provider": "cloudflare"` and `"selfServeEnabled": true`.

---

### 3. `CLOUDFLARE_SSL_VALIDATION_METHOD=http`

**You do not copy this from Cloudflare.** Type it yourself in Railway:

```text
CLOUDFLARE_SSL_VALIDATION_METHOD=http
```

| Value | Meaning |
|--------|---------|
| `http` | **Recommended.** Cloudflare proves domain control over HTTP when the customer CNAME points to your platform. |
| `txt` | Uses TXT records for validation (more steps for customers). |
| `cname` | CNAME-based DCV (less common for your setup). |

Leave as **`http`** unless Cloudflare support tells you otherwise.

---

### 4. Enable Cloudflare for SaaS (before tokens work end-to-end)

1. Cloudflare → **mindflo.today** zone.
2. **SSL/TLS** → **Custom Hostnames** (may appear as **Cloudflare for SaaS**).
3. If prompted, enable Cloudflare for SaaS on this zone.
4. Set **Fallback Origin** to:
   - **Free Railway:** `acnlink.mindflo.today`
   - **Paid Railway (optional):** `domains.acnlink.mindflo.today`
5. Save.

Free / Pro / Business plans include **100 custom hostnames** at no extra charge; additional hostnames are billed per Cloudflare’s SaaS pricing.

---

### 5. Paste everything in Railway

1. [Railway](https://railway.app) → project **ACN-Link** → your service.
2. **Variables** tab.
3. Add or update each variable (no quotes needed in Railway UI).
4. **Deploy** / wait for redeploy.
5. Confirm: `GET https://acnlink.mindflo.today/api/domains/config` → `selfServeEnabled: true`.


## Customer flow (self-serve — no ACN admin per domain)

When `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are set on Railway, **every user**
connects their own domain without anyone logging into Cloudflare for each customer:

1. User opens **Custom Domains** → **Connect Domain**, enters `links.customer.com`, and picks a published page.
2. ACN Link registers the hostname with Cloudflare for SaaS automatically.
3. UI shows one CNAME record: `links` → `acnlink.mindflo.today` (or your `CUSTOM_DOMAIN_CNAME_TARGET`).
4. User adds that CNAME at GoDaddy, Namecheap, Cloudflare, or any DNS provider.
5. User clicks **Check DNS and SSL**. Status progresses: Pending DNS → Provisioning SSL → **Verified**.
6. `https://links.customer.com` serves the linked bio page with managed HTTPS.

**No manual Cloudflare Worker** is required per customer in this mode.

### Without Cloudflare for SaaS (dev / legacy)

If Railway env vars are missing, the app runs in **manual** mode. DNS verification still works,
but each customer domain may need a Cloudflare Worker on the customer's zone (see
`docs/cloudflare-worker-free-custom-domain.md`). That path is for **one-off tests**, not production
multi-tenant self-serve.

## Customer flow (technical detail)

1. User chooses a published website and enters `links.customer.com`.
2. Backend stores the hostname under the authenticated user's ID and registers
   it as a Cloudflare custom hostname.
3. UI instructs the customer to create:

   ```text
   CNAME links → acnlink.mindflo.today
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
