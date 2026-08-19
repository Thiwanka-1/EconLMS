#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly CONFIG_FILE="${ECONLMS_BACKUP_CONFIG:-/etc/econlms/mongodb-backup.env}"
readonly WORK_ROOT="/var/backups/econlms"

log() {
    printf '%s [econlms-backup-verify] %s\n' "$(date --iso-8601=seconds)" "$*"
}

fail() {
    log "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "Run this verifier as root through sudo."
[[ $# -eq 1 ]] || fail "Usage: $0 /var/backups/econlms/FILE.archive.gz.enc"
[[ -r "${CONFIG_FILE}" ]] || fail "Cannot read ${CONFIG_FILE}."

set -a
# shellcheck source=/dev/null
source "${CONFIG_FILE}"
set +a

: "${MONGODB_CONFIG_FILE:=/etc/econlms/mongodump.yml}"
: "${BACKUP_PASSPHRASE_FILE:=/etc/econlms/mongodb-backup.passphrase}"
: "${OPENSSL_PBKDF2_ITERATIONS:=200000}"

[[ -n "${MONGODB_DATABASE:-}" ]] || fail "MONGODB_DATABASE is empty in ${CONFIG_FILE}."
[[ "${MONGODB_DATABASE}" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "MONGODB_DATABASE may contain only letters, numbers, underscores and hyphens."
[[ "${OPENSSL_PBKDF2_ITERATIONS}" =~ ^[0-9]+$ ]] ||
    fail "OPENSSL_PBKDF2_ITERATIONS must be a positive integer."
(( OPENSSL_PBKDF2_ITERATIONS > 0 )) ||
    fail "OPENSSL_PBKDF2_ITERATIONS must be greater than zero."

encrypted_backup="$(realpath -e "$1")"
checksum_file="${encrypted_backup}.sha256"

[[ "${encrypted_backup}" == "${WORK_ROOT}/"* ]] ||
    fail "Place the downloaded backup below ${WORK_ROOT} before verification."
[[ -f "${encrypted_backup}" ]] || fail "Backup file does not exist."
[[ -r "${checksum_file}" ]] || fail "Checksum file does not exist: ${checksum_file}"
[[ -r "${MONGODB_CONFIG_FILE}" ]] || fail "Cannot read ${MONGODB_CONFIG_FILE}."
[[ -r "${BACKUP_PASSPHRASE_FILE}" ]] || fail "Cannot read ${BACKUP_PASSPHRASE_FILE}."

for command_name in sha256sum openssl mongorestore mktemp realpath; do
    command -v "${command_name}" >/dev/null 2>&1 || fail "Required command is missing: ${command_name}"
done

work_dir="$(mktemp -d "${WORK_ROOT}/.verify.XXXXXX")"
raw_archive="${work_dir}/database.archive.gz"

cleanup() {
    rm -rf -- "${work_dir}"
}
trap cleanup EXIT INT TERM

log "Checking the encrypted file checksum."
read -r expected_hash _ < "${checksum_file}"
[[ "${expected_hash}" =~ ^[[:xdigit:]]{64}$ ]] || fail "Checksum file has an invalid SHA-256 value."
actual_checksum_line="$(sha256sum "${encrypted_backup}")"
actual_hash="${actual_checksum_line%% *}"
[[ "${actual_hash,,}" == "${expected_hash,,}" ]] || fail "Encrypted backup checksum does not match."
log "Checksum is valid."

log "Decrypting into a temporary root-only directory."
openssl enc -d -aes-256-cbc -pbkdf2 \
    -iter "${OPENSSL_PBKDF2_ITERATIONS}" \
    -md sha256 \
    -pass "file:${BACKUP_PASSPHRASE_FILE}" \
    -in "${encrypted_backup}" \
    -out "${raw_archive}"

log "Running a no-write mongorestore dry run."
mongorestore \
    --config="${MONGODB_CONFIG_FILE}" \
    --archive="${raw_archive}" \
    --gzip \
    --dryRun \
    --nsInclude="${MONGODB_DATABASE}.*"

log "Verification succeeded. No database data was changed."
