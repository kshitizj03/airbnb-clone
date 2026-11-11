import { formatINR } from "@/lib/format";
import type { PriceQuote } from "@/lib/types";

/** Every line comes from the backend quote; nothing is calculated here. Reused by the booking card popover and checkout. */
export function PriceBreakdown({ quote }: { quote: PriceQuote }) {
  const rows: [string, number][] = [
    [`${quote.nights} night${quote.nights === 1 ? "" : "s"} x ${formatINR(quote.nightly_price)}`, quote.subtotal],
    ["Cleaning fee", quote.cleaning_fee],
    ["Airbnb service fee", quote.service_fee],
    ["Taxes", quote.taxes],
  ];
  return (
    <dl className="text-base">
      {rows.map(([label, amount]) => (
        <div key={label} className="flex justify-between py-1.5">
          <dt>{label}</dt>
          <dd>{formatINR(amount)}</dd>
        </div>
      ))}
      <div className="mt-3 flex justify-between border-t border-bebe pt-4 font-semibold">
        <dt>Total</dt>
        <dd>{formatINR(quote.total)}</dd>
      </div>
    </dl>
  );
}
