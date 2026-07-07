import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { assertFirestoreEnvironment } from "@/lib/data/source";
import { getFirestoreDatabaseId } from "./database-id";

let app: App | null = null;
let db: Firestore | null = null;
let storage: Storage | null = null;

export function getAdminApp() {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  assertFirestoreEnvironment();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  app = initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: getFirebaseStorageBucketName(projectId),
    },
  );
  return app;
}

export function getAdminDb() {
  db ??= getFirestore(getAdminApp(), getFirestoreDatabaseId());
  return db;
}

export function getAdminStorage() {
  storage ??= getStorage(getAdminApp());
  return storage;
}

export function getFirebaseStorageBucketName(projectId: string) {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`
  );
}
