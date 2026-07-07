import { createRemoteJWKSet, jwtVerify } from "jose";
import type { VerifiedFirebaseToken } from "./session-user";

const secureTokenJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing Firebase project id");

  try {
    const { payload } = await jwtVerify(idToken, secureTokenJwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub || !payload.email || typeof payload.email !== "string") return null;
    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
