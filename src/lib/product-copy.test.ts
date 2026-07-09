import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const customerFacingFiles = [
  "src/app/login/page.tsx",
  "src/components/auth/login-form.tsx",
  "src/app/dashboard/settings/page.tsx",
  "src/app/dashboard/listings/new/page.tsx",
  "src/app/global-error.tsx",
  "src/app/l/[slug]/page.tsx",
  "src/components/public/owner-verification-modal.tsx",
];

const implementationPhrases = [
  "Firebase Auth",
  "Firestore",
  "production-ready",
  "configured for this deployment",
  "deployment logs",
  "live in the separate Super Admin console",
];

describe("product copy", () => {
  it("keeps implementation language out of customer-facing surfaces", () => {
    const copy = customerFacingFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    for (const phrase of implementationPhrases) {
      expect(copy).not.toContain(phrase);
    }
  });
});
