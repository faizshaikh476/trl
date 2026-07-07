export function assertFirestoreEnvironment() {
  const missing = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ].filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Firebase server environment variables: ${missing.join(", ")}`);
  }
}
