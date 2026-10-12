# Research Room Firebase setup

## Existing Firebase project

Use the existing Firebase project `researchroom-71e70`; do not create another project or web app.

The registered web app reported for this project is:

- App nickname: `research-room-app`
- App ID: `1:955192172922:web:a84e7ca2f245d0831ab6c3`

The application code reads its Firebase configuration from Vite environment variables. The App ID and sender ID are prefilled in `.env.example`; copy the exact `apiKey` shown under Firebase Console → Project settings → General → Your apps.

## 1. Configure Authentication

In Firebase Console, open **Authentication → Sign-in method** and enable:

- **Email/Password**
- **Google**, including a support email

Then open **Authentication → Settings → Authorized domains**. Add `localhost` for local development and the stable Vercel preview hostname you intend to test. Add the production hostname only when you are ready to release. The Google provider domain is not a substitute for authorizing the hostname users open in their browser.

## 2. Configure local environment

From `research-room-app`, copy `.env.example` to `.env.local` and fill in the exact `VITE_FIREBASE_API_KEY` from the registered web app's configuration. Confirm the remaining values match that app before starting the dev server:

```bash
npm install
npm run dev
```

`.env.local` and `.env` are ignored by Git. Never commit either file. Firebase web config is delivered to the browser by design; Firestore rules and Authentication provider settings must enforce access control.

## 3. Vercel Preview environment

In Vercel → **Research Room → Settings → Environment Variables**, add these variables to **Preview** first, using the same values as `.env.local`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET` (optional; this app does not currently use Firebase Storage)

Redeploy the Preview after setting environment variables. Do not change Production environment variables or promote this migration branch until the preview has been tested end to end.

## 4. Firestore rules — verify before changing

The Kilo setup report says Firestore rules and indexes were deployed, but the deployed rules have not yet been compared with the version tracked in this repository. The checked-in `firestore.rules` file is explicitly a prototype and must **not** be blindly deployed to overwrite the currently deployed rules.

Open Firebase Console → **Firestore Database → Rules** and compare the deployed version with `firestore.rules` on the migration branch. Reconcile the two versions, then run positive and negative tests in the Firebase Emulator Suite before deploying any replacement rules. Do not use open/test-mode rules.

## 5. Test checklist

Use a non-production Preview and a test account. Verify:

1. Email/password account creation and sign-in.
2. Password reset email request.
3. Google sign-in on desktop and mobile.
4. Creating a workspace creates the workspace, owner membership, and invitation.
5. Joining with a valid invitation makes the new member visible; invalid or revoked invitations fail.
6. Workspace chapters, sections, tasks, meetings, messages, and notifications persist after refresh.
7. A user outside a workspace cannot read or modify its data.
8. Ownership transfer and workspace deletion follow the intended authorization rules.

## Migration notes

- Firebase Authentication does not import Supabase users automatically.
- Existing Supabase data is not copied into Firestore by this code change.
- Keep Supabase fallback/production untouched until Firebase behavior and data migration requirements are confirmed.
- Firestore-based presence is best-effort; it does not guarantee disconnect detection like a server-managed presence design.
- Client-written notifications are not a substitute for trusted server-side events where tamper resistance is required.
