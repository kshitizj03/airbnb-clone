"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useRef, useState, type InputHTMLAttributes } from "react";
import { toast } from "sonner";
import { useAuthModal } from "@/components/layout/AuthModal";
import { CalendarPanel } from "@/components/listing/CalendarPanel";
import { PriceBreakdown } from "@/components/listing/PriceBreakdown";
import { Button } from "@/components/ui/Button";
import { GuestPicker } from "@/components/ui/GuestPicker";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBooking } from "@/hooks/useBooking";
import { useIsMobile } from "@/hooks/useIsMobile";
import { api, ApiError } from "@/lib/api";
import type { BookedRange } from "@/lib/date-range";
import { formatDateRange } from "@/lib/format";
import { guestSummary } from "@/lib/search-params";
import type { Booking, ListingDetail } from "@/lib/types";

export function Checkout({ id }: { id: string }) {
  const { data: listing, error, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api<ListingDetail>(`/api/listings/${id}`),
    retry: false,
  });
  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8 lg:px-10">
      <h1 className="flex items-center gap-2 text-[28px] leading-8 font-medium">
        <Link href={`/rooms/${id}`} aria-label="Back to the listing" className="-ml-2 flex size-8 items-center justify-center rounded-full hover:bg-faint">
          <ChevronLeft size={20} />
        </Link>
        Confirm and pay
      </h1>
      {error ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-section">Something went wrong</p>
          <p className="text-secondary">We could not load this place. Please try again.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : !listing ? (
        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-16" />
            <Skeleton className="h-24 w-full rounded-16" />
            <Skeleton className="h-24 w-full rounded-16" />
          </div>
          <Skeleton className="h-96 w-full rounded-16" />
        </div>
      ) : (
        <CheckoutBody listing={listing} />
      )}
    </div>
  );
}

/* ---- Mock card: shape checks only. Card data stays in this component and is never sent anywhere. ---- */

interface Card {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}
type CardErrors = Partial<Record<keyof Card, string>>;

function validateCard(c: Card): CardErrors {
  const errors: CardErrors = {};
  const digits = c.number.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(digits)) errors.number = "Enter a valid card number (13 to 19 digits).";
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(c.expiry);
  if (!m) errors.expiry = "Enter the expiry as MM/YY.";
  else {
    const now = new Date();
    if (2000 + Number(m[2]) < now.getFullYear() || (2000 + Number(m[2]) === now.getFullYear() && Number(m[1]) < now.getMonth() + 1)) {
      errors.expiry = "This card has expired.";
    }
  }
  if (!/^\d{3,4}$/.test(c.cvv)) errors.cvv = "Enter the 3 or 4 digit security code.";
  if (!c.name.trim()) errors.name = "Enter the name on the card.";
  return errors;
}

