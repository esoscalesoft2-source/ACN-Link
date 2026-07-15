# Google & GitHub login — production setup (Railway)

ACN Link already supports real OAuth. Email/password works out of the box; Google and GitHub need one-time app registration and Railway environment variables.

Production URL used below: **`https://acnlink.mindflo.today`**

---

## Railway variables (required)

In Railway → ACN-Link service → **Variables**, add:

```text
APP_URL=https://acnlink.mindflo.today
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
AUTH_ALLOW_DEV_OAUTH=false
VITE_AUTH_PREVIEW=false
```

Redeploy after saving.

Verify:

```text
GET https://acnlink.mindflo.today/api/auth/config
```

Expect:

```json
{
  "googleEnabled": true,
  "githubEnabled": true,
  "googleClientId": "...",
  "githubClientId": "...",
  "githubRedirectUri": "https://acnlink.mindflo.today/"
}
```

---

## Part 1 — Google Sign-In

### 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `ACN Link`)
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal if Google Workspace)
   - App name: `ACN Link`
   - User support email: your email
   - Authorized domains: `mindflo.today`
   - Save
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `ACN Link Production`
   - **Authorized JavaScript origins:**
     ```text
     https://acnlink.mindflo.today
     ```
   - **Authorized redirect URIs:** (optional for token flow; add for safety)
     ```text
     https://acnlink.mindflo.today
     https://acnlink.mindflo.today/
     ```
5. Copy **Client ID** → `GOOGLE_CLIENT_ID`
6. Copy **Client secret** → `GOOGLE_CLIENT_SECRET`

### 2. Test Google login

1. Open `https://acnlink.mindflo.today`
2. Click **Google**
3. Pick a Google account
4. You should land in the dashboard (real JWT session, not preview)

---

## Part 2 — GitHub Sign-In

### 1. GitHub OAuth App

1. GitHub → **Settings** (your profile) → **Developer settings**
2. **OAuth Apps → New OAuth App**
3. Fill:

| Field | Value |
|--------|--------|
| Application name | `ACN Link` |
| Homepage URL | `https://acnlink.mindflo.today` |
| Authorization callback URL | `https://acnlink.mindflo.today/` |

4. **Register application**
5. Copy **Client ID** → `GITHUB_CLIENT_ID`
6. **Generate a new client secret** → `GITHUB_CLIENT_SECRET`

> Callback URL must match exactly: `https://acnlink.mindflo.today/` (trailing slash included).

### 2. Test GitHub login

1. Click **GitHub** on the login page
2. Authorize the app on GitHub
3. Browser returns to `https://acnlink.mindflo.today/?code=...`
4. App exchanges the code and logs you in

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Google Sign-In is not configured` | Set `GOOGLE_CLIENT_ID` on Railway and redeploy |
| `GitHub Sign-In is not configured` | Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` |
| Google popup blocked | Allow popups for `acnlink.mindflo.today` |
| Google `origin_mismatch` | Add `https://acnlink.mindflo.today` to Authorized JavaScript origins |
| GitHub redirect URI mismatch | Callback URL must be exactly `https://acnlink.mindflo.today/` |
| OAuth works but Custom Domains fail | Log out preview tokens; use real login (`VITE_AUTH_PREVIEW=false`) |
| Session expired after OAuth | Clear site data once; ensure `AUTH_SECRET` is set on Railway |

---

## Security notes

- Never put `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_SECRET` in frontend code or Vercel `VITE_*` vars.
- Only `GOOGLE_CLIENT_ID` is exposed to the browser (via `/api/auth/config`) — this is normal for OAuth public clients.
- Keep `AUTH_ALLOW_DEV_OAUTH=false` in production so fake OAuth cannot bypass real providers.
