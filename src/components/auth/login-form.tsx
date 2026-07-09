"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeFirebaseClient } from "@/lib/firebase/client";
import { createSession } from "@/app/login/actions";

function messageForSignInError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      return "Email or password is incorrect.";
    }
    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (error.code === "auth/network-request-failed") {
      return "You appear to be offline. Check your connection and try again.";
    }
  }

  if (error instanceof Error && error.message.includes("Firebase environment variable")) {
    return "Sign in is temporarily unavailable. Please try again shortly.";
  }

  return "Unable to sign in. Please try again.";
}

function messageForPasswordResetError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/invalid-email") return "Enter a valid email address first.";
    if (error.code === "auth/network-request-failed") return "You appear to be offline. Check your connection and try again.";
  }

  if (error instanceof Error && error.message.includes("Firebase environment variable")) {
    return "Password reset is temporarily unavailable.";
  }

  return null;
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResetMessage(null);

    startTransition(async () => {
      try {
        const { auth } = initializeFirebaseClient();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        const result = await createSession(idToken, nextPath);
        if (result && !result.ok) setError(result.message);
        if (result?.ok) router.replace(result.redirectTo);
      } catch (error) {
        setError(messageForSignInError(error));
      }
    });
  }

  async function onForgotPassword() {
    const trimmedEmail = email.trim().toLowerCase();
    setError(null);
    setResetMessage(null);

    if (!trimmedEmail) {
      setError("Enter your email address first, then request the reset link.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const { auth } = initializeFirebaseClient();
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetMessage("If this email has an account, a password reset link has been sent.");
    } catch (error) {
      const message = messageForPasswordResetError(error);
      if (message) {
        setError(message);
      } else {
        setResetMessage("If this email has an account, a password reset link has been sent.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 border-zinc-200 bg-white text-zinc-950"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isPending || isResettingPassword}
            className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResettingPassword ? "Sending..." : "Forgot password?"}
          </button>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 border-zinc-200 bg-white text-zinc-950"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {resetMessage ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {resetMessage}
        </p>
      ) : null}
      <Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700" type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
        Sign in
      </Button>
      <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-zinc-600">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        Your account opens the right workspace automatically.
      </div>
    </form>
  );
}
