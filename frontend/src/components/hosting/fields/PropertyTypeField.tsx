import { Building2, Hotel, House, Warehouse, type LucideIcon } from "lucide-react";
import { FieldError } from "./FieldError";

const OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "house", label: "House", Icon: House },
  { value: "flat", label: "Flat", Icon: Building2 },
  { value: "guest_house", label: "Guest house", Icon: Warehouse },
  { value: "hotel", label: "Hotel", Icon: Hotel },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function PropertyTypeField({ value, onChange, error }: Props) {
  return (
    <div role="group" aria-label="Property type">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value: v, label, Icon }) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`flex h-[99px] flex-col items-start justify-between rounded-12 p-4 text-left ${
              value === v ? "border-2 border-hof bg-faint" : "border border-deco hover:border-hof"
            }`}
          >
            <Icon size={28} strokeWidth={1.5} />
            <span className="text-base font-medium">{label}</span>
          </button>
        ))}
      </div>
      <FieldError error={error} />
    </div>
  );
}
