# EconLMS project audit and remaining TODOs

Audit date: 12 August 2026.

## Completed and verified

- Admin permanent deletion exists for disabled student accounts and cascades
  through NIC/payment Drive files, enrolments, payments, notifications,
  playback history, and Zoom registrations.
- Archived/unpublished courses can be deleted with all course-related data.
- Cancelled/suspended enrolments can be deleted with their related files and
  access records.
- Completed/cancelled or unpublished live classes can be deleted with Zoom
  registrations and notifications.
- Users can delete individual, read, or all notifications for their own
  account; this also works for administrators.
- Added deletion for archived/unpublished lessons, including playback history.
- Added guarded deletion for unused archived billing periods.
- Added deletion for rejected payment submissions and their Google Drive file.
- Added deletion for disabled administrator accounts with ownership transfer
  and audit-snapshot preservation.
- API and client dependency audits reported zero known production
  vulnerabilities on the audit date.
- API tests, client tests, lint, and the production frontend build pass. Lint
  has three existing Fast Refresh organization warnings, not runtime errors.

## Required before production

1. Complete the account/secret migration in
   `PRODUCTION_HANDOVER_CHECKLIST.md`.
2. Set up tested MongoDB backups. Atlas Free does not provide normal managed
   backups.
3. Deploy behind HTTPS and use the production cookie/origin values from the
   Oracle guide.
4. Add the exact `ZOOM_REQUIRED_AUTHENTICATION_OPTION` for the client's Zoom
   authentication profile.
5. Run a full UAT pass with at least one separate admin and two test students.
6. Test the Oracle rebuild procedure because Always Free idle instances may be
   reclaimed by Oracle.
7. Agree on legal/business retention periods for approved payments, audit
   logs, student identity documents, and notification history.

## Recommended next improvements

- Add database-backed integration tests for every destructive cleanup endpoint.
  The current logic has syntax/unit/build coverage, but destructive cascades
  should also be tested against a temporary MongoDB replica set and mocked
  Google Drive/Zoom APIs.
- Add an administrator "data retention" report showing record counts and
  estimated uploaded-file bytes before deletion.
- After the client chooses a retention policy, add a scheduled purge only for
  safe categories such as old read notifications and old audit logs. Do not
  automatically delete approved financial records.
- Add external uptime monitoring for `/api/health`, disk alerts, failed SMTP
  alerts, and Oracle tenancy/reclamation notifications.
- Remove the tracked development backup directory
  `client/settings-integration-backup-20260805-095031` and the large
  `client/frontend-final-review.txt` after confirming they are no longer
  needed. They are not loaded by the running app, but they unnecessarily grow
  the repository/deployment checkout.
- Move shared React contexts/helpers into separate files to remove the three
  Fast Refresh lint warnings.
- Add a documented privacy policy, retention policy, account-deletion policy,
  and explicit client approval for storing NIC/payment documents in Google
  Drive.

## Intentional non-deletion rules

- Pending payments cannot be deleted; they must be approved or rejected.
- Approved payments cannot be individually deleted because they support access
  and accounting history. They are removed only through a deliberate parent
  cleanup such as deleting the disabled student, cancelled enrolment, or
  archived course.
- A billing period cannot be deleted while lessons, classes, payments, Zoom
  registrations, or enrolment access still reference it.
- Active student/admin accounts cannot be permanently deleted until disabled.
- The signed-in administrator cannot delete their own admin account.
- Published/non-archived lessons and courses cannot be permanently deleted.

These restrictions prevent orphaned data and accidental removal of evidence
that explains why a student currently has course access.
