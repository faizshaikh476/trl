import { z } from "zod";

export const imageClassificationSchema = z.array(
  z.object({
    mediaId: z.string(),
    roomType: z.string(),
  }),
);
