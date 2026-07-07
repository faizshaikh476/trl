"use server";

import { redirect } from "next/navigation";
import { ownerClaimService } from "@/lib/claims/owner-claim-service";

export async function claimOwnerAction(token: string, formData: FormData) {
  const result = await ownerClaimService.claim(token, formData);
  if (result.ok) {
    redirect(`/claim/${token}?claimed=1`);
  }

  redirect(`/claim/${token}?error=${encodeURIComponent(result.message)}`);
}
