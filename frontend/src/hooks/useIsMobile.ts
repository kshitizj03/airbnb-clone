"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 743px)"; // below Airbnb's 744px tablet break

/** True on phones. Server render and hydration say false. */
export function useIsMobile(): boolean {
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
