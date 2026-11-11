"use client";

import { ChevronDown, Tag } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { GuestPicker } from "@/components/ui/GuestPicker";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBooking } from "@/hooks/useBooking";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatDateRange, formatINR } from "@/lib/format";
import type { BookedRange } from "@/lib/date-range";
import { guestSummary } from "@/lib/search-params";
import type { ListingDetail } from "@/lib/types";
import { CalendarPanel } from "./CalendarPanel";
import { PriceBreakdown } from "./PriceBreakdown";

type Open = "dates" | "guests" | "price" | null;
const plural = (n: number) => `${n} night${n === 1 ? "" : "s"}`;

export function BookingCard({ listing, bookedRanges }: { listing: ListingDetail; bookedRanges: BookedRange[] }) {
  const b = useBooking(listing);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<Open>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const toggle = (what: Exclude<Open, null>) => setOpen((o) => (o === what ? null : what));

  // Desktop popovers close on an outside click or Esc (the mobile modals handle their own).
  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isMobile]);

  // Picking a check-out finishes the choice, so the popover closes.
  const onDates = (r: { from?: Date; to?: Date }) => {
    b.setDates(r);
    if (r.to) setOpen(null);
  };

  const priceButton = b.quote && (
    <button type="button" aria-expanded={open === "price"} onClick={() => toggle("price")} className={`font-semibold underline ${isMobile ? "text-lg" : "text-[22px] leading-7"}`}>
      {formatINR(b.quote.total)}
    </button>
  );

  /* ---------- Mobile: fixed bottom bar, dates and price details in sheets ---------- */
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-bebe bg-white px-4 py-3">
          <div className="min-w-0">
            {b.quote ? (
              <p className="truncate">
                {priceButton} <span className="text-sm text-secondary">for {plural(b.quote.nights)}</span>
              </p>
            ) : b.loading ? (
              <Skeleton className="h-5 w-24 rounded-8" />
            ) : (
              <p>
                <span className="text-base font-semibold">{formatINR(listing.price_per_night)}</span> <span className="text-sm">night</span>
              </p>
            )}
            <button type="button" onClick={() => setOpen("dates")} className="block text-sm underline">
              {b.range.from && b.range.to ? formatDateRange(b.range.from, b.range.to) : "Add dates"}
            </button>
          </div>
          {b.isOwner ? (
            <p className="text-sm font-medium">This is your listing</p>
          ) : (
            <ReserveButton b={b} onCheck={() => setOpen("dates")} className="px-8" />
          )}
        </div>
        <Modal
          open={open === "dates"}
          onClose={() => setOpen(null)}
          title="Select dates"
          footer={
            <Button className="w-full" onClick={() => setOpen(null)}>
              Save
            </Button>
          }
        >
          <div className="p-6">
            <CalendarPanel range={b.range} booked={bookedRanges} months={1} onChange={b.setDates} />
            <div className="mt-4 border-t border-bebe pt-4">
              <h3 className="text-base font-semibold">Guests</h3>
              <GuestPicker value={b.guests} onChange={b.setGuests} maxGuests={listing.max_guests} petsAllowed={listing.pets_allowed} />
            </div>
          </div>
        </Modal>
        <Modal open={open === "price" && !!b.quote} onClose={() => setOpen(null)} title="Price details">
          <div className="p-6">{b.quote && <PriceBreakdown quote={b.quote} />}</div>
        </Modal>
      </>
    );
  }

  /* ---------- Desktop: sticky card ---------- */
  const box = "px-3 pt-2.5 pb-2 text-left hover:bg-faint";
  const label = "block text-[10px] leading-3 font-bold tracking-wide uppercase";
  return (
    <div ref={cardRef}>
      <div className="mb-3 flex items-center gap-3 rounded-16 border border-bebe bg-white px-4 py-3 text-sm shadow-elevation2">
        <Tag size={20} />
        <span>
          <span className="font-semibold">Prices include all fees.</span> No hidden charges.
        </span>
      </div>
      <div className="rounded-16 border border-deco bg-white p-6 shadow-secondary">
        <div className="relative min-h-7">
          {b.quote ? (
            <p>
              {priceButton} <span className="text-base">for {plural(b.quote.nights)}</span>
            </p>
          ) : b.loading ? (
            <Skeleton className="h-7 w-44 rounded-8" />
          ) : b.hasDates ? (
            <p>
              <span className="text-[22px] font-semibold">{formatINR(listing.price_per_night)}</span> night
            </p>
          ) : (
            <p className="text-[22px] leading-7 font-semibold">Add dates for prices</p>
          )}
          {open === "price" && b.quote && (
            <Popover title="Price details" onClose={() => setOpen(null)} className="top-full left-0 mt-3 w-full">
              <PriceBreakdown quote={b.quote} />
            </Popover>
          )}
        </div>

        <div className="relative mt-4">
          <div className="overflow-hidden rounded-8 border border-[#b0b0b0]">
            <div className="grid grid-cols-2">
              <button type="button" aria-expanded={open === "dates"} onClick={() => toggle("dates")} className={`${box} border-r border-[#b0b0b0]`}>
                <span className={label}>Check-in</span>
                <span className={`text-sm ${b.range.from ? "" : "text-secondary"}`}>{b.range.from ? format(b.range.from, "d/M/yyyy") : "Add date"}</span>
              </button>
              <button type="button" aria-expanded={open === "dates"} onClick={() => toggle("dates")} className={box}>
                <span className={label}>Checkout</span>
                <span className={`text-sm ${b.range.to ? "" : "text-secondary"}`}>{b.range.to ? format(b.range.to, "d/M/yyyy") : "Add date"}</span>
              </button>
            </div>
            <button
              type="button"
              aria-expanded={open === "guests"}
              onClick={() => toggle("guests")}
              className={`${box} flex w-full items-center justify-between border-t border-[#b0b0b0]`}
            >
              <span>
                <span className={label}>Guests</span>
                <span className="text-sm">{guestSummary(b.guests)}</span>
              </span>
              <ChevronDown size={16} className={open === "guests" ? "rotate-180" : ""} />
            </button>
          </div>

          {open === "dates" && (
            <Popover className="top-full right-0 mt-2 w-[696px] max-w-[calc(100vw-48px)]">
              <CalendarPanel range={b.range} booked={bookedRanges} months={2} onChange={onDates} onClose={() => setOpen(null)} />
            </Popover>
          )}
          {open === "guests" && (
            <Popover className="top-full right-0 left-0 mt-2">
              <GuestPicker value={b.guests} onChange={b.setGuests} maxGuests={listing.max_guests} petsAllowed={listing.pets_allowed} />
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => setOpen(null)} className="rounded-8 px-3 py-2 text-base font-medium underline hover:bg-faint">
                  Close
                </button>
              </div>
            </Popover>
          )}
        </div>

        {b.isOwner ? (
          <p className="mt-4 rounded-8 bg-faint p-3 text-center font-medium">This is your listing</p>
        ) : (
          <>
            {b.errorMessage && (
              <p role="alert" className="mt-3 text-sm text-arches">
                {b.errorMessage}
              </p>
            )}
            <ReserveButton b={b} onCheck={() => setOpen("dates")} className="mt-4 w-full" />
            {b.quote && (
              <>
                <p className="mt-3 text-center text-sm">You won&apos;t be charged yet</p>
                <div className="mt-6">
                  <PriceBreakdown quote={b.quote} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Reserve (gradient pill). With no dates it reads "Check availability" and opens the date picker instead. */
export function ReserveButton({ b, onCheck, className = "" }: { b: ReturnType<typeof useBooking>; onCheck?: () => void; className?: string }) {
  if (!b.hasDates) {
    return (
      <Button variant="primary" onClick={onCheck} className={className}>
        Check availability
      </Button>
    );
  }
  return (
    <Button variant="primary" disabled={!b.quote || !!b.errorMessage} onClick={b.reserve} className={className}>
      Reserve
    </Button>
  );
}

function Popover({ title, onClose, className, children }: { title?: string; onClose?: () => void; className: string; children: ReactNode }) {
  return (
    <div className={`absolute z-20 rounded-16 bg-white p-6 shadow-high ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="flex size-8 items-center justify-center rounded-full hover:bg-faint">
            ✕
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
