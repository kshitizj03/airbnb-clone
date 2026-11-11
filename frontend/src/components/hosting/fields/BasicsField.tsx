import { Stepper } from "@/components/ui/Stepper";
import type { Basics } from "@/lib/listing-draft";
import { FieldError } from "./FieldError";

const ROWS: { key: keyof Basics; label: string; min: number; max: number }[] = [
  { key: "max_guests", label: "Guests", min: 1, max: 16 },
  { key: "bedrooms", label: "Bedrooms", min: 0, max: 50 },
  { key: "beds", label: "Beds", min: 1, max: 50 },
  { key: "bathrooms", label: "Bathrooms", min: 1, max: 50 },
];

interface Props {
  value: Basics;
  onChange: (v: Basics) => void;
  error?: string;
}

export function BasicsField({ value, onChange, error }: Props) {
  return (
    <div>
      <ul className="divide-y divide-bebe border-y border-bebe">
        {ROWS.map(({ key, label, min, max }) => (
          <li key={key} className="flex items-center justify-between py-5">
            <span className="text-row font-normal">{label}</span>
            <Stepper value={value[key]} label={label.toLowerCase()} min={min} max={max} onChange={(n) => onChange({ ...value, [key]: n })} />
          </li>
        ))}
      </ul>
      <FieldError error={error} />
    </div>
  );
}
