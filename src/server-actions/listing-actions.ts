"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, getCurrentAdmin, getCurrentUser } from "@/lib/auth/current-user";
import { manualListingSchema } from "@/lib/listings/listing.schema";
import { listingService } from "@/lib/listings/listing-service";
import {
  revalidatePublicListing,
  revalidatePublicListingBySlug,
} from "@/lib/public/public-listing-cache";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requireWorkspacePermission } from "@/lib/rbac/require-permission";
import type { ListingStatus } from "@/types/domain";

function formDataToListingInput(formData: FormData) {
  return manualListingSchema.parse({
    title: formData.get("title"),
    transactionType: formData.get("transactionType"),
    propertyType: formData.get("propertyType"),
    location: formData.get("location"),
    city: formData.get("city"),
    locality: formData.get("locality"),
    societyName: formData.get("societyName"),
    googleMapsUrl: formData.get("googleMapsUrl"),
    price: formData.get("price"),
    deposit: formData.get("deposit"),
    brokerage: formData.get("brokerage"),
    taxes: formData.get("taxes"),
    bhk: formData.get("bhk"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    carpetArea: formData.get("carpetArea"),
    builtUpArea: formData.get("builtUpArea"),
    plotArea: formData.get("plotArea"),
    openArea: formData.get("openArea"),
    furnishedStatus: formData.get("furnishedStatus"),
    parkingCount: formData.get("parkingCount"),
    floor: formData.get("floor"),
    totalFloors: formData.get("totalFloors"),
    availability: formData.get("availability"),
    preferredTenant: formData.get("preferredTenant"),
    descriptionShort: formData.get("descriptionShort"),
    descriptionLong: formData.get("descriptionLong"),
    highlightsText: formData.get("highlightsText"),
    amenitiesText: formData.get("amenitiesText"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    whatsappShareText: formData.get("whatsappShareText"),
    instagramCaption: formData.get("instagramCaption"),
  });
}

async function getListingMutationUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
}

async function getListingForMutation(listingId: string, workspaceId?: string) {
  if (workspaceId) return listingService.findByWorkspaceId(workspaceId, listingId);
  return listingService.findAnyById(listingId);
}

export async function createManualListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user.workspaceId) throw new Error("Workspace required");
  requireWorkspacePermission(user, user.workspaceId, PERMISSIONS.LISTINGS_CREATE);
  const input = formDataToListingInput(formData);
  const listing = await listingService.createManual(user.workspaceId, user.id, input);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  redirect(`/dashboard/listings/${listing.id}`);
}

export async function createManualListingInWorkspaceAction(formData: FormData) {
  const user = await getCurrentAdmin();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) throw new Error("Workspace required");
  requireWorkspacePermission(user, workspaceId, PERMISSIONS.LISTINGS_CREATE);
  const input = formDataToListingInput(formData);
  const listing = await listingService.createManual(workspaceId, user.id, input);
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  redirect(`/admin/listings/${listing.id}?workspaceId=${workspaceId}`);
}

export async function updateManualListingAction(listingId: string, formData: FormData) {
  const user = await getListingMutationUser();
  const listing = await getListingForMutation(listingId, user.workspaceId ?? undefined);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_EDIT);
  const input = formDataToListingInput(formData);
  const updated = await listingService.updateManualInWorkspace(listing.workspaceId, listingId, input);
  revalidatePublicListing(listing);
  revalidatePublicListing(updated);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/${listingId}`);
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
}

export async function updateManualListingInWorkspaceAction(
  workspaceId: string,
  listingId: string,
  formData: FormData,
) {
  const user = await getListingMutationUser();
  const listing = await getListingForMutation(listingId, workspaceId);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_EDIT);
  const input = formDataToListingInput(formData);
  const updated = await listingService.updateManualInWorkspace(listing.workspaceId, listingId, input);
  revalidatePublicListing(listing);
  revalidatePublicListing(updated);
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/${listingId}`);
}

export async function updateListingStatusAction(listingId: string, status: ListingStatus) {
  const user = await getListingMutationUser();
  const listing = await getListingForMutation(listingId, user.workspaceId ?? undefined);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_PUBLISH);
  const updated = await listingService.updateStatusInWorkspace(listing.workspaceId, listingId, status);
  revalidatePublicListing(updated);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
}

export async function updateListingStatusInWorkspaceAction(
  workspaceId: string,
  listingId: string,
  status: ListingStatus,
) {
  const user = await getListingMutationUser();
  const listing = await getListingForMutation(listingId, workspaceId);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_PUBLISH);
  const updated = await listingService.updateStatusInWorkspace(listing.workspaceId, listingId, status);
  revalidatePublicListing(updated);
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
}

export async function deleteListingInWorkspaceAction(
  workspaceId: string,
  listingId: string,
  formData: FormData,
) {
  const user = await getCurrentAdmin();
  requireWorkspacePermission(user, workspaceId, PERMISSIONS.LISTINGS_ARCHIVE);
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== "delete") {
    throw new Error("Type delete to permanently delete this listing.");
  }
  const listing = await listingService.findByWorkspaceId(workspaceId, listingId);
  await listingService.deleteInWorkspace(workspaceId, listingId);
  if (listing) {
    revalidatePublicListing(listing);
    revalidatePublicListingBySlug(listing.slug);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  redirect("/admin/listings");
}

export async function duplicateListingAction(listingId: string) {
  const user = await getListingMutationUser();
  const listing = await getListingForMutation(listingId, user.workspaceId ?? undefined);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_CREATE);
  await listingService.duplicate(listingId, user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/listings");
}

export async function duplicateListingInWorkspaceAction(workspaceId: string, listingId: string) {
  const user = await getCurrentAdmin();
  const listing = await getListingForMutation(listingId, workspaceId);
  if (!listing) throw new Error("Listing not found");
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_CREATE);
  const duplicate = await listingService.duplicate(listingId, user.id);
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  redirect(`/admin/listings/${duplicate.id}?workspaceId=${duplicate.workspaceId}`);
}
