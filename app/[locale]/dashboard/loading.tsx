import { PageSkeleton } from "@/components/ui/Skeleton";

/** Shown at once when moving between dashboard sections; the navigation stays in place. */
export default function Loading() {
  return <PageSkeleton label="A carregar" />;
}
