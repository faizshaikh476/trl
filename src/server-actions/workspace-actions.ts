"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ownerProfileService } from "@/lib/owners/owner-profile-service";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requireWorkspacePermission } from "@/lib/rbac/require-permission";
import { workspaceService } from "@/lib/workspaces/workspace-service";

const workspaceProfileSchema = z.object({
  name: z.string().trim().min(2, "Company or broker name is required."),
  contactName: z.string().trim().min(2, "Public broker name is required."),
  occupation: z.string().trim().min(2, "Occupation or agency role is required."),
  contactEmail: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
  city: z.string().trim().min(2, "City is required."),
  logoURL: z.string().trim().url("Logo must be a valid URL.").or(z.literal("")),
  websiteTheme: z.enum(["premium", "minimal", "editorial"]),
});

export async function updateWorkspaceProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user.workspaceId) redirect("/login?next=/dashboard/settings");
  requireWorkspacePermission(user, user.workspaceId, PERMISSIONS.TEAM_MANAGE);

  const workspace = await workspaceService.findById(user.workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  const input = workspaceProfileSchema.parse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    occupation: formData.get("occupation"),
    contactEmail: formData.get("contactEmail"),
    city: formData.get("city"),
    logoURL: formData.get("logoURL"),
    websiteTheme: formData.get("websiteTheme"),
  });

  await workspaceService.updateProfile(workspace.id, {
    name: input.name,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    city: input.city,
    logoURL: input.logoURL,
    websiteTheme: input.websiteTheme,
  });

  if (workspace.contactPhone) {
    await ownerProfileService.updateProfileForPhone({
      workspaceId: workspace.id,
      phone: workspace.contactPhone,
      name: input.contactName,
      occupation: input.occupation,
      email: input.contactEmail,
    });
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/catalogue");
  revalidatePath(`/b/${workspace.slug}`);
  redirect("/dashboard/settings?saved=1");
}
