# EconLMS MongoDB backup and restore runbook

This runbook creates encrypted MongoDB backups on the Oracle VM, uploads them
to a private Oracle Object Storage bucket, and verifies that a downloaded
backup can be read. It is designed for the current single-VM deployment and
MongoDB Atlas.

The repository contains no credentials. The live URI and encryption key stay
in root-only files under `/etc/econlms`.

## What the backup system does

- Runs every day at approximately 02:30 `Asia/Colombo` using a systemd timer.
- Creates a compressed `mongodump` archive.
- Checks the archive and runs a no-write `mongorestore --dryRun`.
- Encrypts it with AES-256-CBC, PBKDF2 and SHA-256 before upload.
- Uploads the encrypted file and its SHA-256 checksum to a private OCI bucket.
- Places every backup in `mongodb/daily/`, Sunday copies in
  `mongodb/weekly/`, and first-of-month copies in `mongodb/monthly/`.
- Keeps only a short three-day encrypted cache on the VM.
- Never automatically restores or deletes production database data.

The conservative free-tier retention is 7 daily, 35 weekly and 365 monthly
days. That keeps roughly 24-26 full backup copies and leaves headroom inside
Oracle's 20 GB allowance while the application uses an Atlas Free database.
Recalculate it if the database tier or backup size grows.

## 1. Create a private Object Storage bucket

In the Oracle Console, remain in the VM's region (`ap-mumbai-1` for the
current server):

1. Open **Storage -> Object Storage & Archive Storage -> Buckets**.
2. Create `econlms-backups` in the client-controlled compartment.
3. Use **Standard** storage and keep the bucket **Private**.
4. Keep public access blocked. Do not create a public pre-authenticated link.
5. Record the exact bucket name, region, and **Object Storage namespace** shown
   on the bucket details page. The namespace is not the tenancy name or OCID.

