"use client";

import { House, Search, X } from "lucide-react";
import { parseISO } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WhenPanel } from "@/components/search/WhenPanel";
import { WherePanel } from "@/components/search/WherePanel";
import { WhoPanel } from "@/components/search/WhoPanel";
import { useCurrentSearch } from "@/hooks/useCurrentSearch";
import { useSearchDraft } from "@/hooks/useSearchDraft";
import { dateSummary } from "@/lib/format";
import { guestSummary } from "@/lib/search-params";

export type Segment = "where" | "when" | "who";

interface SearchBarProps {
  /** Which panel to open straight away (the compact pill passes the part that was clicked). */
  initialActive?: Segment | null;
  /** Escape or a click outside with no panel open: the header may collapse again. */
  onDismiss?: () => void;
}

/** The big Where | When | Who bar (desktop). */
export function SearchBar({ initialActive = null, onDismiss }: SearchBarProps) {
  const [active, setActive] = useState<Segment | null>(initialActive);
  const { location, setLocation, dates, setDates, guests, setGuests, search } = useSearchDraft(() => {
    setActive(null);
    onDismiss?.();
  });
  const ref = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // Focus the typing field whenever Where becomes the active segment.
  useEffect(() => {
    if (active === "where") whereInput.current?.focus();
  }, [active]);

  // Escape and clicks outside close the open panel (and then the expanded header).
  useEffect(() => {
    function close() {
      setActive(null);
      onDismissRef.current?.();
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const barActive = active !== null;
  const guestCount = guestSummary(guests);
  const dateText = dateSummary(dates.from, dates.to);

  return (
    <div ref={ref} className="relative mx-auto w-[850px] max-w-full">
      <div
        className={`flex h-[66px] items-center rounded-pill border border-deco shadow-elevation3 ${
          barActive ? "bg-bebe" : "bg-elevated"
        }`}
      >
        <Cell
          grow="flex-[1.3]"
          on={active === "where"}
          barActive={barActive}
          hideDivider
          clear={
            active === "where" && location ? (
              <ClearButton label="Clear destination" onClick={() => { setLocation(""); whereInput.current?.focus(); }} />
            ) : null
          }
        >
          <label className="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-center pl-8">
            <span className="text-label">Where</span>
            <input
              ref={whereInput}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => setActive("where")}
              onKeyDown={(e) => e.key === "Enter" && setActive("when")}
              placeholder="Search destinations"
              autoComplete="off"
              className="w-full truncate bg-transparent text-tab outline-none placeholder:text-foggy"
            />
          </label>
        </Cell>

        <Cell
          grow="flex-1"
          on={active === "when"}
          barActive={barActive}
          hideDivider={active === "where" || active === "when"}
          clear={
            active === "when" && dates.from ? <ClearButton label="Clear dates" onClick={() => setDates({})} /> : null
          }
        >
          <SegmentButton label="When" value={dateText} placeholder="Add dates" open={active === "when"} onClick={() => setActive("when")} />
        </Cell>

        <Cell
          grow="flex-[1.3]"
          on={active === "who"}
          barActive={barActive}
          hideDivider={active === "when" || active === "who"}
          clear={
            active === "who" && guestCount ? (
              <ClearButton label="Clear guests" onClick={() => setGuests({ adults: 0, children: 0, infants: 0, pets: 0 })} />
            ) : null
          }
        >
          <SegmentButton label="Who" value={guestCount} placeholder="Add guests" open={active === "who"} onClick={() => setActive("who")} />
          <button
            type="button"
            onClick={search}
            aria-label="Search"
            className={`mr-2 flex h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-rausch text-white transition-all hover:bg-product-rausch ${
              barActive ? "px-4" : "w-12"
            }`}
          >
            <Search size={18} strokeWidth={3} />
            {barActive && <span className="text-base font-medium">Search</span>}
          </button>
        </Cell>
      </div>

      {active === "where" && (
        <Panel className="left-0 w-[450px] p-6">
          <WherePanel
            query={location}
            onPick={(city) => {
              setLocation(city);
              setActive("when");
            }}
          />
        </Panel>
      )}
      {active === "when" && (
        <Panel className="inset-x-0 p-8">
          <WhenPanel
            value={dates}
            onChange={(r) => {
              setDates(r);
              if (r.from && r.to) setActive("who");
            }}
          />
        </Panel>
      )}
      {active === "who" && (
        <Panel className="right-0 w-[400px] px-8 py-4">
          <WhoPanel value={guests} onChange={setGuests} />
        </Panel>
      )}
    </div>
  );
}

function Cell({
  grow,
  on,
  barActive,
  hideDivider,
  clear,
  children,
}: {
  grow: string;
  on: boolean;
  barActive: boolean;
  hideDivider?: boolean;
  clear?: ReactNode;
  children: ReactNode;
}) {
  const state = on ? "z-10 bg-raised shadow-primary" : barActive ? "hover:bg-deco" : "hover:bg-bebe";
  return (
    <div className={`relative flex h-full items-center rounded-pill transition-colors ${grow} ${state}`}>
      <span className={`absolute top-4 bottom-4 left-0 w-px bg-deco ${hideDivider ? "invisible" : ""}`} />
      {children}
      {clear}
    </div>
  );
}

function SegmentButton({
  label,
  value,
  placeholder,
  open,
  onClick,
}: {
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="flex h-full min-w-0 flex-1 flex-col justify-center pl-8 text-left"
    >
      <span className="text-label">{label}</span>
      <span className={`truncate text-tab ${value ? "" : "text-foggy"}`}>{value || placeholder}</span>
    </button>
  );
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-bebe"
    >
      <X size={14} strokeWidth={2.5} />
    </button>
  );
}

function Panel({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`animate-fade-in absolute top-[74px] z-20 rounded-32 bg-elevated shadow-primary ${className}`}>
      {children}
    </div>
  );
}

/** The small pill shown after scrolling and on inner pages: Anywhere | Anytime | Add guests. */
export function CompactSearch({ onExpand }: { onExpand: (segment: Segment) => void }) {
  const s = useCurrentSearch();
  const dates = dateSummary(s.checkIn ? parseISO(s.checkIn) : undefined, s.checkOut ? parseISO(s.checkOut) : undefined);
  const guests = guestSummary(s);
  const part = "h-full px-4 text-tab";

  return (
    <div className="flex h-12 items-center rounded-pill border border-deco bg-elevated pl-2 shadow-elevation2 hover:shadow-elevation3">
      {!s.location && <House size={18} strokeWidth={1.5} className="ml-2" />}
      <button type="button" className={part} onClick={() => onExpand("where")}>
        {s.location ? `Homes in ${s.location}` : "Anywhere"}
      </button>
      <span className="h-6 w-px bg-deco" />
      <button type="button" className={`${part} ${dates ? "" : "text-secondary"}`} onClick={() => onExpand("when")}>
        {dates || "Anytime"}
      </button>
      <span className="h-6 w-px bg-deco" />
      <button type="button" className={`${part} ${guests ? "" : "text-secondary"} font-normal`} onClick={() => onExpand("who")}>
        {guests || "Add guests"}
      </button>
      <span className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-rausch text-white">
        <Search size={14} strokeWidth={3} />
      </span>
    </div>
  );
}
