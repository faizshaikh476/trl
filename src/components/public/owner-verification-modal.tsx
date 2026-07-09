"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { BadgeCheck, Loader2, LockKeyhole, UserCheck } from "lucide-react";
import { createSession } from "@/app/login/actions";
import {
  completeBrokerVerificationAction,
  startBrokerVerificationAction,
} from "@/app/l/[slug]/actions";
import { Button } from "@/components/ui/button";
import { initializeFirebaseClient } from "@/lib/firebase/client";
import type { OwnerProfile } from "@/types/domain";

export function OwnerVerificationModal({
  token,
  ownerProfile,
}: {
  token: string;
  ownerProfile: OwnerProfile;
}) {
  const router = useRouter();
  const phoneLast4 = lastFourDigits(ownerProfile.displayPhone || ownerProfile.phone);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<{ email: string; password: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitDetails(formData: FormData) {
    setError(null);
    setMessage(null);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    startTransition(async () => {
      const result = await startBrokerVerificationAction(token, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAccount({ email, password, name });
      setMessage(result.message);
      setStep("otp");
    });
  }

  function submitOtp(formData: FormData) {
    const otp = String(formData.get("otp") ?? "");
    setError(null);
    startTransition(async () => {
      try {
        if (!account) {
          setError("Please request an OTP first.");
          return;
        }

        const { auth } = initializeFirebaseClient();
        let credential;
        try {
          credential = await createUserWithEmailAndPassword(auth, account.email, account.password);
          if (account.name) await updateProfile(credential.user, { displayName: account.name });
        } catch (error) {
          if (!isEmailAlreadyInUse(error)) throw error;
          credential = await signInWithEmailAndPassword(auth, account.email, account.password);
        }

        const idToken = await credential.user.getIdToken();
        const result = await completeBrokerVerificationAction(token, otp, idToken);
        if (!result.ok) {
          setError(result.message);
          return;
        }

        const session = await createSession(idToken, result.redirectTo);
        if (!session.ok) {
          setError(session.message);
          return;
        }
        router.replace(session.redirectTo);
      } catch (error) {
        setError(messageForAuthError(error));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] grid items-end bg-zinc-950/55 px-0 pt-5 backdrop-blur-sm sm:place-items-center sm:px-4 sm:py-6">
      <div className="trl-modal-max-height flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-zinc-100 px-4 py-3 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 sm:size-11">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950 sm:text-2xl">
                Verify your broker profile
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-600 sm:leading-6">
                OTP goes only to the WhatsApp number that created this listing.
              </p>
            </div>
          </div>
        </div>

        {step === "details" ? (
          <form action={submitDetails} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-4 sm:p-6">
              <LockedPhone last4={phoneLast4} />
              <Field label="Full name" name="name" placeholder="Your name" defaultValue={ownerProfile.name} />
              <Field
                label="Occupation"
                name="occupation"
                placeholder="e.g. Broker, Realtor, Channel partner"
                defaultValue={ownerProfile.occupation}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={ownerProfile.email}
              />
              <Field label="Password" name="password" type="password" placeholder="Create password" />
              <ConsentBlock />
              <Status error={error} message={message} />
            </div>
            <ModalFooter isPending={isPending} label="Send WhatsApp OTP" />
          </form>
        ) : (
          <form action={submitOtp} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-4 sm:p-6">
              <LockedPhone last4={phoneLast4} />
              <Field label="OTP" name="otp" inputMode="numeric" placeholder="6 digit code" />
              <Status error={error} message={message ?? "OTP sent on WhatsApp."} />
            </div>
            <ModalFooter isPending={isPending} label="Verify and continue" />
          </form>
        )}
      </div>
    </div>
  );
}

function lastFourDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4) || "----";
}

function isEmailAlreadyInUse(error: unknown) {
  return error instanceof FirebaseError && error.code === "auth/email-already-in-use";
}

function messageForAuthError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-credential") {
      return "This email already exists. Please use the correct password for that account.";
    }
    if (error.code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (error.code === "auth/network-request-failed") return "You appear to be offline. Check your connection and try again.";
  }
  if (error instanceof Error && error.message.includes("Firebase environment variable")) {
    return "Verification is temporarily unavailable. Please try again shortly.";
  }
  return "Unable to verify right now. Please try again.";
}

function LockedPhone({ last4 }: { last4: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <LockKeyhole className="size-4 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Locked WhatsApp
            </p>
            <p className="truncate text-sm text-zinc-600">OTP and ownership stay tied to this number.</p>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm">
          **** {last4}
        </div>
      </div>
    </div>
  );
}

function ConsentBlock() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-sm font-semibold text-zinc-950">Before we send OTP</p>
      <div className="mt-2 space-y-2">
        <ConsentCheckbox name="confirmedOwnership">
          I am authorised to list and share this property.
        </ConsentCheckbox>
        <ConsentCheckbox name="whatsappTransactionalConsent">
          Send WhatsApp OTPs, listing updates, and enquiry alerts.
        </ConsentCheckbox>
        <ConsentCheckbox name="termsAccepted">
          I accept the{" "}
          <Link href="/terms" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
            Privacy
          </Link>
          , and{" "}
          <Link href="/dpdp" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
            DPDP notice
          </Link>
          .
        </ConsentCheckbox>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <label className="flex gap-2.5 text-sm leading-5 text-zinc-700">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-zinc-950"
      />
      <span>{children}</span>
    </label>
  );
}

function ModalFooter({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3 shadow-[0_-12px_32px_rgba(24,24,27,0.08)] sm:px-6 sm:py-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 sm:justify-start">
          <BadgeCheck className="size-4 text-emerald-700" />
          One verification for all listings
        </div>
        <Button type="submit" className="h-11 w-full bg-zinc-950 text-white hover:bg-zinc-800 sm:w-auto" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {label}
        </Button>
      </div>
    </div>
  );
}

function Status({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (message) return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>;
  return null;
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  type = "text",
  inputMode,
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
  type?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        required
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 outline-none transition focus:border-zinc-950 sm:py-3"
      />
    </label>
  );
}
