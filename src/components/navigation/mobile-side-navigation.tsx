"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileSideNavigation({
  ariaLabel,
  brand,
  navigation,
  footer,
  contentClassName,
}: {
  ariaLabel: string;
  brand: React.ReactNode;
  navigation: React.ReactNode;
  footer: React.ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  function closeAfterNavigation(event: React.MouseEvent<HTMLElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label="Open navigation" />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className={cn("w-[min(88vw,20rem)] gap-0 p-0 sm:max-w-xs", contentClassName)}
      >
        <SheetHeader className="border-b border-current/10 px-5 py-5 pr-14 text-left">
          {brand}
          <SheetTitle className="sr-only">{ariaLabel}</SheetTitle>
          <SheetDescription className="sr-only">Choose a page to navigate to.</SheetDescription>
        </SheetHeader>
        <nav
          aria-label={ariaLabel}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
          onClick={closeAfterNavigation}
        >
          {navigation}
        </nav>
        <div className="border-t border-current/10 p-4">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
