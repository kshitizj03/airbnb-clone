import { MAX_PRICE, type Pricing } from "@/lib/listing-draft";
import { FieldError, inputCls } from "./FieldError";

interface Props {
  value: Pricing;
  onChange: (v: Pricing) => void;
  error?: string;
}

// Digits only, so "1,500" or "abc" can never become a price.
const digits = (s: string) => Number(s.replace(/\D/g, "").slice(0, 7));

function Toggle({ label, hint, on, onClick }: { label: string; hint: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <div>
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm text-secondary">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        className={`relative h-8 w-12 shrink-0 rounded-pill transition-colors ${on ? "bg-hof" : "bg-disabled"}`}
      >
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

export function PriceField({ value, onChange, error }: Props) {
  const set = (patch: Partial<Pricing>) => onChange({ ...value, ...patch });
  return (
    <div>
      <div className="rounded-24 border border-deco p-6 text-center">
        <label htmlFor="listing-price" className="text-sm text-secondary">
          Price per night
        </label>
        <div className="mt-2 flex items-center justify-center text-[56px] leading-[64px] font-bold">
          <span aria-hidden>₹</span>
          <input
            id="listing-price"
            inputMode="numeric"
            value={value.price_per_night || ""}
            placeholder="0"
            aria-invalid={!!error}
            onChange={(e) => set({ price_per_night: digits(e.target.value) })}
            className="w-[7ch] bg-transparent text-left outline-none placeholder:text-disabled"
          />
        </div>
        <p className="text-sm text-secondary">Up to ₹{MAX_PRICE.toLocaleString("en-IN")}</p>
      </div>
      <FieldError error={error} />

      <div className="mt-6">
        <label htmlFor="listing-cleaning" className="mb-1 block text-sm font-medium">
          Cleaning fee (one-off, ₹)
        </label>
        <input
          id="listing-cleaning"
          inputMode="numeric"
          value={value.cleaning_fee || ""}
          placeholder="0"
          onChange={(e) => set({ cleaning_fee: digits(e.target.value) })}
          className={inputCls}
        />
      </div>

      <div className="mt-4 divide-y divide-bebe">
        <Toggle label="Instant Book" hint="Guests can book without waiting for your approval." on={value.instant_book} onClick={() => set({ instant_book: !value.instant_book })} />
        <Toggle label="Allows pets" hint="Guests may bring their pets." on={value.pets_allowed} onClick={() => set({ pets_allowed: !value.pets_allowed })} />
      </div>
    </div>
  );
}
