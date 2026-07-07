"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "trl_cookie_consent_v1";

type CookieConsent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function CookieConsentBanner() {
  const pathname = usePathname();
  const [showChoices, setShowChoices] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const storedConsent = useSyncExternalStore(subscribeToConsent, readConsent, readServerConsent);
  const visible =
    !storedConsent &&
    !pathname?.startsWith("/admin") &&
    !pathname?.startsWith("/dashboard");

  function saveConsent(choice: Pick<CookieConsent, "analytics" | "marketing">) {
    const consent: CookieConsent = {
      essential: true,
      analytics: choice.analytics,
      marketing: choice.marketing,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("trl:cookie-consent", { detail: consent }));
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950 shadow-2xl sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold tracking-tight">Your privacy matters.</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            We use essential cookies to run TRL. With your permission, analytics help us improve
            property pages and broker workflows.
          </p>
          <div className="mt-2 flex gap-3 text-xs font-medium text-zinc-500">
            <Link href="/privacy" className="hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/dpdp" className="hover:text-emerald-700">
              DPDP notice
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-44">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => saveConsent({ analytics: true, marketing: false })}>
            Accept analytics
          </Button>
          <Button variant="outline" onClick={() => saveConsent({ analytics: false, marketing: false })}>
            Essential only
          </Button>
          <button
            type="button"
            className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
            onClick={() => setShowChoices((value) => !value)}
          >
            Manage choices
          </button>
        </div>
      </div>

      {showChoices ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 sm:grid-cols-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked disabled className="mt-1 size-4" />
            <span>Essential cookies</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>Analytics</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>Marketing</span>
          </label>
          <Button
            className="sm:col-span-3"
            variant="outline"
            onClick={() => saveConsent({ analytics, marketing })}
          >
            Save choices
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("trl:cookie-consent", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("trl:cookie-consent", callback);
  };
}

function readConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

function readServerConsent() {
  return "server";
}
