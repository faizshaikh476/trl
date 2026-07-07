import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let emulatorConnected = false;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertFirebaseClientConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required public Firebase environment variables: ${missing.join(", ")}`);
  }
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0]!;

  assertFirebaseClientConfig();
  return initializeApp(firebaseConfig);
}

function connectEmulatorsOnce() {
  if (emulatorConnected || typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "true") return;
  emulatorConnected = true;
  connectAuthEmulator(getClientAuth(), "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(getClientDb(), "127.0.0.1", 8080);
  connectStorageEmulator(getClientStorage(), "127.0.0.1", 9199);
}

export function getClientAuth() {
  auth ??= getAuth(getFirebaseApp());
  return auth;
}

export function getClientDb() {
  db ??= getFirestore(getFirebaseApp());
  return db;
}

export function getClientStorage() {
  storage ??= getStorage(getFirebaseApp());
  return storage;
}

export function initializeFirebaseClient() {
  connectEmulatorsOnce();
  return {
    app: getFirebaseApp(),
    auth: getClientAuth(),
    db: getClientDb(),
    storage: getClientStorage(),
  };
}
