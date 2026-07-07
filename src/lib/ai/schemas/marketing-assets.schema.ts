import { z } from "zod";

export const marketingAssetsSchema = z.object({
  seoTitle: z.string(),
  seoDescription: z.string(),
  whatsappShareText: z.string(),
  instagramCaption: z.string(),
});
