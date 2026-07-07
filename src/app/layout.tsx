import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieConsentBanner } from "@/components/consent/cookie-consent-banner";
import { getPlatformBranding } from "@/lib/platform/branding";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  const images = branding.socialImageUrl ? [{ url: branding.socialImageUrl }] : undefined;

  return {
    title: {
      default: branding.seoTitle,
      template: `%s | ${branding.brandName}`,
    },
    description: branding.seoDescription,
    applicationName: branding.brandName,
    icons: branding.faviconUrl
      ? {
          icon: [{ url: branding.faviconUrl }],
          shortcut: [{ url: branding.faviconUrl }],
          apple: [{ url: branding.faviconUrl }],
        }
      : undefined,
    openGraph: {
      title: branding.seoTitle,
      description: branding.seoDescription,
      siteName: branding.brandName,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: branding.seoTitle,
      description: branding.seoDescription,
      images: branding.socialImageUrl ? [branding.socialImageUrl] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