function Field({ label, error, id, ...input }: { label: string; error?: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...input}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-8 border px-3 outline-none placeholder:text-foggy ${error ? "border-2 border-arches" : "border-deco focus:border-2 focus:border-hof"}`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-arches">
          {error}
        </p>
      )}
    </div>
  );
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

function CheckoutBody({ listing }: { listing: ListingDetail }) {
  const { user, isLoading: authLoading } = useAuth();
  const authModal = useAuthModal();
  const router = useRouter();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const b = useBooking(listing);

  const [modal, setModal] = useState<"dates" | "guests" | null>(null);
  const [card, setCard] = useState<Card>({ number: "", expiry: "", cvv: "", name: "" });
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false); // state updates are async, so a fast double click needs a ref guard too

  const { data: availability } = useQuery({
    queryKey: ["availability", listing.id],
    queryFn: () => api<{ booked: { check_in: string; check_out: string }[] }>(`/api/listings/${listing.id}/availability`),
  });
  const booked: BookedRange[] = (availability?.booked ?? []).map((r) => [parseISO(r.check_in), parseISO(r.check_out)]);

  const setField = (k: keyof Card, v: string) => {
    setCard((c) => ({ ...c, [k]: v }));
    setCardErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function confirm() {
    if (inFlight.current) return;
    const errors = validateCard(card);
    setCardErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById("card-number")?.scrollIntoView({ block: "center" });
      return;
    }
    if (!b.hasDates || !b.quote) return setModal("dates");

    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Only the stay goes to the API. The mock card is not sent.
      const booking = await api<Booking>("/api/bookings", {
        method: "POST",
        json: {
          listing_id: listing.id,
          check_in: b.checkIn,
          check_out: b.checkOut,
          adults: b.guests.adults,
          children: b.guests.children,
          infants: b.guests.infants,
          pets: b.guests.pets,
        },
      });
      qc.invalidateQueries({ queryKey: ["bookings", "me"] });
      qc.invalidateQueries({ queryKey: ["availability", listing.id] });
      toast.success("Reservation confirmed");
      router.replace(`/trips/${booking.id}?new=1`); // stays "submitting" until the page changes
    } catch (e) {
      inFlight.current = false;
      setSubmitting(false);
      if (e instanceof ApiError && e.code === "dates_unavailable") {
        setSubmitError("Those dates were just booked. Pick new dates.");
        qc.invalidateQueries({ queryKey: ["availability", listing.id] });
        qc.invalidateQueries({ queryKey: ["quote", listing.id] });
        setModal("dates");
      } else {
        setSubmitError(e instanceof ApiError ? e.message : "Could not complete your reservation. Please try again.");
      }
    }
  }

  const card_ = "rounded-16 border border-deco p-6";
  const summaryRow = "flex items-start justify-between gap-4 py-3";
  const changeBtn = "shrink-0 rounded-pill bg-quaternary px-4 py-2 text-sm font-medium hover:bg-bebe";
  const missingDates = !b.hasDates;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-16">
      {/* ---------- Left: the three steps ---------- */}
      <div className="order-2 space-y-4 lg:order-1">
        <section className={card_} aria-labelledby="step-1">
          <h2 id="step-1" className="text-section">
            1. Log in or sign up
          </h2>
          {authLoading ? (
            <Skeleton className="mt-4 h-6 w-48 rounded-8" />
          ) : user ? (
            <p className="mt-2 text-secondary">
              <span className="font-medium text-hof">{user.name}</span> ({user.email})
              <span className="ml-2 rounded-pill bg-discount px-2 py-0.5 text-label text-spruce-text">Done</span>
            </p>
          ) : (
            <>
              <p className="mt-2 text-secondary">Log in to reserve this place.</p>
              <Button variant="primary" className="mt-4" onClick={() => authModal.open("Log in to reserve this place")}>
                Continue
              </Button>
            </>
          )}
        </section>

        <fieldset disabled={!user} className={`${card_} ${user ? "" : "opacity-50"}`} aria-labelledby="step-2">
          <h2 id="step-2" className="text-section">
            2. Add a payment method
          </h2>
          <p className="mt-1 text-sm text-secondary">Payments are mocked. No card is charged.</p>
          <div className="mt-4 space-y-3">
            <Field
              id="card-number"
              label="Card number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxLength={23}
              value={card.number}
              error={cardErrors.number}
              onChange={(e) => setField("number", digitsOnly(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="card-expiry"
                label="Expiry (MM/YY)"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                maxLength={5}
                value={card.expiry}
                error={cardErrors.expiry}
                onChange={(e) => {
                  const d = digitsOnly(e.target.value).slice(0, 4);
                  setField("expiry", d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                }}
              />
              <Field
                id="card-cvv"
                label="CVV"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                value={card.cvv}
                error={cardErrors.cvv}
                onChange={(e) => setField("cvv", digitsOnly(e.target.value).slice(0, 4))}
              />
            </div>
            <Field
              id="card-name"
              label="Cardholder name"
              autoComplete="cc-name"
              value={card.name}
              error={cardErrors.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>
        </fieldset>

        <section className={`${card_} ${user ? "" : "opacity-50"}`} aria-labelledby="step-3">
          <h2 id="step-3" className="text-section">
            3. Review and confirm
          </h2>
          <p className="mt-1 text-sm text-secondary">You will not be charged: payments are mocked in this demo.</p>
          {submitError && (
            <p role="alert" className="mt-3 text-sm font-medium text-arches">
              {submitError}
            </p>
          )}
          {b.errorMessage && !submitError && (
            <p role="alert" className="mt-3 text-sm text-arches">
              {b.errorMessage}
            </p>
          )}
          <Button variant="primary" size="lg" className="mt-4 w-full sm:w-auto" disabled={!user || submitting || missingDates || !!b.errorMessage || !b.quote} onClick={confirm}>
            {submitting ? "Confirming..." : "Confirm and pay"}
          </Button>
        </section>
      </div>

      {/* ---------- Right: summary ---------- */}
      <aside className="order-1 h-fit rounded-16 border border-deco p-6 lg:sticky lg:top-24 lg:order-2">
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.photos[0]} alt="" className="size-24 shrink-0 rounded-12 bg-bebe object-cover" />
          <div className="min-w-0">
            <p className="text-card">{listing.title}</p>
            <p className="mt-1 flex items-center gap-1 text-sm">
              <Star size={12} className="fill-current" />
              {listing.rating === null || listing.review_count === 0 ? "New" : `${listing.rating.toFixed(2)} (${listing.review_count})`}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-bebe pt-4">
          <p className="font-medium">Free cancellation</p>
          <p className="text-sm text-secondary">Cancel any time before check-in for a full refund.</p>
        </div>

        <div className="mt-2 divide-y divide-bebe border-t border-bebe">
          <div className={summaryRow}>
            <div>
              <p className="font-medium">Dates</p>
              <p className={missingDates ? "text-arches" : "text-secondary"}>
                {b.range.from && b.range.to ? formatDateRange(b.range.from, b.range.to) : "Pick your dates to continue"}
              </p>
            </div>
            <button type="button" className={changeBtn} onClick={() => setModal("dates")}>
              {missingDates ? "Add" : "Change"}
            </button>
          </div>
          <div className={summaryRow}>
            <div>
              <p className="font-medium">Guests</p>
              <p className="text-secondary">{guestSummary(b.guests)}</p>
            </div>
            <button type="button" className={changeBtn} onClick={() => setModal("guests")}>
              Change
            </button>
          </div>
        </div>

        <div className="mt-2 border-t border-bebe pt-4">
          <h2 className="mb-2 text-section">Price details</h2>
          {b.quote ? (
            <PriceBreakdown quote={b.quote} />
          ) : b.loading ? (
            <Skeleton className="h-40 w-full rounded-12" />
          ) : (
            <p className="text-secondary">{b.errorMessage ?? "Add your dates to see the price."}</p>
          )}
        </div>
      </aside>

      {/* ---------- Change dates / guests ---------- */}
      <Modal
        open={modal === "dates"}
        onClose={() => setModal(null)}
        title="Change dates"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button disabled={!b.hasDates} onClick={() => { setSubmitError(null); setModal(null); }}>
              Save
            </Button>
          </div>
        }
      >
        <div className="p-6">
          {submitError && (
            <p role="alert" className="mb-3 text-sm font-medium text-arches">
              {submitError}
            </p>
          )}
          <CalendarPanel range={b.range} booked={booked} months={isMobile ? 1 : 2} onChange={b.setDates} />
        </div>
      </Modal>
      <Modal
        open={modal === "guests"}
        onClose={() => setModal(null)}
        title="Change guests"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setModal(null)}>Save</Button>
          </div>
        }
      >
        <div className="p-6">
          <GuestPicker value={b.guests} onChange={b.setGuests} maxGuests={listing.max_guests} petsAllowed={listing.pets_allowed} />
        </div>
      </Modal>
    </div>
  );
}
