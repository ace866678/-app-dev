# Research Room

Research Room is a collaborative thesis-planning workspace built with React, TypeScript, Vite, and the existing Supabase Auth/Postgres backend.

## Deadline compatibility branch

This branch temporarily reconnects the current UI to the existing Supabase project so previous accounts and research records remain available while the Firebase Auth/Firestore migration is validated separately.

**Preview-only: do not merge this compatibility branch into the Firebase migration release or deploy it to Production without review.** No Supabase records are copied, overwritten, or deleted by this change.

## Local development

Run these commands from this directory:

```bash
npm install
cp .env.example .env.local
npm run dev
```

For this compatibility branch, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The remaining Firebase configuration is documented in [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the separate migration branch.

## Build and security-rule tests

```bash
npm run build
npx --yes firebase-tools@15.33.0 emulators:exec --only auth,firestore --project research-room-test "npm run test:rules"
```

The security-rule tests run against local emulators. A passing emulator test does not itself authorize changing production data or rules.

## Vercel

Use root directory `research-room-app`, framework **Vite**, build command `npm run build`, and output directory `dist`. Keep this compatibility branch on Preview while verifying sign-in and existing research records.
