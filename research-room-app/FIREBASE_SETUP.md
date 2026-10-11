# Research Room Firebase setup

This branch switches the application backend calls to the Firebase Web SDK. It is not connected to the Firebase project until the Web App is registered, providers are enabled, Firestore is created, and the actual configuration values are supplied.

## Firebase project
Use only project ID: `researchroom-71e70`.

## 1. Register the web app
The current connected tools do not have an authenticated Firebase project-management session, so web-app registration must be done from your computer/console.

From a terminal after installing nothing manually, the Firebase CLI can be used:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest apps:create WEB "Research Room Web" --project researchroom-71e70
```

Save the Web App ID returned by the second command. Retrieve the real config:

```bash
npx -y firebase-tools@latest apps:sdkconfig <WEB_APP_ID> --project researchroom-71e70
```

Alternatively, in Firebase Console: Project settings → General → Your apps → Add app → Web.

## 2. Enable Authentication
In Firebase Console, open Build → Authentication → Get started → Sign-in method. Enable Email/Password and Google; set a support email for Google. Add `localhost` and your preview/production hostnames under Authentication → Settings → Authorized domains when ready.

## 3. Create Firestore
In Firebase Console, open Build → Firestore Database → Create database. Select a region carefully; choose Singapore if available and appropriate. Do not deploy the prototype rules until you run Emulator Suite tests and review every permission path.

## 4. Environment configuration
From `research-room-app`, copy `.env.example` to `.env.local` and replace all placeholder values using the actual Web App config. Do not commit `.env.local`.

Vercel → Project → Settings → Environment Variables: add these for Preview first, then redeploy:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET` (optional for current Auth/Firestore code)
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 5. Deploy Firestore rules only after testing
After the database exists and you have reviewed the rules:

```bash
npx -y firebase-tools@latest use researchroom-71e70
npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-research-room
```

Only deploy after tests pass:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes --project researchroom-71e70
```

## Notes
- The Firebase Web App is not registered by this commit. The registration command above creates it in the selected project after you authenticate.
- Firebase Authentication users are not migrated from Supabase. Existing Supabase accounts and data remain in Supabase and are not copied.
- The application uses a small compatibility adapter to minimize UI changes, but its authentication and data operations run through Firebase Auth/Firestore, not the Supabase SDK.
- Online presence is stored in Firestore. This is best-effort client presence, not server-guaranteed disconnect detection; stronger presence uses Realtime Database.
- Notifications are written client-side after user operations. Trusted event-driven automation would need additional backend infrastructure.
- These Firestore rules are a prototype. Run positive and negative Emulator Suite tests before any production release.
