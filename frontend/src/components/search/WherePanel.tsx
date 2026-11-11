"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import type { Destination } from "@/lib/types";

interface WherePanelProps {
  query: string;
  onPick: (city: string) => void;
}

/** "Goa" + query "go" -> **Go**a: the matching part in bold. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-bold">{text.slice(i, i + query.length)}</b>
      {text.slice(i + query.length)}
    </>
  );
}

export function WherePanel({ query, onPick }: WherePanelProps) {
  const q = query.trim();
  const { data: destinations = [], isError } = useQuery({
    queryKey: ["destinations", q],
    queryFn: () => api<Destination[]>(`/api/destinations?q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      {!q && <h3 className="px-2 pb-2 text-label">Suggested destinations</h3>}
      <ul>
        {destinations.map((d) => (
          <li key={`${d.city}-${d.state}`}>
            <button
              type="button"
              onClick={() => onPick(d.city)}
              className="flex w-full items-center gap-4 rounded-12 p-2 text-left hover:bg-faint"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-quaternary">
                <MapPin size={22} strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base">
                  <Highlight text={d.city} query={q} />
                  {d.state && d.state !== d.city && `, ${d.state}`}
                </span>
                <span className="block text-sm text-secondary">
                  {d.listing_count} {d.listing_count === 1 ? "stay" : "stays"} · {d.country}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {destinations.length === 0 && (
        <p className="px-2 py-4 text-sm text-secondary">
          {isError ? "Could not load destinations." : "No matching destinations. You can still search for this place."}
        </p>
      )}
    </div>
  );
}
