# Research Room

Research Room is a collaborative thesis-planning workspace built with React, TypeScript, Vite, Firebase Authentication, and Cloud Firestore.

## Local development

Run these commands from this directory:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the Firebase **web app** configuration in `.env.local`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

These `VITE_*` values are browser configuration, not service-account credentials. Never put a service-account JSON, private key, or Admin SDK credential in browser code or a `VITE_*` variable.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase Auth, Firestore, emulator, and deployment setup.

## Build and security-rule tests

```bash
npm run build
npx --yes firebase-tools@15.33.0 emulators:exec --only auth,firestore --project research-room-test "npm run test:rules"
```

The rules suite runs against local emulators and covers both allowed and denied access, including task-assignee workspace membership validation. It must not be pointed at production data.

## Vercel

Configure the Vercel project with **Root Directory** `research-room-app`, framework **Vite**, build command `npm run build`, and output directory `dist`. Configure the Firebase web-app values separately for Preview and Production only after confirming the intended Firebase project for each environment.

## Production release gate

Do not deploy Firestore rules or enable production Firebase traffic until all of the following are complete:

1. Revoke any service-account keys reported as exposed in the earlier work, and verify they are no longer usable.
2. Compare the candidate rules against the rules currently deployed in Firebase and approve the access model.
3. Reconcile the earlier interrupted import read-only, and back up the relevant data before any retry.
4. Run end-to-end Auth and Firestore checks against an isolated staging Firebase project.
5. Confirm Production environment variables target the approved Firebase project.

A passing frontend build or emulator test is not, by itself, evidence that production data is safe to migrate.
