"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types/domain";

export function PropertyCarousel({
  media,
  title,
  freshnessStatus,
}: {
  media: MediaAsset[];
  title: string;
  freshnessStatus: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + media.length) % media.length);
  }

  if (!active) {
    return <div className="trl-carousel-placeholder-height bg-zinc-100" />;
  }

  return (
    <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
      <div className="trl-carousel-height relative min-h-[300px] sm:min-h-[500px]">
        <Image
          src={active.url}
          alt={active.caption || title}
          fill
          priority
          sizes="100vw"
          className="object-cover transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/10 to-zinc-950/20" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-8 sm:top-8">
          <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-950 shadow-sm backdrop-blur sm:text-xs">
            {freshnessStatus}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col gap-3 px-3 pb-3 sm:gap-5 sm:px-6 sm:pb-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              {active.caption ? (
                <p className="max-w-[70vw] truncate text-sm font-medium text-zinc-100">
                  {active.caption}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-300">
                {activeIndex + 1} / {media.length}
              </p>
            </div>
            <div className="flex gap-2">
              {media.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Previous image"
                    onClick={() => move(-1)}
                    className="size-10 rounded-full bg-white/95 text-zinc-950 shadow-sm hover:bg-white"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Next image"
                    onClick={() => move(1)}
                    className="size-10 rounded-full bg-white/95 text-zinc-950 shadow-sm hover:bg-white"
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-14 w-20 shrink-0 snap-start overflow-hidden rounded-md border transition sm:h-24 sm:w-36",
                  activeIndex === index
                    ? "border-white opacity-100"
                    : "border-white/20 opacity-70 hover:opacity-100",
                )}
                aria-label={`Show ${item.caption}`}
              >
                <Image
                  src={item.thumbnailUrl}
                  alt=""
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              </button>
            ))}
            <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 text-xs text-white backdrop-blur sm:h-24 sm:w-36">
              <Images className="mr-2 size-4" />
              Gallery
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
