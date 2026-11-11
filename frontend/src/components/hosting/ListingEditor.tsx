"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Settings } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/trips/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { api, ApiError } from "@/lib/api";
import { formatINR, placeName } from "@/lib/format";
import { pick, sectionDirty, sectionError, sectionOk, toDraft, type Draft, type SectionId } from "@/lib/listing-draft";
import type { ListingDetail } from "@/lib/types";
import { SectionField, useInvalidateListings } from "./shared";

const PLACE: Record<string, string> = { entire_home: "Entire place", private_room: "Room", shared_room: "Shared room" };
const KIND: Record<string, string> = { house: "House", flat: "Flat", guest_house: "Guest house", hotel: "Hotel" };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Left-hand cards, in order. `summary` reads from the saved listing, never the draft.
const SECTIONS: { id: SectionId; label: string; summary: (l: ListingDetail) => string }[] = [
  { id: "photos", label: "Photos", summary: (l) => plural(l.photos.length, "photo") },
  { id: "title", label: "Title", summary: (l) => l.title },
  { id: "description", label: "Description", summary: (l) => l.description },
  { id: "type", label: "Property type", summary: (l) => `${PLACE[l.place_type]} · ${KIND[l.property_type]}` },
  { id: "location", label: "Location", summary: (l) => placeName(l.address, l.city, l.state) },
  { id: "basics", label: "Guests and rooms", summary: (l) => `${plural(l.max_guests, "guest")} · ${plural(l.bedrooms, "bedroom")} · ${plural(l.beds, "bed")} · ${plural(l.bathrooms, "bathroom")}` },
  { id: "amenities", label: "Amenities", summary: (l) => `${l.amenities.length} amenit${l.amenities.length === 1 ? "y" : "ies"}` },
  { id: "pricing", label: "Pricing", summary: (l) => `${formatINR(l.price_per_night)} per night${l.cleaning_fee > 0 ? ` + ${formatINR(l.cleaning_fee)} cleaning` : ""}` },
];

export function ListingEditor({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, isLoading, isFetchedAfterMount, error, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api<ListingDetail>(`/api/listings/${id}`),
    enabled: !!user,
    retry: false,
    refetchOnMount: "always", // the draft is seeded from this data, so never from a stale cache entry
  });

  if (error instanceof ApiError && error.status === 404) notFound();
  if (error) return <ErrorState message="We could not load this listing." onRetry={() => refetch()} />;
  if (isLoading || !data || !isFetchedAfterMount)
    return (
      <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-8 md:px-12">
        <Skeleton className="h-10 w-64 rounded-8" />
        <Skeleton className="h-24 w-full max-w-[450px] rounded-16" />
        <Skeleton className="h-24 w-full max-w-[450px] rounded-16" />
      </div>
    );
  // Someone else's listing looks exactly like one that does not exist.
  if (user && data.host.id !== user.id) notFound();
  return <Editor listing={data} />;
}

