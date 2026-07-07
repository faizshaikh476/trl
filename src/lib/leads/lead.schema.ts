import { z } from "zod";

export const publicLeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Use a valid 10 digit Indian mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().trim().min(3).max(1000),
  preferredVisitDate: z.string().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  contactConsent: z.literal(true, {
    error: "Please agree to be contacted about this property.",
  }),
  marketingConsent: z.boolean().default(false),
  consentVersion: z.string().default("lead-enquiry-v1"),
  source: z.string().default("public_listing"),
  listingId: z.string().min(2),
});

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
export type LeadCreateInput = PublicLeadInput & { workspaceId: string };
