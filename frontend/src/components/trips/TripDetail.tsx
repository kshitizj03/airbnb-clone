"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { formatDateRange, formatINR, placeName } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { ReviewModal } from "./ReviewModal";
import { canCancel, canReview, ErrorState, LoginState, StatusBadge, tripGuests } from "./shared";

export function TripDetail({ id }: { id: string }) {
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const isNew = useSearchParams().get("new") === "1";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: trip, error, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api<Booking>(`/api/bookings/${id}`),
    enabled: !!user,
    retry: false,
  });

  const cancel = useMutation({
    mutationFn: () => api<Booking>(`/api/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: (b) => {
      qc.setQueryData(["booking", id], b);
      qc.invalidateQueries({ queryKey: ["bookings", "me"] });
      qc.invalidateQueries({ queryKey: ["availability", b.listing.id] }); // the dates are free again
      toast.success("Reservation cancelled");
      setConfirmOpen(false);
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not cancel. Please try again.");
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });

  if (isLoading) return <TripSkeleton />;
  if (!user) return <LoginState />;
  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
  if (error) return <ErrorState message="We could not load this trip." onRetry={() => refetch()} />;
  if (!trip) return <TripSkeleton />;

  const l = trip.listing;
  const dates = formatDateRange(parseISO(trip.check_in), parseISO(trip.check_out));
  // The price saved on the booking, shown as stored (no new quote and no arithmetic here).
  const priceRows: [string, string][] = [
    ["Price per night", formatINR(trip.nightly_price)],
    ["Nights", String(trip.nights)],
    ...(trip.cleaning_fee > 0 ? ([["Cleaning fee", formatINR(trip.cleaning_fee)]] as [string, string][]) : []),
    ["Airbnb service fee", formatINR(trip.service_fee)],
    ["Taxes", formatINR(trip.taxes)],
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8 lg:px-10">
      <Link href="/trips" className="text-sm underline">
        All trips
      </Link>

      {isNew && trip.status === "confirmed" && (
        <div role="status" className="mt-4 flex items-center gap-3 rounded-16 bg-discount p-4 font-medium text-spruce-text">
          <CheckCircle2 size={24} />
          Your reservation is confirmed
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-16">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.photos[0]} alt={l.title} className="aspect-[3/2] w-full rounded-20 bg-bebe object-cover" />
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] leading-10 font-medium">{l.title}</h1>
              <p className="mt-1 text-secondary">
                {placeName(l.city, l.state)}
              </p>
            </div>
            <StatusBadge trip={trip} />
          </div>
          <dl className="mt-6 divide-y divide-bebe border-y border-bebe">
            <div className="flex justify-between py-4">
              <dt className="font-medium">Dates</dt>
              <dd>{dates}</dd>
            </div>
            <div className="flex justify-between py-4">
              <dt className="font-medium">Guests</dt>
              <dd>{tripGuests(trip)}</dd>
            </div>
          </dl>
          <Link href={`/rooms/${l.id}`} className="mt-4 inline-block text-sm font-medium underline">
            View listing
          </Link>
        </div>

        <aside className="h-fit rounded-16 border border-deco p-6">
          <h2 className="mb-3 text-section">Price details</h2>
          <dl className="text-base">
            {priceRows.map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-bebe pt-4 font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(trip.total)}</dd>
            </div>
          </dl>
          {canCancel(trip) && (
            <Button variant="outline" className="mt-6 w-full" onClick={() => setConfirmOpen(true)}>
              Cancel reservation
            </Button>
          )}
          {canReview(trip) && (
            <Button variant="outline" className="mt-6 w-full" onClick={() => setReviewOpen(true)}>
              Write a review
            </Button>
          )}
        </aside>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !cancel.isPending && setConfirmOpen(false)}
        title="Cancel reservation"
        size="sm"
        footer={
          <div className="flex justify-between gap-3">
            <Button variant="ghost" disabled={cancel.isPending} onClick={() => setConfirmOpen(false)}>
              Keep reservation
            </Button>
            <Button disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? "Cancelling..." : "Cancel reservation"}
            </Button>
          </div>
        }
      >
        <p className="p-6">
          Cancel your stay at {l.title} ({dates})? The dates will become available to other guests.
        </p>
      </Modal>
      {reviewOpen && <ReviewModal trip={trip} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

function TripSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] space-y-4 px-6 py-8 lg:px-10">
      <Skeleton className="aspect-[3/2] w-full max-w-2xl rounded-20" />
      <Skeleton className="h-9 w-80 rounded-8" />
      <Skeleton className="h-5 w-48 rounded-8" />
    </div>
  );
}
