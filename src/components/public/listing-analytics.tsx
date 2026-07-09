"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AnalyticsType = "listing_view" | "whatsapp_click" | "call_click" | "share_click";

function trackListingEvent(listingId: string, type: AnalyticsType) {
  const payload = JSON.stringify({ listingId, type });
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const key = `trl:list-view:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // If storage is blocked, still record the view once for the mounted page.
    }
    trackListingEvent(listingId, "listing_view");
  }, [listingId]);

  return null;
}

export function TrackedListingLink({
  listingId,
  type,
  href,
  className,
  children,
  ariaLabel,
}: {
  listingId: string;
  type: Exclude<AnalyticsType, "listing_view" | "share_click">;
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => trackListingEvent(listingId, type)}
    >
      {children}
    </a>
  );
}

export function ShareListingButton({
  listingId,
  title,
  url,
  className,
  iconOnly = false,
}: {
  listingId: string;
  title: string;
  url: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyListingUrl() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch {
      // Fall through to the manual copy prompt below.
    }

    window.prompt("Copy property link", url);
  }

  async function shareListing(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    trackListingEvent(listingId, "share_click");

    try {
      const canNativeShare =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ title, url }));

      if (canNativeShare) {
        await navigator.share({ title, url });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }

    await copyListingUrl();
  }

  return (
    <Button
      type="button"
      className={className}
      size={iconOnly ? "icon" : "default"}
      onClick={shareListing}
      aria-label={iconOnly ? "Share property" : undefined}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {iconOnly ? null : copied ? "Link copied" : "Share"}
    </Button>
  );
}
