"use client";

import { useTransition } from "react";
import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { signOutWorkspaceRole } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { initializeFirebaseClient } from "@/lib/firebase/client";

export function SignOutForm({ compact = false }: { compact?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const { auth } = initializeFirebaseClient();
        await signOut(auth);
      } catch (error) {
        if (!(error instanceof FirebaseError)) throw error;
      }
      await signOutWorkspaceRole();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <Button
        type="submit"
        variant="secondary"
        size={compact ? "sm" : "default"}
        disabled={isPending}
        className="w-full justify-start"
      >
        <LogOut className="size-4" />
        <span>{isPending ? "Signing out" : compact ? "Logout" : "Sign out"}</span>
      </Button>
    </form>
  );
}
