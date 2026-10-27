"use client";

import { useEffect, useRef, useState } from "react";
import { AzulejoTile, type AzulejoVariant } from "@/components/brand/Azulejo";
import { photoSrcSet, photoUrl, type StockPhoto } from "@/lib/photos";

type Props = {
  /** A stock photo or a direct URL (e.g. a chef's uploaded photo). */
  photo: StockPhoto | string | null | undefined;
  alt?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** Tile shown when there is no photo or it fails to load. */
  fallback?: AzulejoVariant;
};

/** Cropped photo that degrades to an azulejo tile instead of a broken image. */
export function Photo({ photo, alt, sizes = "(min-width: 768px) 33vw, 100vw", className = "", priority, fallback = "glaze" }: Props) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // An image can fail before hydration, when React's onError is not attached yet.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (!photo || failed) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <AzulejoTile variant={fallback} />
      </div>
    );
  }
  const isStock = typeof photo !== "string";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={isStock ? photoUrl(photo) : photo}
      srcSet={isStock ? photoSrcSet(photo) : undefined}
      sizes={isStock ? sizes : undefined}
      alt={alt ?? (isStock ? photo.alt : "")}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(true)}
      className={`block object-cover ${className}`}
    />
  );
}
