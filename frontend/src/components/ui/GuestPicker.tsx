"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import type { Guests } from "@/lib/search-params";
import { Stepper } from "./Stepper";

interface GuestPickerProps {
  value: Guests;
  onChange: (value: Guests) => void;
  /** Cap on adults + children (infants and pets do not count). */
  maxGuests?: number;
  petsAllowed?: boolean;
}

export function GuestPicker({ value, onChange, maxGuests, petsAllowed = true }: GuestPickerProps) {
  const { adults, children, infants, pets } = value;
  const atMax = maxGuests !== undefined && adults + children >= maxGuests;
  const hasDependents = children + infants > 0;

  // A child or infant needs an adult: adding one with 0 adults sets adults to 1.
  const addDependent = (key: "children" | "infants", n: number) =>
    onChange({ ...value, [key]: n, adults: n > value[key] && adults === 0 ? 1 : adults });

  return (
    <div>
      <Row title="Adults" subtitle="Ages 13 or above">
        <Stepper
          label="adults"
          value={adults}
          min={hasDependents ? 1 : 0}
          max={atMax ? adults : undefined}
          onChange={(n) => onChange({ ...value, adults: n })}
        />
      </Row>
      <Row title="Children" subtitle="Ages 2–12">
        <Stepper label="children" value={children} max={atMax ? children : undefined} onChange={(n) => addDependent("children", n)} />
      </Row>
      <Row title="Infants" subtitle="Under 2">
        <Stepper label="infants" value={infants} max={5} onChange={(n) => addDependent("infants", n)} />
      </Row>
      <Row
        title="Pets"
        last
        subtitle={
          <button type="button" className="underline" onClick={() => toast("Coming soon")}>
            Bringing a service animal?
          </button>
        }
      >
        <Stepper label="pets" value={pets} max={petsAllowed ? 5 : 0} onChange={(n) => onChange({ ...value, pets: n })} />
      </Row>
      {maxGuests !== undefined && (
        <p className="mt-4 text-sm text-secondary">
          This place has a maximum of {maxGuests} guests, not including infants.
          {!petsAllowed && " Pets aren't allowed."}
        </p>
      )}
    </div>
  );
}

function Row({ title, subtitle, last, children }: { title: string; subtitle: ReactNode; last?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-center justify-between py-4 ${last ? "" : "border-b border-bebe"}`}>
      <div>
        <div className="text-base font-medium">{title}</div>
        <div className="text-sm text-secondary">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}
