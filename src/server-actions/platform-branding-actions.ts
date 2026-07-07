"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import {
  platformBrandingFromFormData,
  updatePlatformBranding,
  uploadPlatformBrandingAsset,
} from "@/lib/platform/branding";

export async function updatePlatformBrandingAction(formData: FormData) {
  await getCurrentAdmin();
  const input = platformBrandingFromFormData(formData);
  let logoUrl = "";
  let faviconUrl = "";
  let socialImageUrl = "";

  try {
    [logoUrl, faviconUrl, socialImageUrl] = await Promise.all([
      uploadPlatformBrandingAsset(formData.get("logoFile"), "logo"),
      uploadPlatformBrandingAsset(formData.get("faviconFile"), "favicon"),
      uploadPlatformBrandingAsset(formData.get("socialImageFile"), "socialImage"),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed. Please try another image.";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }

  await updatePlatformBranding({
    ...input,
    logoUrl: logoUrl || input.logoUrl,
    faviconUrl: faviconUrl || input.faviconUrl,
    socialImageUrl: socialImageUrl || input.socialImageUrl,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/login");
  redirect("/admin/settings?saved=branding");
}
