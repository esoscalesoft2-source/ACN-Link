# acncdplan — Custom Domain Reference (Lovable.dev Workflow)

Reference plan for ACN Link custom domains — **root domain only** (`yourbrand.com`).

PDF (30 screenshots): `docs/acncdplan-screenshots.pdf`

Example: `searchablehowto.com` · DNS: A records `@` + `www` → platform IP

---

## ACN rule

- **Root domain:** `yourbrand.com` — A records `@` + `www` → platform IP
- **Subdomain:** `studio.yourbrand.com`, `links.yourbrand.com`, etc. — CNAME → platform hostname
- User adds records at their registrar (GoDaddy, Namecheap, Cloudflare, etc.)

---

## User flow (step by step)

1. Login ACN Link → publish bio page  
2. Custom Domains → **Connect Domain**  
3. **What domain would you like to connect with ACN Link?** → enter `yourbrand.com` → Continue  
4. **Analyzing your domain** → Analyzed · Detected DNS provider · Getting setup details  
5. **Provider login** (e.g. GoDaddy) → Continue (or add records manually)  
6. **Please add these records** → copy A records → add at registrar  
7. **I have added 2/2 records…** → **You're all set!**  
8. Choose **Which published page should open on this address?** → **Done**  
9. Toast: *Connecting domain…* → success or *Domain not connected*  
10. Click domain name → bio page opens  

---

## Screenshot order (1–30)

See PDF. Covers Lovable Domains UI, wizard, GoDaddy DNS, success/error states.

---

## Production env

```text
CUSTOM_DOMAIN_A_TARGET=76.76.21.21
APP_URL=https://acnlink.mindflo.today
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_API_TOKEN=...
```

See `docs/custom-domains-production.md`.
