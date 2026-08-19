#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly CONFIG_FILE="${ECONLMS_BACKUP_CONFIG:-/etc/econlms/mongodb-backup.env}"
readonly BACKUP_DIR="/var/backups/econlms"
readonly LOCK_FILE="/run/lock/econlms-mongodb-backup.lock"

log() {
    printf '%s [econlms-backup] %s\n' "$(date --iso-8601=seconds)" "$*"
}

fail() {
    log "ERROR: $*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

require_value() {
    local name="$1"
    [[ -n "${!name:-}" ]] || fail "Required setting is empty: $name"
}

[[ "${EUID}" -eq 0 ]] || fail "Run this backup as root through systemd or sudo."
[[ -r "${CONFIG_FILE}" ]] || fail "Cannot read ${CONFIG_FILE}."

# The file is installed root-owned with mode 0600. It contains only simple
# NAME=value settings and is deliberately stored outside the repository.
set -a
# shellcheck source=/dev/null
source "${CONFIG_FILE}"
set +a

: "${MONGODB_CONFIG_FILE:=/etc/econlms/mongodump.yml}"
: "${BACKUP_PASSPHRASE_FILE:=/etc/econlms/mongodb-backup.passphrase}"
: "${BACKUP_TIMEZONE:=Asia/Colombo}"
: "${OCI_CLI_BIN:=oci}"
: "${OCI_OBJECT_PREFIX:=mongodb}"
: "${LOCAL_RETENTION_DAYS:=3}"
: "${OPENSSL_PBKDF2_ITERATIONS:=200000}"

require_value MONGODB_DATABASE
require_value OCI_BUCKET_NAME
require_value OCI_REGION
require_value OCI_NAMESPACE

[[ "${MONGODB_DATABASE}" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "MONGODB_DATABASE may contain only letters, numbers, underscores and hyphens."
[[ "${LOCAL_RETENTION_DAYS}" =~ ^[0-9]+$ ]] ||
    fail "LOCAL_RETENTION_DAYS must be a non-negative integer."
[[ "${OPENSSL_PBKDF2_ITERATIONS}" =~ ^[0-9]+$ ]] ||
    fail "OPENSSL_PBKDF2_ITERATIONS must be a positive integer."
(( OPENSSL_PBKDF2_ITERATIONS > 0 )) ||
    fail "OPENSSL_PBKDF2_ITERATIONS must be greater than zero."
[[ -r "${MONGODB_CONFIG_FILE}" ]] || fail "Cannot read ${MONGODB_CONFIG_FILE}."
[[ -r "${BACKUP_PASSPHRASE_FILE}" ]] || fail "Cannot read ${BACKUP_PASSPHRASE_FILE}."

require_command mongodump
require_command mongorestore
require_command openssl
require_command sha256sum
require_command flock
require_command find
require_command "${OCI_CLI_BIN}"

install -d -o root -g root -m 0700 "${BACKUP_DIR}"
exec 9>"${LOCK_FILE}"
flock -n 9 || fail "Another backup is already running."

# Remove plaintext work directories left by an interrupted run, but never touch
# a directory newer than one day or anything outside the fixed backup root.
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d \
    \( -name '.work.*' -o -name '.verify.*' \) -mmin +1440 \
    -exec rm -rf -- {} +

work_dir="$(mktemp -d "${BACKUP_DIR}/.work.XXXXXX")"
raw_archive="${work_dir}/database.archive.gz"

cleanup() {
    rm -rf -- "${work_dir}"
}
trap cleanup EXIT INT TERM

timestamp="$(TZ="${BACKUP_TIMEZONE}" date '+%Y%m%dT%H%M%S%z')"
day_of_week="$(TZ="${BACKUP_TIMEZONE}" date '+%u')"
day_of_month="$(TZ="${BACKUP_TIMEZONE}" date '+%d')"
filename="econlms-${MONGODB_DATABASE}-${timestamp}.archive.gz.enc"
encrypted_work_file="${work_dir}/${filename}"
encrypted_backup="${BACKUP_DIR}/${filename}"
checksum_file="${encrypted_backup}.sha256"

log "Starting MongoDB dump for database ${MONGODB_DATABASE}."
mongodump \
    --config="${MONGODB_CONFIG_FILE}" \
    --db="${MONGODB_DATABASE}" \
    --archive="${raw_archive}" \
    --gzip

[[ -s "${raw_archive}" ]] || fail "mongodump produced an empty archive."
log "Running a no-write mongorestore dry run."
mongorestore \
    --config="${MONGODB_CONFIG_FILE}" \
    --archive="${raw_archive}" \
    --gzip \
    --dryRun \
    --nsInclude="${MONGODB_DATABASE}.*"

log "Encrypting the backup before it leaves the VM."
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -iter "${OPENSSL_PBKDF2_ITERATIONS}" \
    -md sha256 \
    -pass "file:${BACKUP_PASSPHRASE_FILE}" \
    -in "${raw_archive}" \
    -out "${encrypted_work_file}"

[[ -s "${encrypted_work_file}" ]] || fail "Encryption produced an empty file."
mv -- "${encrypted_work_file}" "${encrypted_backup}"
(
    cd "${BACKUP_DIR}"
    sha256sum "${filename}" > "${filename}.sha256"
)

upload_object() {
    local retention_class="$1"
    local source_file="$2"
    local object_name="${OCI_OBJECT_PREFIX}/${retention_class}/$(basename "${source_file}")"
    local attempt

    for attempt in 1 2 3; do
        if "${OCI_CLI_BIN}" os object put \
            --auth instance_principal \
            --region "${OCI_REGION}" \
            --namespace-name "${OCI_NAMESPACE}" \
            --bucket-name "${OCI_BUCKET_NAME}" \
            --name "${object_name}" \
            --file "${source_file}" >/dev/null; then
            log "Uploaded ${object_name}."
            return 0
        fi

        log "Upload attempt ${attempt} failed for ${object_name}."
        sleep 5
    done

    fail "Could not upload ${object_name} after three attempts. Local encrypted files were retained."
}

# Each class has an independent server-side lifecycle policy. Weekly copies are
# made on Sunday, and monthly copies on the first day in BACKUP_TIMEZONE.
for backup_file in "${encrypted_backup}" "${checksum_file}"; do
    upload_object daily "${backup_file}"
done

if [[ "${day_of_week}" == "7" ]]; then
    for backup_file in "${encrypted_backup}" "${checksum_file}"; do
        upload_object weekly "${backup_file}"
    done
fi

if [[ "${day_of_month}" == "01" ]]; then
    for backup_file in "${encrypted_backup}" "${checksum_file}"; do
        upload_object monthly "${backup_file}"
    done
fi

# Cleanup is deliberately constrained to known filename patterns in the fixed
# application backup directory. Unencrypted working data is removed by trap.
find "${BACKUP_DIR}" -maxdepth 1 -type f \
    \( -name 'econlms-*.archive.gz.enc' -o -name 'econlms-*.archive.gz.enc.sha256' \) \
    -mtime "+${LOCAL_RETENTION_DAYS}" -delete

log "Backup completed successfully: ${encrypted_backup}."
