import { Suspense } from "react";
import { Checkout } from "@/components/checkout/Checkout";

// Checkout keeps dates and guests in the URL (useSearchParams), which needs a Suspense boundary at build time.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <Checkout id={id} />
    </Suspense>
  );
}
