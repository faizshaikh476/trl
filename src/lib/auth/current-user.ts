import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/domain";
import { verifyFirebaseIdToken } from "./firebase-token";
import { SESSION_COOKIE, deriveCurrentUserFromAuth } from "./session-user";
import { findAuthenticatedUser, resolveAuthenticatedUserWorkspace } from "./user-repository";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
}

export async function getAuthenticatedUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const token = await verifyFirebaseIdToken(sessionToken);
  if (!token) return null;

  const record = await resolveAuthenticatedUserWorkspace(
    await findAuthenticatedUser(token.uid),
    token.email,
  );
  return deriveCurrentUserFromAuth(token, record);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getAuthenticatedUser();
  if (!user || !user.workspaceId) redirect("/login?next=/dashboard");
  return user;
}

export async function getCurrentAdmin(): Promise<CurrentUser> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "super_admin") redirect("/login?next=/admin");
  return user;
}
