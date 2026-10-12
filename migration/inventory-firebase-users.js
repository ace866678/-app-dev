#!/usr/bin/env node
/**
 * Firebase Auth User Inventory Script
 * 
 * Lists all Firebase Authentication users using Admin SDK.
 * Requires Firebase Admin SDK credentials (service account).
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node inventory-firebase-users.js
 * 
 * Or set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON content.
 * 
 * Output: ./firebase-users.json
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { writeFileSync } from 'fs';

function getServiceAccount() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (credsJson) {
    return JSON.parse(credsJson);
  }
  if (credsPath) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(credsPath);
  }
  return null;
}

async function main() {
  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    console.error('ERROR: Firebase Admin credentials required');
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json');
    console.error('Or set FIREBASE_SERVICE_ACCOUNT_JSON with the JSON content');
    console.error('\nGet service account from:');
    console.error('Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
    process.exit(1);
  }

  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth(app);
  const allUsers = [];
  let nextPageToken = undefined;

  console.log('Fetching Firebase Auth users...');

  try {
    do {
      const result = await auth.listUsers(1000, nextPageToken);
      for (const userRecord of result.users) {
        allUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          phoneNumber: userRecord.phoneNumber,
          disabled: userRecord.disabled,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
          providerData: userRecord.providerData.map(p => ({
            providerId: p.providerId,
            uid: p.uid,
            email: p.email,
            displayName: p.displayName,
            photoURL: p.photoURL,
          })),
          customClaims: userRecord.customClaims || {},
        });
      }
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    writeFileSync('./firebase-users.json', JSON.stringify({ users: allUsers }, null, 2));
    console.log(`\nExported ${allUsers.length} users to firebase-users.json`);

    console.log('\nUser summary:');
    for (const user of allUsers) {
      const providers = user.providerData.map(p => p.providerId).join(', ');
      console.log(`  ${user.uid} | ${user.email} | ${providers} | created: ${user.metadata.creationTime}`);
    }

  } catch (error) {
    console.error('Inventory failed:', error.message);
    process.exit(1);
  }
}

main();