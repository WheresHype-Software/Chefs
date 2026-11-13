import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <PageSkeleton label="A carregar as suas reservas" boxes={2} />;
}
