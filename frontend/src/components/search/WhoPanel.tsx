"use client";

import { GuestPicker } from "@/components/ui/GuestPicker";
import type { Guests } from "@/lib/search-params";

export function WhoPanel({ value, onChange }: { value: Guests; onChange: (value: Guests) => void }) {
  return <GuestPicker value={value} onChange={onChange} />;
}
