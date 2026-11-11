"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Camera, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { formatINR, placeName } from "@/lib/format";
import { EMPTY_DRAFT, sectionError, sectionOk, type Draft, type SectionId } from "@/lib/listing-draft";
import type { Amenity, ListingDetail } from "@/lib/types";
import { PlaceTypeField } from "./fields/PlaceTypeField";
import { PropertyTypeField } from "./fields/PropertyTypeField";
import { LoginPrompt, SectionField, useInvalidateListings } from "./shared";

type Step =
  | { kind: "intro"; phase: number; title: string; text: string; icon: ReactNode }
  | { kind: "form"; title: string; hint?: string; section: SectionId; valid: (d: Draft) => boolean; render: (d: Draft, patch: (p: Partial<Draft>) => void, error?: string) => ReactNode }
  | { kind: "review"; title: string };

const bigIcon = (I: typeof Camera) => (
  <div className="flex aspect-square w-full max-w-[360px] items-center justify-center rounded-32 bg-rausch-light text-rausch">
    <I size={120} strokeWidth={1} />
  </div>
);

const STEPS: Step[] = [
  { kind: "intro", phase: 1, title: "Tell us about your place", text: "Share some basic info, like where it is and how many guests can stay.", icon: bigIcon(BedDouble) },
  {
    kind: "form",
    title: "Which of these best describes your place?",
    section: "type",
    valid: (d) => !!d.property_type,
    render: (d, patch, error) => <PropertyTypeField value={d.property_type} onChange={(property_type) => patch({ property_type })} error={error} />,
  },
  {
    kind: "form",
    title: "What type of place will guests have?",
    section: "type",
    valid: (d) => !!d.place_type,
    render: (d, patch) => <PlaceTypeField value={d.place_type} onChange={(place_type) => patch({ place_type })} />,
  },
  {
    kind: "form",
    title: "Where's your place located?",
    hint: "Fill in the address, then click the map to drop the pin.",
    section: "location",
    valid: (d) => sectionOk("location", d),
    render: (d, patch, error) => <SectionField id="location" draft={d} patch={patch} error={error} />,
  },
  {
    kind: "form",
    title: "Share some basics about your place",
    hint: "You can add more details later.",
    section: "basics",
    valid: (d) => sectionOk("basics", d),
    render: (d, patch, error) => <SectionField id="basics" draft={d} patch={patch} error={error} />,
  },
  { kind: "intro", phase: 2, title: "Make your place stand out", text: "Add the amenities you offer, some photos, a title and a description.", icon: bigIcon(Camera) },
  {
    kind: "form",
    title: "Tell guests which amenities they'll find at your place",
    hint: "Pick as many as you like. You can change these later.",
    section: "amenities",
    valid: () => true,
    render: (d, patch, error) => <SectionField id="amenities" draft={d} patch={patch} error={error} />,
  },
  {
    kind: "form",
    title: "Add some photos of your place",
    hint: "Add at least 1 photo, up to 20. The first photo is your cover photo.",
    section: "photos",
    valid: (d) => sectionOk("photos", d),
    render: (d, patch, error) => <SectionField id="photos" draft={d} patch={patch} error={error} />,
  },
  {
    kind: "form",
    title: "Now, let's give your place a title",
    hint: "Short titles work best.",
    section: "title",
    valid: (d) => sectionOk("title", d),
    render: (d, patch, error) => <SectionField id="title" draft={d} patch={patch} error={error} />,
  },
  {
    kind: "form",
    title: "Create your description",
    hint: "Share what makes your place special.",
    section: "description",
    valid: (d) => sectionOk("description", d),
    render: (d, patch, error) => <SectionField id="description" draft={d} patch={patch} error={error} />,
  },
  { kind: "intro", phase: 3, title: "Finish up and publish", text: "Set your price and booking settings, then review and publish your listing.", icon: bigIcon(Sparkles) },
  {
    kind: "form",
    title: "Now, set your price",
    hint: "You can change it any time.",
    section: "pricing",
    valid: (d) => sectionOk("pricing", d),
    render: (d, patch, error) => <SectionField id="pricing" draft={d} patch={patch} error={error} />,
  },
  { kind: "review", title: "Review your listing" },
];

// First and last step index of each of the three progress segments.
const PHASES = [
  [0, 4],
  [5, 9],
  [10, 12],
];

type Action = { type: "patch"; patch: Partial<Draft> };
const reducer = (d: Draft, a: Action): Draft => ({ ...d, ...a.patch });

