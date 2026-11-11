import { Suspense } from "react";
import { TripDetail } from "@/components/trips/TripDetail";

// TripDetail reads ?new=1 (useSearchParams), which needs a Suspense boundary at build time.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <TripDetail id={id} />
    </Suspense>
  );
}
