import { NextResponse } from "next/server";
import { getPlatformBranding } from "@/lib/platform/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const branding = await getPlatformBranding();

  if (branding.faviconUrl) {
    return NextResponse.redirect(branding.faviconUrl, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const initials = (branding.shortName || "TR").slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#06b6d4"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#020617">${initials}</text></svg>`;

  return new NextResponse(svg, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/svg+xml",
    },
  });
}
