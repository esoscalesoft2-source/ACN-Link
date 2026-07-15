# Google & GitHub login — production setup (Railway)

ACN Link supports real OAuth when these Railway variables are set. Email/password continues to work without them.

## Required Railway variables (all services)

```text
APP_URL=https://acnlink.mindflo.today
NODE_ENV=production
AUTH_EXPOSE_TOKENS=false
AUTH_ALLOW_DEV_OAUTH=false
VITE_AUTH_PREVIEW=false
```

---

## Google Sign-In

### 1) Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `ACN Link`
   - Support email: your email
   - Scopes: `email`, `profile`, `openid`
   - Add test users while app is in **Testing** (or publish app for everyone)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `ACN Link Production`
   - **Authorized JavaScript origins:**
     ```text
     https://acnlink.mindflo.today
     ```
   - **Authorized redirect URIs:** (optional for token flow; can leave empty or add same origin)
     ```text
     https://acnlink.mindflo.today
     ```
5. Copy **Client ID** and **Client secret**

### 2) Railway variables

```text
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

> `GOOGLE_CLIENT_SECRET` is optional for the current token flow but recommended to store.

### 3) Redeploy Railway

After redeploy, open login → **Google** → account picker → signed in.

---

## GitHub Sign-In

### 1) GitHub OAuth App

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill:

| Field | Value |
|--------|--------|
| Application name | `ACN Link` |
| Homepage URL | `https://acnlink.mindflo.today` |
| Authorization callback URL | `https://acnlink.mindflo.today/` |

> Callback URL must end with `/` and match `APP_URL` exactly.

3. Create app → **Generate a new client secret**
4. Copy **Client ID** and **Client secret**

### 2) Railway variables

```text
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=your-github-secret
```

### 3) Redeploy Railway

Login → **GitHub** → authorize → redirected back → signed in.

---

## Verify configuration

Open in browser:

```text
https://acnlink.mindflo.today/api/auth/config
```

Expected when configured:

```json
{
  "googleEnabled": true,
  "githubEnabled": true,
  "googleClientId": "...",
  "githubClientId": "...",
  "appUrl": "https://acnlink.mindflo.today"
}
```

If `googleEnabled` or `githubEnabled` is `false`, the matching Railway variable is missing.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Google not configured | Set `GOOGLE_CLIENT_ID` on Railway, redeploy |
| Google popup blocked | Allow popups for `acnlink.mindflo.today` |
| Google origin mismatch | Add `https://acnlink.mindflo.today` to Authorized JavaScript origins |
| GitHub redirect_uri mismatch | GitHub callback must be `https://acnlink.mindflo.today/` and `APP_URL` must match |
| GitHub email missing | User must have a public or primary email on GitHub |
| OAuth works locally only | Set `APP_URL` to production URL on Railway, not localhost |

---

## Security notes

- Never put `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_SECRET` in Vite/`VITE_*` variables (browser-visible).
- Keep OAuth secrets only in **Railway** server environment.
- Set `AUTH_ALLOW_DEV_OAUTH=false` in production.
