#!/usr/bin/env node
/**
 * Firebase Auth User Inventory Script
 * 
 * Lists all Firebase Authentication users using either:
 * 1. Firebase Admin SDK (requires service account)
 * 2. Firebase CLI auth:export (works with authenticated CLI session)
 * 
 * Usage (Admin SDK):
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node inventory-firebase-users.js
 * 
 * Or set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON content.
 * 
 * Usage (CLI export - no service account needed):
 *   node inventory-firebase-users.js --cli
 * 
 * Output: ./firebase-users.json
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

const PROJECT_ID = 'researchroom-71e70';
const USE_CLI = process.argv.includes('--cli');

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

async function inventoryViaAdminSDK() {
  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    throw new Error('Firebase Admin credentials required. Use --cli flag or provide service account.');
  }

  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth(app);
  const allUsers = [];
  let nextPageToken = undefined;

  console.log('Fetching Firebase Auth users via Admin SDK...');

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

  return allUsers;
}

function inventoryViaCLI() {
  console.log('Fetching Firebase Auth users via Firebase CLI...');
  
  const result = spawnSync('npx', [
    '-y', 'firebase-tools@latest', 'auth:export', '/tmp/firebase-users-cli.json',
    '--project', PROJECT_ID, '--format', 'json'
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`CLI export failed: ${result.stderr || result.stdout}`);
  }

  const raw = JSON.parse(readFileSync('/tmp/firebase-users-cli.json', 'utf8'));
  return raw.users.map(u => ({
    uid: u.localId,
    email: u.email,
    emailVerified: u.emailVerified,
    displayName: u.displayName,
    photoURL: u.photoUrl,
    phoneNumber: u.phoneNumber,
    disabled: u.disabled,
    metadata: {
      creationTime: u.createdAt,
      lastSignInTime: u.lastSignedInAt,
    },
    providerData: (u.providerUserInfo || []).map(p => ({
      providerId: p.providerId,
      uid: p.rawId,
      email: p.email,
      displayName: p.displayName,
      photoURL: p.photoUrl,
    })),
    customClaims: u.customClaims || {},
  }));
}

async function main() {
  let allUsers;

  try {
    if (USE_CLI) {
      allUsers = inventoryViaCLI();
    } else {
      allUsers = await inventoryViaAdminSDK();
    }

    writeFileSync('./firebase-users.json', JSON.stringify({ users: allUsers }, null, 2));
    console.log(`\nExported ${allUsers.length} users to firebase-users.json`);

    console.log('\nUser summary:');
    for (const user of allUsers) {
      const providers = user.providerData.map(p => p.providerId).join(', ');
      console.log(`  ${user.uid} | ${user.email} | ${providers} | created: ${user.metadata.creationTime}`);
    }

  } catch (error) {
    console.error('Inventory failed:', error.message);
    if (!USE_CLI && error.message.includes('credentials')) {
      console.error('\nTip: Run with --cli flag to use authenticated Firebase CLI session instead');
      console.error('  node inventory-firebase-users.js --cli');
    }
    process.exit(1);
  }
}

main();