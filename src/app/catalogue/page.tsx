import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function CatalogueRedirectPage() {
  const user = await getAuthenticatedUser();
  if (!user?.workspaceId) redirect("/login?next=/catalogue");

  const workspace = await workspaceService.findById(user.workspaceId);
  if (!workspace) redirect("/dashboard/settings");

  redirect(`/b/${workspace.slug}`);
}
