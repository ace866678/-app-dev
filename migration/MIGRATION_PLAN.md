# Research Room Supabase-to-Firebase Migration Plan

## Overview
Migrate Research Room application from Supabase (Auth + Postgres) to Firebase (Auth + Firestore).

## Source: Supabase
- Project: `ldsjdsgzqcawuhrnbvkq` (puvguard)
- URL: `https://ldsjdsgzqcawuhrnbvkq.supabase.co`
- Auth: Email/password + Google OAuth
- Database: Postgres with tables listed below

## Target: Firebase
- Project: `researchroom-71e70`
- Web App ID: `1:955192172922:web:a84e7ca2f245d0831ab6c3`
- Auth: Email/password + Google OAuth (already enabled)
- Database: Firestore (created, rules in `firestore.rules`)

---

## Verified Data Inventory

### Supabase Export Results (COMPLETED)
| Table | Rows | Status |
|-------|------|--------|
| auth.users | 7 | ✅ Exported |
| research_workspaces | 3 | ✅ Exported |
| research_members | 8 | ✅ Exported |
| research_sections | 36 | ✅ Exported |
| research_tasks | 1 | ✅ Exported |
| research_meetings | 7 | ✅ Exported |
| research_messages | 14 | ✅ Exported |
| research_notifications | 25 | ✅ Exported |
| research_chapters | 11 | ✅ Exported |
| research_member_profiles | 2 | ✅ Exported |
| research_invitations | 0 | ❌ Table doesn't exist |
| research_presence | 0 | ❌ Table doesn't exist |

Output directory: `/workspace/app/migration/supabase-export/`

### Firebase Auth Inventory Results (COMPLETED via CLI)
| User | Email | Provider | UID |
|------|-------|----------|-----|
| dummy Account | dummyac76y@gmail.com | google.com | 0gGPz7uNMdaXETwdl0JJIUagC0Y2 |

Total: 1 user

---

## User Migration Strategy

