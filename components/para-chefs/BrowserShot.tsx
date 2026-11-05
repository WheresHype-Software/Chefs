import Image, { type StaticImageData } from "next/image";
import { SITE_DOMAIN } from "@/lib/constants";

/** A real screenshot of a public page, in a browser window. */
export function BrowserShot({ src, alt, url }: { src: StaticImageData; alt: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line-2 bg-white shadow-[0_24px_60px_rgba(17,17,16,.14)]">
      <div className="flex items-center gap-2.5 border-b border-line bg-paper px-3.5 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-1 text-[12px] text-muted ring-1 ring-line">
          {SITE_DOMAIN}
          {url}
        </span>
      </div>
      <Image src={src} alt={alt} sizes="(min-width: 768px) 760px, 100vw" placeholder="blur" className="h-auto w-full" />
    </div>
  );
}
