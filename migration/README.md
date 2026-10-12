# Migration tooling (safe preflight)

This directory contains migration *source code only*. Do not commit exports, transformed datasets, account inventories, user mappings, service-account credentials, password-reset links, or reports containing personal data.

## Current workflow scope

The GitHub Actions workflow `.github/workflows/migration-preflight.yml` is intentionally limited to static checks:
- JavaScript syntax checks for the migration scripts.
- A repository hygiene check that fails if generated datasets, local credential files, or user mapping files are tracked.
- No Supabase queries, Firebase Authentication calls, account creation, Firestore writes, secrets, artifacts, or production operations.

The export, inventory, and transformation scripts are provided for review. The preflight workflow does **not** execute them.

## Before any real migration run

1. Ensure the repository's visibility and data history have been reviewed. Exported user data was previously present on another public branch; deleting files from a branch does not remove them from Git history.
2. Keep exports and transformed data in a private environment excluded from Git.
3. Review and test account provisioning separately. Do not include service-account keys in the repository.
4. Re-run transformation after all account IDs are resolved. Reject any `NEW_UID_NEEDED:` placeholders before importing.
5. Require a separately reviewed, explicit authorization before production Auth account creation or any Firestore writes.

The presence of a valid syntax check is not proof that production migration behavior is correct.
