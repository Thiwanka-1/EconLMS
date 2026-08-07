# Oracle VM production deployment

This deployment serves the React app and API from one HTTPS origin. It avoids
third-party-cookie problems and keeps the in-process scheduler alive on an
always-running Oracle VM.

## Required layout

- Repository: `/opt/econlms`
- API environment: `/etc/econlms/api.env`
- systemd unit: `/etc/systemd/system/econlms-api.service`
- Nginx site: `/etc/nginx/sites-available/econlms`

Create a dedicated unprivileged `econlms` user. Do not run Node as root. Install
the Node version used by the project, Nginx and Certbot. Restrict SSH ingress to
the administrator's IP in both the Oracle security list and the VM firewall.
Only ports 80 and 443 should be public.

## Build

Run `npm ci` in both `api` and `client`. Build the client with these values:

```text
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=30000
```

The MongoDB deployment must be a replica set (MongoDB Atlas is suitable),
because payment approval/rejection uses transactions to prevent inconsistent
payment and enrolment state.

## API production environment

Copy every required value from `api/.env.example`. For a single-domain Oracle
deployment use values equivalent to:

```text
NODE_ENV=production
PORT=5000
APP_TIMEZONE=Asia/Colombo
TRUST_PROXY=1
CLIENT_URL=https://lms.example.com
CLIENT_ORIGINS=https://lms.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Keep `/etc/econlms/api.env` readable only by root and the `econlms` service
group. Test outbound SMTP connectivity on port 465 or 587 before launch.

## Activate services

Replace `lms.example.com` in the Nginx template, obtain the TLS certificate,
enable the Nginx site, copy the systemd unit, and enable both services. The API
must run as one systemd process, not PM2 cluster mode. MongoDB-backed job leases
still prevent duplicate billing/reminder/retry jobs if a second process is
started accidentally.

Use `systemctl status econlms-api`, `journalctl -u econlms-api`, and
`/api/health` to verify the service. Configure journald retention or log
rotation so logs cannot fill the boot disk.

## Backups and updates

Create an automated MongoDB backup outside the VM and test a restore before
production launch. Google Drive stores uploaded files, but MongoDB contains the
IDs and business records required to find them; backing up only Drive is not
enough.

For updates: back up MongoDB, pull the reviewed commit, run `npm ci`, rebuild
the client, restart `econlms-api`, then check the health endpoint and one admin
and student workflow. Database cleanup actions are permanent and should only be
used after confirming backups.
