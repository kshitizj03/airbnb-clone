import { DoorOpen, House, Users, type LucideIcon } from "lucide-react";
import { FieldError } from "./FieldError";

const OPTIONS: { value: string; label: string; hint: string; Icon: LucideIcon }[] = [
  { value: "entire_home", label: "An entire place", hint: "Guests have the whole place to themselves.", Icon: House },
  { value: "private_room", label: "A room", hint: "Guests have their own room in a home, plus access to shared spaces.", Icon: DoorOpen },
  { value: "shared_room", label: "A shared room", hint: "Guests sleep in a room or common area that may be shared with you or others.", Icon: Users },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function PlaceTypeField({ value, onChange, error }: Props) {
  return (
    <div role="group" aria-label="Type of place" className="space-y-3">
      {OPTIONS.map(({ value: v, label, hint, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex w-full items-center justify-between gap-4 rounded-12 p-5 text-left ${
            value === v ? "border-2 border-hof bg-faint" : "border border-deco hover:border-hof"
          }`}
        >
          <span>
            <span className="block text-base font-medium">{label}</span>
            <span className="block text-sm text-secondary">{hint}</span>
          </span>
          <Icon size={32} strokeWidth={1.5} className="shrink-0" />
        </button>
      ))}
      <FieldError error={error} />
    </div>
  );
}
