import { FieldError, inputCls } from "./FieldError";

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function TitleField({ value, onChange, error }: Props) {
  return (
    <div>
      <label htmlFor="listing-title" className="sr-only">
        Listing title
      </label>
      <textarea
        id="listing-title"
        rows={3}
        maxLength={50}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        placeholder="Cosy flat near the beach"
        className={`${inputCls} resize-none text-[22px] leading-7`}
      />
      <p className="mt-1 text-sm text-secondary">{value.length}/50</p>
      <FieldError error={error} />
    </div>
  );
}
