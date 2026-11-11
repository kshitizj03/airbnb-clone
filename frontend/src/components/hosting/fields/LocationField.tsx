import dynamic from "next/dynamic";
import { cityView, type Location } from "@/lib/listing-draft";
import { FieldError, inputCls } from "./FieldError";

// Leaflet touches `window`, so the picker is only ever loaded in the browser.
const LocationPicker = dynamic(() => import("../LocationPicker"), {
  ssr: false,
  loading: () => <div className="size-full bg-bebe" />,
});

interface Props {
  value: Location;
  onChange: (v: Location) => void;
  error?: string;
}

const TEXT_FIELDS = [
  ["address", "Street address", "street-address"],
  ["city", "City", "address-level2"],
  ["state", "State", "address-level1"],
  ["country", "Country", "country-name"],
] as const;

export function LocationField({ value, onChange, error }: Props) {
  const pin = value.latitude !== null && value.longitude !== null ? ([value.latitude, value.longitude] as [number, number]) : null;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map(([key, label, auto]) => (
          <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
            <label htmlFor={`loc-${key}`} className="mb-1 block text-sm font-medium">
              {label}
            </label>
            <input id={`loc-${key}`} autoComplete={auto} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className={inputCls} />
          </div>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm font-medium">{pin ? "Drag the pin or click the map to move it" : "Click the map to place the pin"}</p>
      <div className="h-[320px] overflow-hidden rounded-16 border border-deco" aria-label="Map: click to set your listing's location">
        <LocationPicker pin={pin} view={cityView(value.city)} onPin={(latitude, longitude) => onChange({ ...value, latitude, longitude })} />
      </div>
      <FieldError error={error} />
    </div>
  );
}
