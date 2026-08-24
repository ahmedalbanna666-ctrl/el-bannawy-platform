import { RouteSkeleton } from "@/components/ui/route-skeleton";

export default function Loading(): React.ReactNode {
  return <RouteSkeleton title cardCount={6} />;
}
