import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "../src/lib/firebase/admin";

loadLocalEnv();

const seedUsers = [
  {
    uid: "user_super_admin",
    email: "admin@therealestatelink.local",
    displayName: "Super Admin",
    envKey: "SEED_ADMIN_PASSWORD",
  },
  {
    uid: "user_owner_demo",
    email: "owner@therealestatelink.local",
    displayName: "Deepak S.",
    envKey: "SEED_BROKER_PASSWORD",
  },
];

async function main() {
  const auth = getAuth(getAdminApp());
  const credentials: Array<{ email: string; password: string }> = [];

  for (const user of seedUsers) {
    const password = process.env[user.envKey] || generatePassword();
    try {
      await auth.updateUser(user.uid, {
        email: user.email,
        displayName: user.displayName,
        password,
        emailVerified: true,
        disabled: false,
      });
    } catch (error) {
      if (!isUserNotFoundError(error)) throw error;
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        password,
        emailVerified: true,
        disabled: false,
      });
    }
    credentials.push({ email: user.email, password });
  }

  console.log("Seeded Firebase Auth users:");
  for (const credential of credentials) {
    console.log(`${credential.email} ${credential.password}`);
  }
}

function generatePassword() {
  return `Trl-${randomBytes(9).toString("base64url")}-2026`;
}

function isUserNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found";
}

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
