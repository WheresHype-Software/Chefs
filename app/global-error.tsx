"use client";

import "./globals.css";
import { ErrorState } from "@/components/ErrorState";

/** Last resort when the root layout itself fails; it replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-PT">
      <body className="bg-paper">
        <title>Algo correu mal · Ao Lume</title>
        <main className="mx-auto max-w-[1080px] px-5 md:px-8">
          <ErrorState error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
