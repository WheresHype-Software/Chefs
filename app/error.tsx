"use client";

import { ErrorState } from "@/components/ErrorState";
import { SiteHeader } from "@/components/SiteChrome";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[1080px] px-5 md:px-8">
        <ErrorState error={error} retry={retry} />
      </main>
    </div>
  );
}
