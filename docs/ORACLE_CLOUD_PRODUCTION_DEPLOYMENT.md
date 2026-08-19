# EconLMS on Oracle Cloud Always Free

This runbook deploys one React frontend and one Node API on a single Ubuntu VM.
Nginx serves the frontend and forwards `/api` to Node. The API is kept alive by
systemd, so the billing, access-enforcement, reminder, email, and Zoom retry
jobs continue running without Render-style sleeping.

Oracle documents Always Free resources as lasting for the life of the account
in the tenancy's home region. Current Ampere A1 allowance is equivalent to up
to **2 OCPUs and 12 GB RAM**, subject to region capacity and Oracle's limits.
Read the current [Always Free resource documentation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
before creating the VM. “Always Free” is an Oracle service entitlement, not an
availability or uptime guarantee. Oracle explicitly says idle Always Free
compute may be reclaimed when CPU, network and (for A1) memory stay below its
published thresholds during a seven-day period. Do not create artificial load
to evade that policy; keep tested backups, monitor Oracle notices, and maintain
a documented rebuild procedure.

## 1. Prepare accounts and files

Before touching Oracle, complete
`docs/PRODUCTION_HANDOVER_CHECKLIST.md`. You need:

- A client-owned domain.
- Client-owned MongoDB, Gmail SMTP, Google Drive OAuth, and Zoom credentials.
- The reviewed EconLMS Git repository.
- A local SSH key and a secure backup of its private key.

## 2. Create the Oracle VM

1. Sign in to Oracle Cloud and select the tenancy's **home region**.
2. Create a VCN using **VCN with Internet Connectivity**.
3. Open **Compute → Instances → Create instance**.
4. Choose Ubuntu 24.04 LTS ARM64.
5. Choose `VM.Standard.A1.Flex` with no more than the current Always Free
   allowance (for example 2 OCPUs and 12 GB RAM).
6. Confirm every selected resource displays **Always Free eligible**.
7. Use the default 47 GB boot volume unless more is deliberately required.
8. Add your SSH public key and create the instance.
9. Reserve its public IP so DNS does not change after a restart/reassignment.

Oracle's [instance creation guide](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/launchinginstance.htm)
explains the VCN and SSH-key prerequisites.

## 3. Configure network security

Add stateful ingress rules in the VM's Network Security Group or subnet
security list:

- TCP 22 from the administrator's fixed public IP only.
- TCP 80 from `0.0.0.0/0` and `::/0`.
- TCP 443 from `0.0.0.0/0` and `::/0`.

Do not expose Node port 5000, MongoDB ports, or any development server port.
Nginx is the only public application entry point.

## 4. Connect and install software

Connect from the administrator computer:

```bash
ssh -i /path/to/private-key ubuntu@ORACLE_RESERVED_IP
```

On the VM:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx snapd curl ca-certificates build-essential
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version
npm --version
```

Use Node 24.x to match the tested UAT/runtime version. Review downloaded setup
scripts before running them as root.

Create the service user and application directory:

```bash
sudo useradd --system --create-home --home-dir /var/lib/econlms --shell /usr/sbin/nologin econlms
sudo mkdir -p /opt/econlms /etc/econlms
sudo chown econlms:econlms /opt/econlms
sudo chmod 750 /etc/econlms
sudo -u econlms git clone YOUR_REPOSITORY_URL /opt/econlms
```

For a private repository, use a read-only deploy key. Do not put a personal
GitHub token into shell history.

## 5. Install dependencies and build

```bash
cd /opt/econlms/api
sudo -u econlms npm ci --omit=dev

cd /opt/econlms/client
sudo -u econlms npm ci
sudo -u econlms bash -c 'printf "VITE_API_BASE_URL=/api\nVITE_API_TIMEOUT_MS=30000\n" > .env.production'
sudo -u econlms npm run build
```

The two `VITE_*` values are public build settings, not secrets. No API secret
may be placed in the client environment.

## 6. Create the API environment

Start from `api/.env.example`, but write the completed production file outside
the repository:

```bash
sudo install -o root -g econlms -m 640 /opt/econlms/api/.env.example /etc/econlms/api.env
sudo nano /etc/econlms/api.env
```

At minimum use these Oracle/same-origin values:

```text
NODE_ENV=production
PORT=5000
APP_TIMEZONE=Asia/Colombo
CLIENT_URL=https://lms.example.com
CLIENT_ORIGINS=https://lms.example.com
TRUST_PROXY=1
COOKIE_NAME=econlls_auth
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_MAX_AGE_DAYS=7
MONGODB_URI=mongodb+srv://...
BILLING_CRON_TEST_MODE=false
```

Leave `TEST_BILLING_DATE` absent. Fill every SMTP, Google Drive, Zoom,
authentication, upload, rate-limit, playback, and reminder value from the
handover checklist. Remove example placeholders.

In MongoDB Atlas Network Access, allow the Oracle reserved public IP as
`ORACLE_RESERVED_IP/32` rather than `0.0.0.0/0`.

## 7. Install and start the systemd service

The repository contains `deploy/oracle/econlms-api.service`.

```bash
sudo cp /opt/econlms/deploy/oracle/econlms-api.service /etc/systemd/system/econlms-api.service
command -v node
sudo systemctl daemon-reload
sudo systemctl enable --now econlms-api
sudo systemctl status econlms-api --no-pager
sudo journalctl -u econlms-api -n 100 --no-pager
```

If `command -v node` is not `/usr/bin/node`, update `ExecStart` in the service
file before starting it. Run exactly one API process on this VM; do not use PM2
cluster mode.

Test locally on the VM:

```bash
curl http://127.0.0.1:5000/api/health
```

## 8. Configure domain and Nginx

Create a DNS `A` record:

```text
lms.example.com → ORACLE_RESERVED_IP
```

Wait until it resolves. First create a temporary HTTP-only Nginx site so
Certbot can validate the domain:

```bash
sudo nano /etc/nginx/sites-available/econlms
sudo ln -s /etc/nginx/sites-available/econlms /etc/nginx/sites-enabled/econlms
sudo rm -f /etc/nginx/sites-enabled/default
```

Paste this temporary configuration and replace the hostname:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_REAL_HOSTNAME;
    root /opt/econlms/client/dist;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then validate and start the HTTP site:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Install Certbot and request HTTPS:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot certonly --nginx -d YOUR_REAL_HOSTNAME
sudo cp /opt/econlms/deploy/oracle/nginx-econlms.conf /etc/nginx/sites-available/econlms
sudo sed -i 's/lms\.example\.com/YOUR_REAL_HOSTNAME/g' /etc/nginx/sites-available/econlms
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

These commands follow the [official Certbot Nginx instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx).

## 9. Verify scheduled jobs

The API process itself runs the schedules; Linux cron is not required:

- Monthly billing generation: first day at 00:01 Asia/Colombo.
- Monthly access enforcement: daily at 00:00:05, including the 10-day grace
  rule and startup catch-up.
- Payment reminders: daily at `PAYMENT_REMINDER_HOUR`.
- Email and Zoom retries: every five minutes.

Check logs:

```bash
sudo journalctl -u econlms-api --since today --no-pager
```

Never set `BILLING_CRON_TEST_MODE=true` or `TEST_BILLING_DATE` in production.

## 10. Backups

MongoDB and Google Drive must both be protected. Drive contains private files;
MongoDB contains the business records and Drive file IDs.

The repository now includes a systemd backup service and timer. Follow
[`MONGODB_BACKUP_AND_RESTORE.md`](MONGODB_BACKUP_AND_RESTORE.md) to:

1. Create a private Oracle Object Storage bucket and VM instance-principal
   policy.
2. Install MongoDB Database Tools and the OCI CLI.
3. Create root-only MongoDB and encryption configuration.
4. Test one manual encrypted upload before enabling the daily timer.
5. Verify a downloaded backup and perform an isolated restore drill.

Free Atlas deployments do not include normal managed backups. A backup that
has never been restored is not considered verified.

## 11. Updates and rollback

Before each release, back up MongoDB and note the current commit. Then:

```bash
cd /opt/econlms
sudo -u econlms git pull --ff-only
cd api && sudo -u econlms npm ci --omit=dev
cd ../client && sudo -u econlms npm ci && sudo -u econlms npm run build
sudo systemctl restart econlms-api
sudo nginx -t && sudo systemctl reload nginx
curl https://YOUR_REAL_HOSTNAME/api/health
```

Afterwards test one admin login, one student login, one private file, one email,
and one Zoom workflow. Keep SSH restricted, apply OS security updates, monitor
disk usage and Oracle tenancy notifications, and configure journald retention
so logs cannot fill the VM. The application does not sleep when idle, but
Oracle can still reclaim an Always Free VM under its idle-resource policy.
