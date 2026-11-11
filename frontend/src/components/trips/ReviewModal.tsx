"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FieldError, inputCls } from "@/components/hosting/fields/FieldError";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import type { Booking, Review } from "@/lib/types";

const CATEGORIES = [
  ["cleanliness", "Cleanliness"],
  ["accuracy", "Accuracy"],
  ["checkin", "Check-in"],
  ["communication", "Communication"],
  ["location", "Location"],
  ["value", "Value"],
] as const;
type Score = "rating" | (typeof CATEGORIES)[number][0];
const MAX_COMMENT = 1000;

/** Five toggle buttons; the pressed one is the rating. */
function Stars({ label, value, onChange, size = 24 }: { label: string; value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div role="group" aria-label={label} className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={value === n} onClick={() => onChange(n)} className="rounded-8 p-1 hover:bg-faint">
          <Star size={size} strokeWidth={1.5} className={n <= value ? "fill-hof stroke-hof" : "stroke-tertiary"} />
        </button>
      ))}
    </div>
  );
}

/** Mount it only while it should show: the form starts empty each time. */
export function ReviewModal({ trip, onClose }: { trip: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const [scores, setScores] = useState<Partial<Record<Score, number>>>({});
  const [comment, setComment] = useState("");
  const complete = scores.rating !== undefined && CATEGORIES.every(([key]) => scores[key] !== undefined) && comment.trim().length > 0;
  const setScore = (key: Score) => (n: number) => setScores((s) => ({ ...s, [key]: n }));

  const submit = useMutation({
    mutationFn: () => api<Review>(`/api/bookings/${trip.id}/review`, { method: "POST", json: { ...scores, comment: comment.trim() } }),
    onSuccess: () => {
      const listingId = trip.listing.id;
      qc.invalidateQueries({ queryKey: ["booking", String(trip.id)] });
      qc.invalidateQueries({ queryKey: ["bookings", "me"] });
      qc.invalidateQueries({ queryKey: ["listing", String(listingId)] }); // rating and review count
      qc.invalidateQueries({ queryKey: ["reviews-preview", listingId] });
      qc.invalidateQueries({ queryKey: ["reviews", listingId] });
      toast.success("Thanks for your review");
      onClose();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (complete) submit.mutate();
  }

  return (
    <Modal
      open
      onClose={() => !submit.isPending && onClose()}
      title="Write a review"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" disabled={submit.isPending} onClick={onClose} className="rounded-8 px-2 py-1 font-semibold underline hover:bg-faint">
            Cancel
          </button>
          <Button type="submit" form="review-form" disabled={!complete || submit.isPending}>
            {submit.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      }
    >
      <form id="review-form" onSubmit={onSubmit} className="p-6">
        {/* Focused on open, so the form starts at the top instead of jumping to the comment box. */}
        <h3 data-autofocus tabIndex={-1} className="text-section outline-none">
          How was your stay at {trip.listing.title}?
        </h3>
        <div className="mt-4">
          <Stars label="Overall rating" value={scores.rating ?? 0} onChange={setScore("rating")} size={32} />
        </div>
        <div className="mt-6 divide-y divide-bebe border-y border-bebe">
          {CATEGORIES.map(([key, name]) => (
            <div key={key} className="flex items-center justify-between py-3">
              <span className="text-base">{name}</span>
              <Stars label={name} value={scores[key] ?? 0} onChange={setScore(key)} />
            </div>
          ))}
        </div>
        <label htmlFor="review-comment" className="mt-6 block text-base font-medium">
          Tell future guests about your stay
        </label>
        <textarea id="review-comment" rows={5} maxLength={MAX_COMMENT} value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputCls} mt-2 resize-none`} />
        <p className="mt-1 text-sm text-secondary">
          {comment.length}/{MAX_COMMENT}
        </p>
        <FieldError error={submit.error ? (submit.error instanceof ApiError ? submit.error.message : "Could not send your review. Please try again.") : undefined} />
      </form>
    </Modal>
  );
}
