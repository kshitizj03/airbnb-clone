"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { locationFromSlug, parseSearchParams, type SearchParams } from "@/lib/search-params";

/** The search the current URL describes: dates and guests from the query, location from /s/<Location>/homes. */
export function useCurrentSearch(): SearchParams {
  const pathname = usePathname();
  const sp = useSearchParams();
  const slug = /^\/s\/([^/]+)\/homes/.exec(pathname)?.[1];
  return { ...parseSearchParams(sp), location: slug ? locationFromSlug(slug) : undefined };
}
