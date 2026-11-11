"use client";

import { parseISO } from "date-fns";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { WhenPanel } from "@/components/search/WhenPanel";
import { WherePanel } from "@/components/search/WherePanel";
import { WhoPanel } from "@/components/search/WhoPanel";
import { useCurrentSearch } from "@/hooks/useCurrentSearch";
import { useSearchDraft } from "@/hooks/useSearchDraft";
import { dateSummary } from "@/lib/format";
import { guestSummary } from "@/lib/search-params";
import type { Segment } from "./SearchBar";

/** Mobile: a "Start your search" pill that opens a full-screen sheet with stacked Where / When / Who cards. */
export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const s = useCurrentSearch();
  const summary = [
    s.location,
    dateSummary(s.checkIn ? parseISO(s.checkIn) : undefined, s.checkOut ? parseISO(s.checkOut) : undefined),
    guestSummary(s),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-deco text-sm font-medium shadow-elevation2"
      >
        <Search size={16} strokeWidth={2.5} />
        <span className="truncate">{summary || "Start your search"}</span>
      </button>
      {/* Remounted on every open so the draft restarts from the URL. */}
      {open && <Sheet onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Segment>("where");
  const { location, setLocation, dates, setDates, guests, setGuests, search, clearAll } = useSearchDraft(onClose);
  const guestText = guestSummary(guests);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={clearAll} className="text-base font-medium underline">
            Clear all
          </button>
          <button
            type="button"
            onClick={search}
            className="flex h-12 items-center gap-2 rounded-12 bg-rausch px-6 text-base font-medium text-white"
          >
            <Search size={18} strokeWidth={3} />
            Search
          </button>
        </div>
      }
    >
      <div className="bg-quaternary p-4">
        <nav aria-label="Search type" className="mb-4 flex justify-center gap-8 text-tab">
          <span className="border-b-2 border-hof pb-2">Homes</span>
          <Link href="/coming-soon/experiences" className="pb-2 text-secondary">Experiences</Link>
          <Link href="/coming-soon/services" className="pb-2 text-secondary">Services</Link>
        </nav>
        <div className="flex flex-col gap-3">
          <Card title="Where?" label="Where" value={location} placeholder="I'm flexible" open={active === "where"} onOpen={() => setActive("where")}>
            <div className="mb-4 flex h-12 items-center gap-3 rounded-12 border border-hof px-4">
              <Search size={18} />
              <input
                aria-label="Search destinations"
                autoFocus
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search destinations"
                autoComplete="off"
                className="w-full bg-transparent text-base outline-none placeholder:text-foggy"
              />
            </div>
            <WherePanel
              query={location}
              onPick={(city) => {
                setLocation(city);
                setActive("when");
              }}
            />
          </Card>
          <Card title="When?" label="When" value={dateSummary(dates.from, dates.to)} placeholder="Add dates" open={active === "when"} onOpen={() => setActive("when")}>
            <WhenPanel
              months={1}
              value={dates}
              onChange={(r) => {
                setDates(r);
                if (r.from && r.to) setActive("who");
              }}
            />
          </Card>
          <Card title="Who?" label="Who" value={guestText} placeholder="Add guests" open={active === "who"} onOpen={() => setActive("who")}>
            <WhoPanel value={guests} onChange={setGuests} />
          </Card>
        </div>
      </div>
    </Modal>
  );
}

function Card({
  title,
  label,
  value,
  placeholder,
  open,
  onOpen,
  children,
}: {
  title: string;
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex h-14 w-full items-center justify-between rounded-24 bg-white px-6 text-tab shadow-elevation2"
      >
        <span className="text-secondary">{label}</span>
        <span className="truncate pl-4">{value || placeholder}</span>
      </button>
    );
  }
  return (
    <section className="rounded-24 bg-white p-6 shadow-secondary">
      <h2 className="mb-4 text-section">{title}</h2>
      {children}
    </section>
  );
}