function Editor({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const invalidate = useInvalidateListings();
  const isDesktop = useIsDesktop();

  const saved = toDraft(listing);
  const [draft, setDraft] = useState<Draft>(saved);
  const [selected, setSelected] = useState<SectionId | null>(null); // null = the section list (phones)
  const [fields, setFields] = useState<Record<string, string>>();
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const current = selected ?? (isDesktop ? "photos" : null);
  const section = SECTIONS.find((s) => s.id === current);
  const dirty = current ? sectionDirty(current, draft, saved) : false;

  const patch = (p: Partial<Draft>) => {
    setFields(undefined);
    setDraft((d) => ({ ...d, ...p }));
  };

  async function save() {
    if (!current) return;
    setSaving(true);
    try {
      const updated = await api<ListingDetail>(`/api/listings/${listing.id}`, { method: "PATCH", json: pick(draft, current) });
      qc.setQueryData(["listing", String(listing.id)], updated);
      invalidate();
      toast.success("Saved");
    } catch (e) {
      if (e instanceof ApiError && e.fields) setFields(e.fields);
      toast.error(e instanceof ApiError ? e.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await api<void>(`/api/listings/${listing.id}`, { method: "DELETE" });
      // Drop the deleted listing from the cache first, so nothing re-fetches it (that would 404 on this page).
      qc.removeQueries({ queryKey: ["listing"] });
      invalidate();
      toast.success("Listing deleted");
      router.push("/hosting/listings");
    } catch (e) {
      setDeleteError(
        e instanceof ApiError && e.code === "has_upcoming_bookings"
          ? "This listing has upcoming reservations. Cancel them first."
          : e instanceof ApiError
            ? e.message
            : "Could not delete the listing. Please try again.",
      );
      setDeleting(false);
    }
  }

  const list = (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/hosting/listings" aria-label="Back to your listings" className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 text-[32px] leading-10 font-semibold">Listing editor</h1>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Listing settings"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe"
          >
            <Settings size={18} />
          </button>
          {menuOpen && (
            <div role="menu" className="animate-fade-in absolute top-full right-0 z-20 mt-2 w-48 rounded-12 bg-elevated py-2 shadow-secondary">
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-3 text-left text-sm hover:bg-faint"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteError(undefined);
                  setConfirmDelete(true);
                }}
              >
                Delete listing
              </button>
            </div>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={current === s.id ? "true" : undefined}
              onClick={() => setSelected(s.id)}
              className={`w-full rounded-16 bg-elevated p-5 text-left shadow-elevation2 ${current === s.id ? "border border-hof" : "border border-transparent hover:border-deco"}`}
            >
              <span className="block text-card">{s.label}</span>
              <span className="mt-1 line-clamp-2 block text-sm font-normal text-secondary">{s.summary(listing)}</span>
              {sectionDirty(s.id, draft, saved) && <span className="mt-1 block text-label text-product-rausch">Unsaved changes</span>}
              {s.id === "photos" && (
                <span className="mt-3 flex gap-2">
                  {listing.photos.slice(0, 3).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p} src={p} alt="" className="size-14 rounded-8 object-cover" />
                  ))}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-6 mt-6 flex justify-center">
        <Link href={`/rooms/${listing.id}`} className="inline-flex h-12 items-center gap-2 rounded-pill bg-hof px-6 text-button text-on-hof shadow-primary hover:bg-hof-hover">
          <Eye size={18} /> View
        </Link>
      </div>
    </div>
  );

  const form = section && current && (
    <div className="mx-auto max-w-[630px]">
      <div className="mb-6 flex items-center gap-3">
        {!isDesktop && (
          <button type="button" aria-label="Back to sections" onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe">
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-[32px] leading-10 font-semibold">{section.label}</h2>
      </div>
      <SectionField id={current} draft={draft} patch={patch} error={sectionError(current, fields)} />
      <div className="sticky bottom-0 -mx-4 mt-8 flex justify-end border-t border-bebe bg-surface px-4 py-4 md:mx-0 md:px-0">
        <Button size="lg" disabled={!dirty || saving || !sectionOk(current, draft)} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:grid lg:grid-cols-[450px_1fr] lg:gap-0 lg:px-12">
      {/* Phones show either the list or the form, never both. */}
      <div className={`lg:border-r lg:border-bebe lg:pr-10 ${current && !isDesktop ? "hidden" : ""}`}>{list}</div>
      <div className={`lg:pl-10 ${!current ? "hidden" : ""}`}>{form}</div>

      <Modal
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="Delete listing"
        size="sm"
        footer={
          <div className="flex justify-between gap-3">
            <Button variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button disabled={deleting} onClick={remove}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 px-6 py-6">
          <p>
            Delete <strong>{listing.title}</strong>? Guests will no longer be able to find or book it.
          </p>
          {deleteError && (
            <p role="alert" className="text-arches">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
