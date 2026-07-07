"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
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
      return "Network error while contacting Firebase Auth.";
    }
  }

  if (error instanceof Error && error.message.includes("Firebase environment variable")) {
    return "Firebase login is not configured for this deployment.";
  }

  return "Unable to sign in. Please try again.";
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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
        <Label htmlFor="password">Password</Label>
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
      <Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700" type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
        Sign in
      </Button>
      <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-zinc-600">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        Admin and broker access is assigned from Firestore user records after Firebase Auth verifies your identity.
      </div>
    </form>
  );
}
