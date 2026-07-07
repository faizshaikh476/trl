"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyFirebaseIdToken } from "@/lib/auth/firebase-token";
import { SESSION_COOKIE, deriveCurrentUserFromAuth } from "@/lib/auth/session-user";
import { findAuthenticatedUser } from "@/lib/auth/user-repository";

function redirectForUser(role: string, nextPath?: string) {
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) return nextPath;
  return role === "super_admin" ? "/admin" : "/dashboard";
}

export type CreateSessionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export async function createSession(idToken: string, nextPath?: string): Promise<CreateSessionResult> {
  const token = await verifyFirebaseIdToken(idToken);
  if (!token) return { ok: false, message: "Invalid sign-in token." };

  const user = deriveCurrentUserFromAuth(token, await findAuthenticatedUser(token.uid));
  if (!user) return { ok: false, message: "Your account is not active on therealestatelink." };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, idToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 55,
  });
  return { ok: true, redirectTo: redirectForUser(user.role, nextPath) };
}

export async function signOutWorkspaceRole() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
