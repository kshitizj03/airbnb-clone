import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string; // for screen readers: "Decrease adults"
  min?: number;
  max?: number;
  /** Lets filters show "Any" instead of 0. */
  display?: (value: number) => ReactNode;
}

const btn =
  "flex size-8 items-center justify-center rounded-full border border-secondary text-secondary transition-colors hover:border-hof hover:text-hof disabled:cursor-not-allowed disabled:border-deco disabled:text-disabled disabled:hover:border-deco disabled:hover:text-disabled";

/** Round - / + buttons with the count between (guest pickers, filters, host wizard). */
export function Stepper({ value, onChange, label, min = 0, max = Infinity, display }: StepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}>
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="w-6 text-center text-base" aria-live="polite">
        {display ? display(value) : value}
      </span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}>
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
