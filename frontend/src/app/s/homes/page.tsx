import { Suspense } from "react";
import { SearchResults } from "@/components/search/SearchResults";

// useSearchParams needs a Suspense boundary at build time.
export default function Page() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