const PLACE_LABEL: Record<string, string> = { entire_home: "Entire place", private_room: "Room", shared_room: "Shared room" };
const TYPE_LABEL: Record<string, string> = { house: "House", flat: "Flat", guest_house: "Guest house", hotel: "Hotel" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Review({ draft }: { draft: Draft }) {
  const { data: amenities } = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/api/amenities"), staleTime: Infinity });
  const names = draft.amenity_slugs.map((s) => amenities?.find((a) => a.slug === s)?.name ?? s);
  return (
    <div className="overflow-hidden rounded-24 border border-deco">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={draft.photo_urls[0]} alt="Cover photo" className="aspect-[16/10] w-full object-cover" />
      <div className="space-y-3 p-6">
        <h2 className="text-listing-title">{draft.title}</h2>
        <p className="text-secondary">
          {TYPE_LABEL[draft.property_type]} · {PLACE_LABEL[draft.place_type]} in {placeName(draft.city, draft.state)}
        </p>
        <p className="text-secondary">
          {plural(draft.max_guests, "guest")} · {plural(draft.bedrooms, "bedroom")} · {plural(draft.beds, "bed")} · {plural(draft.bathrooms, "bathroom")}
        </p>
        <p>{draft.description}</p>
        <p className="text-sm text-secondary">{names.length ? `Amenities: ${names.join(", ")}` : "No amenities selected"}</p>
        <p className="text-sm text-secondary">{draft.photo_urls.length} photos</p>
        <p className="text-sm text-secondary">
          {draft.instant_book ? "Instant Book" : "Guests request to book"} · {draft.pets_allowed ? "Pets allowed" : "No pets"}
        </p>
        <p className="text-row">
          {formatINR(draft.price_per_night)} <span className="text-base font-normal">night</span>
          {draft.cleaning_fee > 0 && <span className="text-base font-normal text-secondary"> + {formatINR(draft.cleaning_fee)} cleaning fee</span>}
        </p>
      </div>
    </div>
  );
}

export function ListingWizard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const invalidate = useInvalidateListings();
  const [draft, dispatch] = useReducer(reducer, EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Each step's heading takes focus so screen readers announce the new step.
  useEffect(() => headingRef.current?.focus(), [step]);

  const patch = (p: Partial<Draft>) => {
    setFields(undefined); // an edit clears the server's complaints
    dispatch({ type: "patch", patch: p });
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const canNext = current.kind === "form" ? current.valid(draft) : true;

  async function publish() {
    setPublishing(true);
    try {
      await api<ListingDetail>("/api/listings", {
        method: "POST",
        json: { ...draft, title: draft.title.trim(), description: draft.description.trim() },
      });
      qc.invalidateQueries({ queryKey: ["me"] }); // the user is a host now
      invalidate();
      toast.success("Your listing is live");
      router.push("/hosting/listings");
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        // Take the host to the first step the API complained about.
        setFields(e.fields);
        const bad = STEPS.findIndex((s) => s.kind === "form" && sectionError(s.section, e.fields));
        if (bad >= 0) setStep(bad);
      }
      toast.error(e instanceof ApiError ? e.message : "Could not publish your listing. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const topBar = (
    <header className="flex h-20 shrink-0 items-center justify-between px-6 md:px-12">
      <Link href="/" aria-label="Airbnb home">
        <Logo className="size-8" />
      </Link>
      <Button variant="outline" className="h-10 text-sm" onClick={() => setExiting(true)}>
        Exit
      </Button>
    </header>
  );

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="mx-auto w-full max-w-[630px] space-y-4 px-6 py-10">
        <Skeleton className="h-10 w-3/4 rounded-8" />
        <Skeleton className="h-40 w-full rounded-16" />
      </div>
    );
  } else if (!user) {
    body = <LoginPrompt title="Log in to create a listing" text="Hosts need an account to publish a listing." />;
  } else if (current.kind === "intro") {
    body = (
      <div className="mx-auto grid w-full max-w-[1000px] items-center gap-10 px-6 py-10 md:grid-cols-2">
        <div>
          <p className="text-row">Step {current.phase}</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-[40px] leading-[46px] font-semibold outline-none md:text-[56px] md:leading-[62px]">
            {current.title}
          </h1>
          <p className="mt-4 text-row font-normal text-secondary">{current.text}</p>
        </div>
        <div className="flex justify-center">{current.icon}</div>
      </div>
    );
  } else {
    body = (
      <div className="mx-auto w-full max-w-[630px] px-6 py-10">
        <h1 ref={headingRef} tabIndex={-1} className="text-[32px] leading-10 font-semibold outline-none">
          {current.title}
        </h1>
        {current.kind === "form" && current.hint && <p className="mt-2 mb-8 text-secondary">{current.hint}</p>}
        {current.kind === "review" && <p className="mt-2 mb-8 text-secondary">Here is what guests will see. Check everything, then publish.</p>}
        {current.kind === "form" ? current.render(draft, patch, sectionError(current.section, fields)) : <Review draft={draft} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {topBar}
      <div className="flex-1 overflow-y-auto">{body}</div>

      <footer className="shrink-0 border-t border-bebe bg-white">
        <div className="flex gap-2 px-6 md:px-12" role="progressbar" aria-label="Your progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {PHASES.map(([from, to], i) => {
            const fill = last ? 1 : Math.min(1, Math.max(0, (step - from) / (to - from + 1)));
            return (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-bebe">
                <div className="h-full bg-hof transition-[width] duration-300" style={{ width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex h-20 items-center justify-between px-6 md:px-12">
          <button type="button" className="rounded-8 px-3 py-2 text-button underline hover:bg-faint disabled:invisible" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          {last ? (
            <Button variant="primary" size="lg" disabled={!user || publishing} onClick={publish}>
              {publishing ? "Publishing..." : "Publish"}
            </Button>
          ) : (
            <Button size="lg" disabled={!user || !canNext} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
        </div>
      </footer>

      <Modal
        open={exiting}
        onClose={() => setExiting(false)}
        title="Discard this listing?"
        size="sm"
        layer="z-[60]"
        footer={
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setExiting(false)}>
              Keep editing
            </Button>
            <Button onClick={() => router.push("/hosting/listings")}>Discard</Button>
          </div>
        }
      >
        <p className="px-6 py-6 text-secondary">Your answers are not saved. If you leave now, you will start from scratch next time.</p>
      </Modal>
    </div>
  );
}
