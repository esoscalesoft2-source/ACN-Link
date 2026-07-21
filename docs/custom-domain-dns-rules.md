# Custom domain DNS rules (ACN Link default)

## Rule 1 — Root domain

Connect `example.com` → show **A record only**.

```
Type:  A
Name:  @
Value: <hosting provider IP>   (ACN: CUSTOM_DOMAIN_A_TARGET, e.g. 69.46.46.90)
```

Examples: `ezysellonline.com`, `vickysystemcare.com`

Do **not** show CNAME for root unless the hosting provider explicitly requires it.

For `www.example.com`, the customer connects it as a **separate subdomain** (Rule 2).

---

## Rule 2 — Subdomain

Connect `king.example.com`, `www.example.com`, `app.example.com` → show **CNAME only**.

```
Type:  CNAME
Name:  king          (prefix only — not the full domain)
Value: <hosting provider hostname>   (ACN: acnlink.mindflo.today)
```

Do **not** show or accept A records for subdomains.

Do **not** show Cloudflare ownership TXT (or any TXT) in Connect Domain / Show DNS.
Users only add A (root) or CNAME (subdomain). SSL ownership is handled by the platform.

---

## Implementation map

| Layer | File |
|-------|------|
| Record builder (server) | `server/domains/dnsRecords.ts` |
| DNS verification (server) | `server/domains/dns.ts` |
| Record builder (client) | `src/lib/customDomainDns.ts` |
| Connect wizard | `src/components/customDomains/ConnectDomainWizard.tsx` |
| Domain list / Show DNS | `src/components/CustomDomainsScreen.tsx`, `DomainDnsPanel.tsx` |
| Auto DNS (Cloudflare) | `server/domains/cloudflareDns.ts` |
