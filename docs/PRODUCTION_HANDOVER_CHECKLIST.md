# EconLMS production ownership and environment handover

This checklist moves the UAT integrations from developer-owned accounts to
client-owned production accounts. Never copy the real values into this file,
email, source control, screenshots, or chat.

## Current UAT environment review

The real local `api/.env` was inspected on 12 August 2026 without printing any
secret values. Its secret lengths and required groups are structurally valid
for local UAT. Before production, address these items:

- It uses `NODE_ENV=development`, localhost URLs, non-secure cookies and
  `TRUST_PROXY=0`. These are correct locally but wrong on Oracle.
- Rename the legacy `MONGO_URI` key to `MONGODB_URI` in production.
- Add `ZOOM_REQUIRED_AUTHENTICATION_OPTION` after identifying the exact Zoom
  authentication-profile ID returned for the client's meeting.
- Add `SMTP_MAX_CONNECTIONS=3` and `SMTP_MAX_MESSAGES=100`.
- Remove old unused UAT keys after confirming nothing uses them, especially
  `RESEND_API_KEY`, `PRIVATE_UPLOAD_DIR`, and `MAX_SLIP_SIZE_MB`.
- `client/.env.local` contains server-only cookie/origin variables. Remove
  them. The client environment must contain only `VITE_API_BASE_URL` and
  `VITE_API_TIMEOUT_MS`.
- Keep `BILLING_CRON_TEST_MODE=false` and leave `TEST_BILLING_DATE` unset in
  production.

## Ownership changes required

### Gmail SMTP

1. Create or choose a client-controlled Gmail/Google Workspace mailbox such as
   `notifications@client-domain.com`.
2. Enable Google 2-Step Verification.
3. Create an App Password for EconLMS. Do not use the normal Gmail password.
4. Set `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` to the client mailbox.
5. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, and `SMTP_SECURE=true`.
6. Send a signup OTP, password-reset OTP, payment approval, payment rejection,
   and reminder email before launch.

Gmail sending limits and anti-abuse rules still apply. SMTP is not an unlimited
free transactional email service. Monitor failed notification-email attempts
in API logs.

### Google Drive

Use the client's Google account for both OAuth and storage:

1. Create or select a client-owned Google Cloud project.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen and OAuth client.
4. Create two folders in the client's Drive: one for payment slips and one for
   NIC documents.
5. Generate a production refresh token while signed in as the client storage
   account.
6. Replace `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REFRESH_TOKEN`, `GDRIVE_PAYMENT_SLIPS_FOLDER_ID`, and
   `GDRIVE_NIC_DOCUMENTS_FOLDER_ID`.
7. Upload and view one NIC and one payment slip, then delete a rejected test
   payment and confirm its Drive file is also removed.

If existing UAT files must be retained, transfer/copy them to the client Drive
and keep their file IDs synchronized with MongoDB. Do not simply delete the old
Drive folders.

### MongoDB

1. Create a client-owned MongoDB Atlas project and database deployment.
2. Create a dedicated database user for EconLMS; do not use an Atlas website
   login as the application credential.
3. Add only the Oracle VM's reserved public IP to Atlas Network Access using a
   `/32` rule.
4. Set `MONGODB_URI` to the production connection string and database name.
5. Migrate UAT data only if the client wants it in production; otherwise start
   clean and create the first admin deliberately.
6. Test `mongodump` and `mongorestore` before launch.

Atlas requires both a database user and an IP access-list entry, as described
in the [official connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/?interface=atlas-cli).
Atlas Free clusters do not provide normal cloud backups, so use scheduled
`mongodump` backups and test restores; see the
[Free cluster limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

### Zoom

The current Zoom account already belongs to the client, so retain it. Confirm
the Server-to-Server OAuth application also belongs to the client and rotate
the credentials before production. Replace `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`,
`ZOOM_CLIENT_SECRET`, and generate a new independent
`ZOOM_LINK_ENCRYPTION_KEY`. Set `ZOOM_REQUIRED_AUTHENTICATION_OPTION` to the
client's matching-invited-email authentication profile ID.

Changing `ZOOM_LINK_ENCRYPTION_KEY` makes already encrypted join URLs
unreadable. Rotate it before connecting production live classes, or reconnect
the affected meetings afterwards.

### Domain and DNS

1. Buy the domain in the client's registrar account.
2. Protect the registrar with 2FA and record recovery codes securely.
3. Point an `A` record such as `lms.example.com` to the Oracle reserved IP.
4. Complete HTTPS before changing the production cookie settings.

## Production-only secrets

Generate fresh production values; do not reuse UAT values:

- `JWT_SECRET`: at least 32 random bytes.
- `OTP_HASH_SECRET`: a different random value.
- `PASSWORD_RESET_MAX_ATTEMPTS=5`: invalidates a reset code after five failed entries.
- `AUTH_MAX_ACTIVE_SESSIONS=10`: limits simultaneous devices per account.
- `AUTH_EMAIL_FAILURE_ALERT_THRESHOLD=3`: warns administrators after repeated authentication-email failures.
- `AUTH_EMAIL_FAILURE_ALERT_COOLDOWN_MINUTES=60`: prevents duplicate warning floods.
- `ZOOM_LINK_ENCRYPTION_KEY`: exactly 32 random bytes encoded as 64 hex
  characters.
- Gmail App Password.
- MongoDB application password.
- Google OAuth client secret and refresh token.
- Zoom OAuth secret.
- Initial administrator temporary password, if creating a new database.

Store the Oracle API environment at `/etc/econlms/api.env`, mode `640`, owned by
`root:econlms`. Do not store it inside the repository.

## Production verification checklist

- [ ] HTTPS works and HTTP redirects to HTTPS.
- [ ] `/api/health` reports a healthy database.
- [ ] Signup, email verification, login, logout, and password reset work.
- [ ] Admin can create another admin; the last active admin cannot be disabled.
- [ ] NIC and payment upload/view/approve/reject work.
- [ ] Payment approval grants access; the monthly grace policy works.
- [ ] Daily payment reminders run in `Asia/Colombo`.
- [ ] Secure Zoom meeting connection and student join work.
- [ ] Recorded lesson resume and two-minute rewind lock work after refresh.
- [ ] Student, rejected-payment, old-live-class, archived-lesson, old-enrolment,
  and archived-course cleanup work on test records.
- [ ] Encrypted MongoDB backup reaches private Oracle Object Storage.
- [ ] Backup passphrase has password-manager and protected offline copies.
- [ ] A downloaded backup passes verification and an isolated restore drill.
- [ ] API restart and VM reboot automatically restore the service.
