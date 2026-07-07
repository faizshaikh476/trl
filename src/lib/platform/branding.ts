import "server-only";

import { z } from "zod";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";

export interface PlatformBranding {
  brandName: string;
  shortName: string;
  logoUrl: string;
  faviconUrl: string;
  socialImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  supportEmail: string;
  updatedAt: string;
}

export const defaultPlatformBranding: PlatformBranding = {
  brandName: "therealestatelink",
  shortName: "TRL",
  logoUrl: "",
  faviconUrl: "",
  socialImageUrl: "",
  seoTitle: "therealestatelink | AI-powered WhatsApp to property pages",
  seoDescription:
    "AI-powered WhatsApp intake that turns broker property photos and details into clean listing pages, catalogues, and enquiry-ready links.",
  supportEmail: "",
  updatedAt: "",
};

const optionalUrl = z.string().trim().url("Enter a valid URL.").or(z.literal(""));

export const platformBrandingSchema = z.object({
  brandName: z.string().trim().min(2, "Brand name is required.").max(80),
  shortName: z.string().trim().min(2, "Short name is required.").max(12),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  socialImageUrl: optionalUrl,
  seoTitle: z.string().trim().min(8, "SEO title is too short.").max(90),
  seoDescription: z.string().trim().min(30, "SEO description is too short.").max(180),
  supportEmail: z.string().trim().email("Enter a valid support email.").or(z.literal("")),
});

export type PlatformBrandingInput = z.infer<typeof platformBrandingSchema>;

export async function getPlatformBranding(): Promise<PlatformBranding> {
  try {
    const snapshot = await getAdminDb().doc(firestorePaths.platformSetting("branding")).get();
    if (!snapshot.exists) return defaultPlatformBranding;
    return normalizePlatformBranding(snapshot.data());
  } catch (error) {
    console.warn("Platform branding unavailable", {
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return defaultPlatformBranding;
  }
}

export async function updatePlatformBranding(input: PlatformBrandingInput) {
  const now = new Date().toISOString();
  const branding: PlatformBranding = {
    ...defaultPlatformBranding,
    ...input,
    updatedAt: now,
  };
  await getAdminDb().doc(firestorePaths.platformSetting("branding")).set(branding, { merge: true });
  return branding;
}

export function platformBrandingFromFormData(formData: FormData) {
  return platformBrandingSchema.parse({
    brandName: formData.get("brandName"),
    shortName: formData.get("shortName"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    socialImageUrl: formData.get("socialImageUrl"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    supportEmail: formData.get("supportEmail"),
  });
}

const brandingAssetTypes = {
  logo: {
    label: "Logo",
    maxBytes: 5 * 1024 * 1024,
    contentTypes: new Map([
      ["image/png", "png"],
      ["image/jpeg", "jpg"],
      ["image/webp", "webp"],
      ["image/svg+xml", "svg"],
    ]),
  },
  favicon: {
    label: "Favicon",
    maxBytes: 1024 * 1024,
    contentTypes: new Map([
      ["image/png", "png"],
      ["image/svg+xml", "svg"],
      ["image/x-icon", "ico"],
      ["image/vnd.microsoft.icon", "ico"],
    ]),
  },
  socialImage: {
    label: "Social preview image",
    maxBytes: 8 * 1024 * 1024,
    contentTypes: new Map([
      ["image/png", "png"],
      ["image/jpeg", "jpg"],
      ["image/webp", "webp"],
    ]),
  },
} as const;

export type PlatformBrandingAssetType = keyof typeof brandingAssetTypes;

export async function uploadPlatformBrandingAsset(
  value: FormDataEntryValue | null,
  assetType: PlatformBrandingAssetType,
) {
  if (!isUploadedFile(value)) return "";

  const config = brandingAssetTypes[assetType];
  const extension = config.contentTypes.get(value.type);
  if (!extension) {
    throw new Error(`${config.label} must be an image file in a supported format.`);
  }
  if (value.size > config.maxBytes) {
    throw new Error(`${config.label} is too large. Please upload a smaller file.`);
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  const fileName = `${assetType}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storagePath = `platform/branding/${fileName}`;
  const file = getAdminStorage().bucket().file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: value.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "2500-01-01",
  });
  return url;
}

function normalizePlatformBranding(value: FirebaseFirestore.DocumentData | undefined): PlatformBranding {
  const data = value ?? {};
  return {
    brandName: stringOrDefault(data.brandName, defaultPlatformBranding.brandName),
    shortName: stringOrDefault(data.shortName, defaultPlatformBranding.shortName),
    logoUrl: stringOrDefault(data.logoUrl, defaultPlatformBranding.logoUrl),
    faviconUrl: stringOrDefault(data.faviconUrl, defaultPlatformBranding.faviconUrl),
    socialImageUrl: stringOrDefault(data.socialImageUrl, defaultPlatformBranding.socialImageUrl),
    seoTitle: stringOrDefault(data.seoTitle, defaultPlatformBranding.seoTitle),
    seoDescription: stringOrDefault(data.seoDescription, defaultPlatformBranding.seoDescription),
    supportEmail: stringOrDefault(data.supportEmail, defaultPlatformBranding.supportEmail),
    updatedAt: stringOrDefault(data.updatedAt, defaultPlatformBranding.updatedAt),
  };
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0
  );
}
