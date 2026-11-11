import { FieldError, inputCls } from "./FieldError";

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function DescriptionField({ value, onChange, error }: Props) {
  return (
    <div>
      <label htmlFor="listing-description" className="sr-only">
        Listing description
      </label>
      <textarea
        id="listing-description"
        rows={7}
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        placeholder="You will love how bright and quiet this place is."
        className={`${inputCls} resize-none`}
      />
      <p className="mt-1 text-sm text-secondary">{value.length}/500</p>
      <FieldError error={error} />
    </div>
  );
}
