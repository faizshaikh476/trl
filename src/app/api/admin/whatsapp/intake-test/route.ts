import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { MockWhatsAppProvider } from "@/lib/whatsapp/providers/mock-provider";
import { whatsappService } from "@/lib/whatsapp/whatsapp-service";

const intakeTestSchema = z.object({
  workspaceId: z.string().min(1),
  from: z.string().min(6),
  text: z.string().trim().min(20),
  media: z
    .array(
      z.object({
        id: z.string().min(1),
        url: z.string().url(),
        type: z.enum(["image", "video", "document"]),
      }),
    )
    .default([]),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Please sign in again before creating a listing." }, { status: 401 });
    }
    if (user.role !== "super_admin") {
      return NextResponse.json({ message: "Only Super Admin can run WhatsApp intake." }, { status: 403 });
    }

    const parsed = intakeTestSchema.safeParse(await request.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const message =
        Object.entries(fieldErrors)
          .flatMap(([field, errors]) => errors.map((error) => `${field}: ${error}`))
          .join(" ") || "Invalid intake data.";
      return NextResponse.json(
        { message, issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await whatsappService.handleWebhook(parsed.data, new MockWhatsAppProvider());
    return NextResponse.json(result);
  } catch (error) {
    console.error("WhatsApp intake failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create listing from this WhatsApp intake.",
      },
      { status: 500 },
    );
  }
}
