"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 950px)"; // Tailwind's lg breakpoint (globals.css)

/** True from the lg breakpoint up. Server render and hydration say false. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