### Critical: User IDs are NOT interchangeable
- Supabase Auth users have UUIDs (e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Firebase Auth users have different UUIDs (e.g., `0gGPz7uNMdaXETwdl0JJIUagC0Y2`)
- **Cannot** assume same user has same ID in both systems

### Mapping Approach
1. **Email-based matching**: Primary key for user identity
2. **Preserve Supabase UUID** in Firestore documents as `supabase_user_id` field
3. **Firebase UID** becomes the primary `user_id` in Firestore

### Actual User Mapping (from user-mapping.json)

#### Matched Users (1)
| Supabase User ID | Email | Firebase UID | Notes |
|------------------|-------|--------------|-------|
| fac73b09-d431-44e2-bd7d-e4a1e53240b8 | dummyac76y@gmail.com | 0gGPz7uNMdaXETwdl0JJIUagC0Y2 | Supabase: email provider | Firebase: Google provider |

#### Supabase-Only Users (6) - Need Firebase Auth Accounts Created
| Supabase User ID | Email | Verified | Provider | Metadata |
|------------------|-------|----------|----------|----------|
| 23335bad-27fb-4a06-adeb-cdc50fda8de3 | test@example.com | ❌ | email | - |
| ef3cb0d3-874f-4f8a-88b7-a4d6677b8418 | nicojano200@gmail.com | ✅ | email | - |
| df0a1c72-eeec-41fe-8b30-c99fb8c7a390 | am2801181@gmail.com | ✅ | email | - |
| afb76be7-0510-49dc-8d7f-f4e171d6ab7a | freeupss@gmail.com | ❌ | email | - |
| 5bf81aef-85ec-4951-bdcb-9dd1a2198eba | rodriguezfroilan82@gmail.com | ✅ | email | - |
| e1522ad8-4d83-4c08-9b3a-1631741b3457 | delapuertaroniel@gmail.com | ✅ | email | full_name, avatar_url |

#### Firebase-Only Users (0)
None.

### Duplicate User Handling Decision Needed
**dummyac76y@gmail.com** exists in both systems with different auth providers:
- Supabase: Email/password (ID: `fac73b09-d431-44e2-bd7d-e4a1e53240b8`)
- Firebase: Google OAuth (UID: `0gGPz7uNMdaXETwdl0JJIUagC0Y2`)

**Decision required**: 
- Option A: Keep Firebase Google account as primary, link Supabase email as secondary provider
- Option B: Create new Firebase email/password account, user must choose
- Option C: Merge by keeping Firebase UID, update provider data

---

## Data Migration Mapping

### Source Tables → Destination Collections

| # | Supabase Table | Rows | Firestore Collection | Notes |
|---|----------------|------|---------------------|-------|
| 1 | auth.users | 7 | users + publicProfiles + Firebase Auth | Map emails to Firebase UIDs |
| 2 | research_workspaces | 3 | research_workspaces | Add supabase_workspace_id |
| 3 | research_members | 8 | research_members | Map user_id to Firebase UID, doc ID = workspace_id__user_id |
| 4 | research_sections | 36 | research_sections | Map created_by, updated_by |
| 5 | research_tasks | 1 | research_tasks | Map assignee_id, created_by |
| 6 | research_meetings | 7 | research_meetings | Map created_by |
| 7 | research_messages | 14 | research_messages | Map sender_id, mentioned_user_ids |
| 8 | research_notifications | 25 | research_notifications | Map recipient_id, actor_id |
| 9 | research_chapters | 11 | research_chapters | Map created_by |
| 10 | research_member_profiles | 2 | research_member_profiles | Map user_id, doc ID = workspace_id__user_id |
| 11 | research_invitations | 0 | research_invitations | Table doesn't exist in Supabase |
| 12 | research_presence | 0 | research_presence | Table doesn't exist in Supabase |

### Key Mapping Rules
- All `user_id` / `created_by` / `updated_by` / `sender_id` / `recipient_id` / `actor_id` / `assignee_id` / `mentioned_user_ids` → Map via email to Firebase UID
- Preserve original Supabase UUID as `supabase_user_id` field in each document
- Workspace IDs remain unchanged (they're not user-specific)
- Document IDs for `research_members` and `research_member_profiles` use composite key: `workspace_id__user_id` (with mapped Firebase UID)

---

## Migration Steps Status

### Phase 1: Export (Read-only) ✅ COMPLETED
1. ✅ Run `export-supabase-data.js` with Supabase Service Role Key
2. ✅ Verify export completeness

### Phase 2: User Mapping ✅ COMPLETED
1. ✅ Run `inventory-firebase-users.js --cli` (using authenticated Firebase CLI)
2. ✅ Create email → Firebase UID mapping
3. ✅ Match Supabase users to Firebase users by email
4. ⚠️ Handle unmatched users (6 Supabase-only users need Firebase Auth accounts)

### Phase 3: Data Transformation 🔄 READY TO START
1. Build transformation scripts using user-mapping.json
2. Transform each table using mapping above
3. Replace Supabase user IDs with Firebase UIDs
4. Add `supabase_*` fields for traceability
5. Validate against Firestore rules

### Phase 4: Import (Dry-run first) ⏳ PENDING
1. Test import to Firestore emulator (requires Java)
2. Verify rules pass
3. Run against production (with explicit approval)

---

## Required Credentials Status

| Credential | Status | Method |
|------------|--------|--------|
| Supabase Service Role Key | ✅ Provided | Used for export |
| Firebase Admin SDK (service account) | ❌ Not needed | Using CLI auth:export instead |
| Firebase CLI auth | ✅ Authenticated | Logged in as delapuertaroniel@gmail.com |

---

## Blockers / Decisions Needed Before Import

1. **Duplicate user handling** - dummyac76y@gmail.com exists in both with different providers
2. **Password migration** - Cannot migrate passwords; 6 Supabase-only users need Firebase Auth accounts created (will require password reset flow)
3. **Production import approval** - Explicit approval required before write
4. **Firestore emulator** - Requires Java installation for local testing

---

## Next Actions

1. **Resolve duplicate user strategy** for dummyac76y@gmail.com
2. **Create Firebase Auth accounts** for 6 unmatched Supabase users (Admin SDK needed or manual)
3. **Build data transformation scripts** using user-mapping.json
4. **Install Java** for Firestore emulator testing (or skip to production with approval)
5. **Request approval** for production import