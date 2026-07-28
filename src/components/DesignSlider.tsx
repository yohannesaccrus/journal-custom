"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { PATCH_POSITION, type CharmEntry } from "@/lib/catalog";
import { PatchIcon } from "@/components/PatchIcon";
import type { JournalSelection, PlacedCharm } from "@/lib/types";

const AUTOPLAY_DELAY_MS = 10000;

export interface DesignSliderView {
  label: string;
  image: string | undefined;
  charms: PlacedCharm[];
  charmSize: string;
}

interface DesignSliderProps {
  views: DesignSliderView[];
  charmEntries: CharmEntry[];
  patch: JournalSelection["patch"];
}

export function DesignSlider({ views, charmEntries, patch }: DesignSliderProps) {
  const autoplay = useRef(Autoplay({ delay: AUTOPLAY_DELAY_MS, stopOnInteraction: false, stopOnMouseEnter: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  function toggleAutoplay() {
    if (isPlaying) {
      autoplay.current.stop();
      setIsPlaying(false);
    } else {
      autoplay.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#a89a80]">{views[selectedIndex]?.label}</span>
        <button
          type="button"
          onClick={toggleAutoplay}
          aria-label={isPlaying ? "Pause auto-slide" : "Resume auto-slide"}
          className="rounded-full p-1 text-[#a89a80] transition-colors hover:bg-[#f7f4ee] hover:text-[#1c1c1a]"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M7 5v14l12-7L7 5Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-[#eae7de] bg-[#f7f4ee] shadow-md" ref={emblaRef}>
          <div className="flex">
            {views.map((v, i) => (
              <div key={v.label} className="relative aspect-[560/660] w-full shrink-0 grow-0 basis-full">
                {v.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt={`${v.label} of journal`} className="h-full w-full object-contain p-4" />
                )}
                {i === 0 && patch !== "none" && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${PATCH_POSITION.x}%`,
                      top: `${PATCH_POSITION.y}%`,
                      width: `${PATCH_POSITION.sizePercent}%`,
                      aspectRatio: "1",
                    }}
                  >
                    <PatchIcon shape={patch} className="h-full w-full drop-shadow-md" />
                  </div>
                )}
                {v.charms.map((c) => (
                  <img
                    key={c.instanceId}
                    src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                    alt={c.design}
                    className={`absolute ${v.charmSize} -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md`}
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous view"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1c1c1a] shadow-md transition-colors hover:bg-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next view"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1c1c1a] shadow-md transition-colors hover:bg-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {views.map((v, i) => (
          <button
            key={v.label}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to ${v.label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === selectedIndex ? "w-5 bg-[#b1632f]" : "w-1.5 bg-[#e0dccf] hover:bg-[#cfc9b8]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
