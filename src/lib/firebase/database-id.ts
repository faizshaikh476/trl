export function getFirestoreDatabaseId() {
  return process.env.FIRESTORE_DATABASE_ID?.trim() || "(default)";
}
