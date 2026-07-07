import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminDb } from "../src/lib/firebase/admin";
import { buildFirestoreSeedDocuments } from "../src/lib/firebase/seed";

loadLocalEnv();

async function main() {
  const documents = buildFirestoreSeedDocuments();
  const db = getAdminDb();
  let batch = db.batch();
  let operations = 0;

  for (const document of documents) {
    batch.set(db.doc(document.path), document.data, { merge: true });
    operations += 1;

    if (operations % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (operations % 450 !== 0) {
    await batch.commit();
  }

  console.log(`Seeded ${documents.length} Firestore documents.`);
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
