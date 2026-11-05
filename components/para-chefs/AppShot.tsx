import Image, { type StaticImageData } from "next/image";

/** A real screenshot of the app, in a phone. Captured from the demonstration mode. */
export function AppShot({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <div className="mx-auto w-[280px] max-w-full rounded-[34px] border-[7px] border-ink bg-ink shadow-[0_24px_60px_rgba(17,17,16,.16)] sm:w-[300px]">
      <Image
        src={src}
        alt={alt}
        // Displayed ~300 CSS px wide: ask for twice that so it stays sharp on phone screens.
        sizes="600px"
        placeholder="blur"
        className="h-auto w-full rounded-[27px] bg-paper"
      />
    </div>
  );
}
