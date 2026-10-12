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

## User Migration Strategy

### Critical: User IDs are NOT interchangeable
- Supabase Auth users have UUIDs (e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Firebase Auth users have different UUIDs (e.g., `0gGPz7uNMdaXETwdl0JJIUagC0Y2`)
- **Cannot** assume same user has same ID in both systems

### Mapping Approach
1. **Email-based matching**: Primary key for user identity
2. **Preserve Supabase UUID** in Firestore documents as `supabase_user_id` field
3. **Firebase UID** becomes the primary `user_id` in Firestore

### Existing Firebase Users
- 1 user: `dummyac76y@gmail.com` (Google provider, UID: `0gGPz7uNMdaXETwdl0JJIUagC0Y2`)

---

## Data Migration Mapping

### 1. Auth Users → Firebase Auth + Firestore `users` + `publicProfiles`
| Supabase | Firebase Auth | Firestore `users` | Firestore `publicProfiles` |
|----------|---------------|-------------------|---------------------------|
| id | (new UID) | uid | uid |
| email | email | email | - |
| email_confirmed_at | emailVerified | - | - |
| user_metadata.full_name | displayName | display_name | display_name |
| user_metadata.avatar_url | photoURL | photo_url | photo_url |
| created_at | metadata.creationTime | - | - |
| updated_at | metadata.lastSignInTime | updated_at | updated_at |

### 2. research_workspaces
| Supabase | Firestore `research_workspaces` |
|----------|--------------------------------|
| id | id |
| title | title |
| research_title | research_title |
| institution | institution |
| program | program |
| created_by | owner_id (mapped to Firebase UID) |
| join_code | join_code |
| created_at | created_at |
| updated_at | updated_at |
| (new) | supabase_workspace_id |

### 3. research_members
| Supabase | Firestore `research_members` |
|----------|-------------------------------|
| id | id (workspace_id__user_id) |
| workspace_id | workspace_id |
| user_id | user_id (mapped to Firebase UID) |
| name | display_name |
| email | email |
| role | role |
| joined_at | joined_at |
| (new) | supabase_user_id |

### 4. research_sections
| Supabase | Firestore `research_sections` |
|----------|-------------------------------|
| id | id |
| workspace_id | workspace_id |
| title | title |
| content | content |
| chapter | chapter |
| order | order |
| created_by | created_by (mapped) |
| updated_by | updated_by (mapped) |
| created_at | created_at |
| updated_at | updated_at |

### 5. research_tasks
| Supabase | Firestore `research_tasks` |
|----------|----------------------------|
| id | id |
| workspace_id | workspace_id |
| title | title |
| description | description |
| assignee_id | assignee_id (mapped) |
| assignee_name | assignee_name |
| due_date | due_date |
| priority | priority |
| status | status |
| created_by | created_by (mapped) |
| created_at | created_at |
| updated_at | updated_at |

### 6. research_meetings
| Supabase | Firestore `research_meetings` |
|----------|------------------------------|
| id | id |
| workspace_id | workspace_id |
| title | title |
| date | date |
| agenda | agenda |
| notes | notes |
| created_by | created_by (mapped) |
| created_at | created_at |
| updated_at | updated_at |

### 7. research_messages
| Supabase | Firestore `research_messages` |
|----------|------------------------------|
| id | id |
| workspace_id | workspace_id |
| sender_id | sender_id (mapped) |
| sender_name | sender_name |
| text | text |
| topic | topic |
| mentioned_user_ids | mentioned_user_ids (mapped) |
| created_at | created_at |

### 8. research_notifications
| Supabase | Firestore `research_notifications` |
|----------|-----------------------------------|
| id | id |
| workspace_id | workspace_id |
| recipient_id | recipient_id (mapped) |
| actor_id | actor_id (mapped) |
| kind | kind |
| content | content |
| metadata | metadata |
| created_at | created_at |
| read_at | read_at |

### 9. research_chapters
| Supabase | Firestore `research_chapters` |
|----------|------------------------------|
| id | id |
| workspace_id | workspace_id |
| title | title |
| chapter_order | chapter_order |
| created_by | created_by (mapped) |
| created_at | created_at |
| updated_at | updated_at |

### 10. research_member_profiles
| Supabase | Firestore `research_member_profiles` |
|----------|-------------------------------------|
| id | id (workspace_id__user_id) |
| workspace_id | workspace_id |
| user_id | user_id (mapped) |
| display_name | display_name |
| avatar_url | avatar_url |
| updated_at | updated_at |

### 11. research_invitations
| Supabase | Firestore `research_invitations` |
|----------|---------------------------------|
| id | id |
| code | code |
| workspace_id | workspace_id |
| active | active |
| created_by | created_by (mapped) |
| created_at | created_at |
| expires_at | expires_at |
| workspace_title | workspace_title |

### 12. research_presence
| Supabase | Firestore `research_presence` |
|----------|------------------------------|
| id | id (workspace_id__user_id) |
| workspace_id | workspace_id |
| user_id | user_id (mapped) |
| online | online |
| updated_at | updated_at |

---

## Migration Steps

### Phase 1: Export (Read-only)
1. Run `export-supabase-data.js` with Supabase Service Role Key
2. Verify export completeness

### Phase 2: User Mapping
1. Run `inventory-firebase-users.js` with Firebase Admin SDK
2. Create email → Firebase UID mapping
3. Match Supabase users to Firebase users by email
4. Handle unmatched users (create in Firebase Auth or flag for manual review)

### Phase 3: Data Transformation
1. Transform each table using mapping above
2. Replace Supabase user IDs with Firebase UIDs
3. Add `supabase_*` fields for traceability
4. Validate against Firestore rules

### Phase 4: Import (Dry-run first)
1. Test import to Firestore emulator
2. Verify rules pass
3. Run against production (with approval)

---

## Required Credentials

### Supabase
- `SUPABASE_URL` = `https://ldsjdsgzqcawuhrnbvkq.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = **Required** (Settings > API > service_role)

### Firebase Admin
- Service account JSON (Project Settings > Service Accounts > Generate Private Key)
- Or `GOOGLE_APPLICATION_CREDENTIALS` pointing to key file

---

## Blockers / Decisions Needed

1. **Supabase Service Role Key** - Required for export script
2. **Firebase Service Account** - Required for Admin SDK scripts
3. **Duplicate user handling** - What if email exists in both with different data?
4. **Password migration** - Cannot migrate passwords; users must reset
5. **Production import approval** - Explicit approval required before write

---

## Next Actions
1. Obtain Supabase Service Role Key
2. Create Firebase Service Account
3. Run export script
4. Run inventory script
5. Build transformation scripts
6. Test with Firestore emulator
7. Request approval for production import