"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Images, Maximize2, Minimize2 } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = media[activeIndex];
  const nextIndex = useMemo(
    () => (media.length > 1 ? (activeIndex + 1) % media.length : activeIndex),
    [activeIndex, media.length],
  );
  const previousIndex = useMemo(
    () => (media.length > 1 ? (activeIndex - 1 + media.length) % media.length : activeIndex),
    [activeIndex, media.length],
  );

  function selectImage(index: number) {
    if (index === activeIndex) return;
    setLoadedUrl(null);
    setActiveIndex(index);
  }

  function move(direction: -1 | 1) {
    selectImage((activeIndex + direction + media.length) % media.length);
  }

  useEffect(() => {
    if (!active) return;
    thumbnailRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [active, activeIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || media.length < 2) return;
    [previousIndex, nextIndex].forEach((index) => {
      const url = media[index]?.url;
      if (!url || url === active?.url) return;
      const image = new window.Image();
      image.decoding = "async";
      image.src = url;
    });
  }, [active?.url, media, nextIndex, previousIndex]);

  if (!active) {
    return <div className="trl-carousel-placeholder-height bg-zinc-100" />;
  }

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-zinc-950 text-white",
        isExpanded ? "min-h-[calc(100svh-64px)]" : "",
      )}
    >
      <div className="relative mx-auto max-w-[1800px]">
        <div
          className={cn(
            "relative min-h-[300px]",
            isExpanded ? "h-[calc(100svh-168px)] min-h-[430px] sm:h-[calc(100svh-190px)]" : "trl-carousel-height sm:min-h-[500px]",
          )}
        >
          {loadedUrl !== active.url && active.thumbnailUrl ? (
            <Image
              key={`${active.id}-thumb`}
              src={active.thumbnailUrl}
              alt=""
              fill
              loading="eager"
              sizes="100vw"
              className={cn("scale-[1.02] object-cover blur-xl transition-opacity duration-200", isExpanded ? "object-contain" : "object-cover")}
            />
          ) : null}
          <Image
            key={active.id}
            src={active.url}
            alt={active.caption || title}
            fill
            loading="eager"
            fetchPriority={activeIndex === 0 ? "high" : "auto"}
            sizes="100vw"
            onLoad={() => setLoadedUrl(active.url)}
            className={cn(
              "transition duration-300 ease-out",
              loadedUrl === active.url ? "opacity-100" : "opacity-0",
              isExpanded ? "object-contain" : "object-cover",
            )}
          />
          {!isExpanded ? (
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 via-transparent to-zinc-950/10 sm:from-zinc-950/45" />
          ) : null}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-8 sm:top-8">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-950 shadow-sm backdrop-blur sm:text-xs">
              {freshnessStatus}
            </span>
            <span className="rounded-full bg-zinc-950/70 px-3 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur sm:text-xs">
              {activeIndex + 1} / {media.length}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={isExpanded ? "Exit full image view" : "View full image"}
            onClick={() => setIsExpanded((current) => !current)}
            className="absolute right-3 top-3 size-10 rounded-full bg-white/95 text-zinc-950 shadow-sm hover:bg-white sm:right-8 sm:top-8"
          >
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          {media.length > 1 ? (
            <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between sm:inset-x-8">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={() => move(-1)}
                className="size-9 rounded-full bg-white/95 text-zinc-950 shadow-sm hover:bg-white sm:size-11"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={() => move(1)}
                className="size-9 rounded-full bg-white/95 text-zinc-950 shadow-sm hover:bg-white sm:size-11"
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : null}
          <div className="absolute inset-x-3 bottom-3 flex justify-center sm:hidden">
            {active.caption ? (
              <p className="max-w-[80vw] truncate rounded-full bg-zinc-950/45 px-3 py-1 text-xs font-medium text-zinc-100 backdrop-blur">
                {active.caption}
              </p>
            ) : null}
          </div>
        </div>
        <div className={cn("border-b border-zinc-200 bg-[#fbfaf7] px-3 py-2 sm:px-6 sm:py-4", isExpanded ? "pb-4" : "")}>
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  ref={(node) => {
                    thumbnailRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={() => selectImage(index)}
                  className={cn(
                    "relative shrink-0 snap-center overflow-hidden rounded-lg border bg-white shadow-sm transition",
                    isExpanded ? "h-16 w-24 sm:h-24 sm:w-36" : "h-12 w-20 sm:h-20 sm:w-32",
                    activeIndex === index
                      ? "border-zinc-950 opacity-100 ring-2 ring-zinc-950/10"
                      : "border-zinc-200 opacity-70 hover:opacity-100",
                  )}
                  aria-label={`Show image ${index + 1}`}
                >
                  <Image
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    fill
                    sizes="144px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded-full bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden h-14 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 shadow-sm sm:flex sm:h-20">
              <Images className="mr-2 size-4" />
              {media.length} photos
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
