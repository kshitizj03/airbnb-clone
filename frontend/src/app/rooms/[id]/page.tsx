import { Suspense } from "react";
import { ListingPage } from "@/components/listing/ListingPage";

// The listing page reads dates, guests and modals from the URL (useSearchParams), which needs a Suspense boundary at build time.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ListingPage id={id} />
    </Suspense>
  );
}
