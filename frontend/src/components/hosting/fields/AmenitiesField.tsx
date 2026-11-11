import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { Amenity } from "@/lib/types";
import { FieldError } from "./FieldError";

const CATEGORIES = [
  ["basics", "Basics"],
  ["popular", "Popular"],
  ["features", "Features"],
  ["location", "Location"],
  ["safety", "Safety"],
] as const;

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}

export function AmenitiesField({ value, onChange, error }: Props) {
  const { data: all, isError, refetch } = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/api/amenities"), staleTime: Infinity });

  if (isError)
    return (
      <p className="text-secondary">
        Could not load amenities.{" "}
        <button type="button" className="underline" onClick={() => refetch()}>
          Try again
        </button>
      </p>
    );
  if (!all)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-12" />
        ))}
      </div>
    );

  const toggle = (slug: string) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);

  return (
    <div className="space-y-8">
      {CATEGORIES.map(([cat, label]) => {
        const items = all.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} aria-label={label}>
            <h3 className="mb-3 text-base font-semibold">{label}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((a) => {
                const on = value.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(a.slug)}
                    className={`flex min-h-14 items-center justify-between gap-2 rounded-12 px-4 py-3 text-left text-sm ${
                      on ? "border-2 border-hof bg-faint" : "border border-deco hover:border-hof"
                    }`}
                  >
                    {a.name}
                    {on && <Check size={16} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <FieldError error={error} />
    </div>
  );
}