Oracle's Always Free allowance currently includes a total of 20 GB of Object
Storage, but this is an account allowance rather than a backup guarantee.
Monitor usage and Oracle notices. The current limits are documented in
[Oracle Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

## 2. Give only this VM access to the bucket

Copy the instance OCID from **Compute -> Instances -> econlms production VM**.
Then:

1. Open **Identity & Security -> Dynamic Groups** and create
   `econlms-backup-instance`.
2. Use this matching rule, replacing the placeholder:

   ```text
   instance.id = 'YOUR_INSTANCE_OCID'
   ```

3. Open **Identity & Security -> Policies** in the root compartment and create
   `econlms-backup-object-policy` with this statement:

   ```text
   Allow dynamic-group econlms-backup-instance to manage objects in tenancy where all {target.bucket.name='econlms-backups', target.object.name='mongodb/*', any {request.permission='OBJECT_CREATE'}}
   ```

The VM then authenticates using its instance identity. No OCI API private key
is stored on the server. This write-once policy permits creation only under the
backup prefix; the VM cannot list, download, overwrite, or delete bucket
objects. Oracle documents this permission pattern under
[write-once Object Storage access](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/commonpolicies.htm).
Also see Oracle's
[dynamic-group documentation](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingdynamicgroups.htm)
and [Object Storage security guidance](https://docs.oracle.com/en-us/iaas/Content/Security/Reference/objectstorage_security.htm).

## 3. Add lifecycle retention rules

On the private bucket, open **Lifecycle Policy Rules** and create three object
deletion rules:

| Object-name prefix | Delete after |
| --- | ---: |
| `mongodb/daily/` | 7 days |
| `mongodb/weekly/` | 35 days |
| `mongodb/monthly/` | 365 days |

Confirm each prefix carefully before enabling it. Object lifecycle deletion is
irreversible. It is performed by Oracle, not by the VM backup credential. See
[Using Object Lifecycle Management](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usinglifecyclepolicies.htm).

## 4. Create a dedicated Atlas backup user

In MongoDB Atlas **Database Access**, create a separate password user such as
`econlms_backup`. Give it only the access needed for:

- `read` on the production database `econlls`;
- `readWrite` on a disposable test database such as
  `econlls_restore_test` if the real restore drill in step 10 will be used.

Do not use the Atlas website login or expose the application URI in a command.
Ensure Atlas Network Access still allows the Oracle reserved public IP `/32`.

## 5. Install the required tools on Ubuntu

Install OpenSSL and the current MongoDB Database Tools build for Ubuntu 24.04
x86_64. Follow MongoDB's
[official Database Tools installation page](https://www.mongodb.com/docs/database-tools/installation/?operating-system=linux&package-type=deb),
then confirm:

```bash
mongodump --version
mongorestore --version
mongorestore --help | grep -F dryRun
openssl version
```

Install the OCI CLI using Oracle's
[official Linux installer instructions](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm).
Download and review the installer first, then install its executable into
`/usr/local/bin` and confirm:

```bash
/usr/local/bin/oci --version
```

The backup uses `--auth instance_principal`; do not run `oci setup config` and
do not add a personal OCI private key to this VM.

## 6. Install the backup files

After pulling the commit containing this feature on the VM:

```bash
sudo install -d -o root -g root -m 0700 /var/backups/econlms
sudo install -o root -g root -m 0750 /opt/econlms/deploy/oracle/backup/econlms-mongodb-backup.sh /usr/local/sbin/econlms-mongodb-backup
sudo install -o root -g root -m 0750 /opt/econlms/deploy/oracle/backup/econlms-mongodb-backup-verify.sh /usr/local/sbin/econlms-mongodb-backup-verify
sudo install -o root -g root -m 0644 /opt/econlms/deploy/oracle/backup/econlms-mongodb-backup.service /etc/systemd/system/econlms-mongodb-backup.service
sudo install -o root -g root -m 0644 /opt/econlms/deploy/oracle/backup/econlms-mongodb-backup.timer /etc/systemd/system/econlms-mongodb-backup.timer
sudo install -o root -g root -m 0600 /opt/econlms/deploy/oracle/backup/mongodb-backup.env.example /etc/econlms/mongodb-backup.env
sudo install -o root -g root -m 0600 /opt/econlms/deploy/oracle/backup/mongodump.yml.example /etc/econlms/mongodump.yml
```

Edit the two configuration files:

```bash
sudo nano /etc/econlms/mongodb-backup.env
sudo nano /etc/econlms/mongodump.yml
```

Set the real bucket, region, and Object Storage namespace in the first file and
the dedicated Atlas URI in the second. Percent-encode special characters in
the MongoDB username and password. Keep the database name as `econlls` unless
production deliberately uses a different name.

Create a new encryption passphrase without displaying it:

```bash
sudo sh -c 'umask 077; openssl rand -base64 48 > /etc/econlms/mongodb-backup.passphrase'
sudo chown root:root /etc/econlms/mongodb-backup.env /etc/econlms/mongodump.yml /etc/econlms/mongodb-backup.passphrase
sudo chmod 600 /etc/econlms/mongodb-backup.env /etc/econlms/mongodump.yml /etc/econlms/mongodb-backup.passphrase
sudo stat -c '%a %U:%G %n' /etc/econlms/mongodb-backup.env /etc/econlms/mongodump.yml /etc/econlms/mongodb-backup.passphrase
```

Copy the passphrase into the client's password manager and one protected
offline recovery record. Never email it, commit it, or keep the only copy on
the VM. A backup cannot be decrypted if this passphrase is lost.

## 7. Run the first backup manually

Reload systemd, but test the service before enabling its timer:

```bash
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/econlms-mongodb-backup.service /etc/systemd/system/econlms-mongodb-backup.timer
systemd-analyze calendar '*-*-* 02:30:00 Asia/Colombo'
sudo systemctl start econlms-mongodb-backup.service
sudo systemctl status econlms-mongodb-backup.service --no-pager
sudo journalctl -u econlms-mongodb-backup.service -n 100 --no-pager
sudo ls -lh /var/backups/econlms
```

The service should finish as `inactive (dead)` with `status=0/SUCCESS`; that is
normal for a oneshot service. In the Oracle bucket, confirm that both an
`.archive.gz.enc` object and its `.sha256` object appear under
`mongodb/daily/`. Do not continue if the service reports success but the two
objects are absent.

## 8. Enable the daily timer

```bash
sudo systemctl enable --now econlms-mongodb-backup.timer
sudo systemctl status econlms-mongodb-backup.timer --no-pager
sudo systemctl list-timers econlms-mongodb-backup.timer --all
```

`Persistent=true` means a missed run starts after the VM comes back. The API
scheduler and this backup timer are separate; neither Linux cron nor Render is
used.

## 9. Verify an off-VM backup

At least monthly, download one encrypted archive and its matching checksum
from Object Storage into `/var/backups/econlms`. Verify the downloaded pair,
not only the local cache:

```bash
sudo /usr/local/sbin/econlms-mongodb-backup-verify /var/backups/econlms/EXACT_FILE.archive.gz.enc
```

The verifier checks SHA-256, decrypts to a temporary root-only file, and
executes a no-write `mongorestore --dryRun`, which also proves MongoDB can parse
the compressed archive. It removes the temporary decrypted archive
automatically. MongoDB documents the relevant
[`mongodump` configuration-file option](https://www.mongodb.com/docs/database-tools/mongodump/index.html)
and [`mongorestore --archive --gzip`](https://www.mongodb.com/docs/database-tools/mongorestore/).

## 10. Perform a real restore drill safely

A dry run is useful, but a production backup is only proven after a real test
restore. Use a disposable database, never the production namespace.

1. Download and verify an off-VM backup as in step 9.
2. Schedule a maintenance window and record the backup filename/tool version.
3. Decrypt it into the protected backup directory:

   ```bash
   sudo openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -pass file:/etc/econlms/mongodb-backup.passphrase -in /var/backups/econlms/EXACT_FILE.archive.gz.enc -out /var/backups/econlms/restore-test.archive.gz
   ```

4. Restore only into the named test database:

   ```bash
   sudo mongorestore --config=/etc/econlms/mongodump.yml --archive=/var/backups/econlms/restore-test.archive.gz --gzip --nsFrom='econlls.*' --nsTo='econlls_restore_test.*' --drop
   ```

5. In Atlas Data Explorer, compare important collection/document counts with
   production and open sample users, courses, enrolments, payments, billing
   periods and notifications.
6. Record the date, backup name, result and administrator who verified it.
7. Remove `/var/backups/econlms/restore-test.archive.gz` immediately. Delete
   only the disposable `econlls_restore_test` database from Atlas after the
   result is recorded.

The `--nsFrom`/`--nsTo` mapping is the safety boundary. Stop if either namespace
does not exactly match the command above. Do not add `--drop` to a command that
targets `econlls`.

## 11. Routine monitoring and recovery information

Check backup status weekly:

```bash
sudo systemctl list-timers econlms-mongodb-backup.timer --all
sudo journalctl -u econlms-mongodb-backup.service --since '8 days ago' --no-pager
sudo systemctl --failed
df -h / /var/backups/econlms
```

Keep these items in the client handover record:

- Oracle tenancy, compartment, region, bucket and lifecycle policy names;
- Atlas project and dedicated backup username (password only in the password
  manager);
- backup encryption passphrase and its protected offline copy;
- last successful backup and last successful real restore-drill dates;
- current MongoDB Database Tools version;
- the repository commit used by the server.

Once a month, keep one verified encrypted monthly archive outside the Oracle
tenancy as well (for example on the client's encrypted computer or private
Drive). This protects against loss of the whole Oracle account. It is safe to
store only while encrypted, and the matching `.sha256` file must travel with
it.

After a failed run, keep the local encrypted files, inspect the service log,
and fix the root cause before manually starting the service again. Never treat
an Object Storage upload alone as proof that the archive is restorable.
