import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}

/** Page numbers to show: first, last, and the current page with its neighbours; "…" fills the gaps. */
function visible(page: number, pages: number): (number | "gap")[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  wanted.forEach((n, i) => {
    if (i > 0 && n - wanted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

const arrow = "flex size-8 items-center justify-center rounded-full hover:bg-faint disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";

/** ‹ 1 2 3 4 … 15 ›  with the current page as a black filled circle. */
export function Pagination({ page, pages, onPage }: Props) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 py-10">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={arrow}>
        <ChevronLeft size={16} />
      </button>
      {visible(page, pages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap${i}`} className="flex size-8 items-center justify-center text-sm">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPage(n)}
            className={`flex size-8 items-center justify-center rounded-full text-sm ${n === page ? "bg-hof font-semibold text-on-hof" : "hover:bg-faint"}`}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={arrow}>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
