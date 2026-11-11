export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-arches">
      {error}
    </p>
  );
}

/** Text input in the app's bordered style, shared by the location, title, description and price fields. */
export const inputCls =
  "w-full rounded-8 border border-deco px-3 py-3 text-base outline-none placeholder:text-foggy focus:border-2 focus:border-hof focus:px-[11px] focus:py-[11px]";
