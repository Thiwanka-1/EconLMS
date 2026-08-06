# Render test deployment

This repository deploys as two Render services from one Git repository:

- `econlls-api`: Node/Express web service in Singapore
- `econlls-client`: React/Vite static site on Render's CDN

The root `render.yaml` defines both services, their build commands, the API
health check, the React Router rewrite, and non-secret production defaults.

## 1. Prepare the external services

Before creating the Render Blueprint, have these ready:

1. A MongoDB Atlas cluster, database user, and `mongodb+srv://` connection
   string. Add Render's Singapore outbound IP ranges to the Atlas IP access
   list. For a short private test, `0.0.0.0/0` is simpler but less restrictive;
   use a strong database password and restrict the list afterward.
2. SMTP credentials. For Gmail, enable 2-Step Verification and create an App
   Password. Set `EMAIL_FROM` to the same Gmail address, for example
   `EconLLS <account@gmail.com>`.
3. Google OAuth credentials, refresh token, and the two Drive root-folder IDs.
4. Zoom Server-to-Server OAuth credentials.
5. A 64-character hexadecimal Zoom-link encryption key. Generate one locally:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

Do not commit any of these values.

## 2. Seed the administrator

The Render free service does not provide one-off jobs or shell access. Seed the
administrator locally against the Atlas database before deployment:

1. Copy `api/.env.example` to `api/.env` and fill the MongoDB and `ADMIN_*`
   values.
2. From `api`, run `npm run seed:admin`.
3. Remove or comment the `ADMIN_*` values afterward. They are not required by
   the running API and should not be added to Render.

The seed command is idempotent: it creates the account or promotes the matching
existing account to administrator.

## 3. Create the Blueprint

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, select **New > Blueprint**.
3. Connect the repository and select the root `render.yaml`.
4. Confirm that the API region is **Singapore**.
5. Provide every value marked `sync: false` when Render prompts you.

Use these URL values if the default service names are available:

```text
API CLIENT_URL=https://econlls-client.onrender.com
API CLIENT_ORIGINS=https://econlls-client.onrender.com
CLIENT VITE_API_BASE_URL=https://econlls-api.onrender.com/api
```

Use the actual URLs Render assigns if the names change. Do not include a
trailing slash. `VITE_API_BASE_URL` must include `/api`.

The secret values are:

```text
MONGODB_URI
SMTP_USER
SMTP_PASS
EMAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GDRIVE_PAYMENT_SLIPS_FOLDER_ID
GDRIVE_NIC_DOCUMENTS_FOLDER_ID
ZOOM_ACCOUNT_ID
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
ZOOM_LINK_ENCRYPTION_KEY
```

Render generates `JWT_SECRET` and `OTP_HASH_SECRET` automatically. Preserve
these values after the first deployment; changing `JWT_SECRET` logs everyone
out, and changing `OTP_HASH_SECRET` invalidates pending OTPs.

## 4. Correct the URLs and redeploy

After Render creates both services, copy their exact public URLs and verify:

- API `CLIENT_URL` and `CLIENT_ORIGINS` equal the static-site origin.
- Static-site `VITE_API_BASE_URL` equals the API origin plus `/api`.
- API `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, and `TRUST_PROXY=1`.
- `COOKIE_DOMAIN` is not defined.

If you edit `VITE_API_BASE_URL`, manually redeploy the static site because Vite
embeds it during the build. Then redeploy the API after changing its origins.

## 5. Smoke test

Test in this order:

1. Open `https://YOUR-API.onrender.com/api/health` and confirm a JSON success
   response.
2. Open the frontend and refresh a nested route such as `/login`; it should not
   return a Render 404.
3. Log in with the seeded administrator.
4. Create a test student and complete email verification.
5. Upload a test NIC image and payment slip, then view both from the admin
   portal.
6. Approve the payment and verify enrollment access and notifications.
7. Add a scheduled Zoom meeting with registration enabled and test the join
   window.
8. Add a YouTube lesson and verify playback limits and heartbeats.

If login succeeds but `/api/auth/me` immediately returns 401, first re-check the
three cookie settings and both exact origin variables. Also test without strict
third-party-cookie blocking; for a durable production setup, use related custom
domains such as `learn.example.com` and `api.example.com`.

## Free-service behavior

Render's free web service sleeps after 15 minutes without inbound traffic and
can take about a minute to wake. The in-process monthly scheduler cannot run
while asleep. This application performs billing catch-up during API startup, so
it is acceptable for testing, but a paid always-on service or a dedicated cron
job is recommended before real monthly billing depends on precise timing.

The Render filesystem is ephemeral. This project already stores durable data in
MongoDB Atlas and uploaded documents in Google Drive, so it does not depend on
the instance filesystem for those features.
