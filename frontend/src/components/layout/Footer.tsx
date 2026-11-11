import Link from "next/link";
import { Globe } from "lucide-react";

const columns = [
  {
    title: "Support",
    links: ["Help Centre", "AirCover", "Anti-discrimination", "Disability support", "Cancellation options"],
  },
  {
    title: "Hosting",
    links: ["Airbnb your home", "AirCover for Hosts", "Hosting resources", "Community forum", "Hosting responsibly"],
  },
  { title: "Airbnb", links: ["Newsroom", "New features", "Careers", "Investors", "Gift cards"] },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function Footer() {
  return (
    <footer className="border-t border-bebe bg-faint pb-20 md:pb-0">
      <div className="mx-auto max-w-[1760px] px-4 md:px-12">
        <div className="grid gap-8 border-b border-deco py-12 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-tab font-semibold">{col.title}</h2>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href={`/coming-soon/${slug(l)}`} className="hover:underline">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap gap-x-2">
            <span>&copy; 2026 Airbnb clone</span>
            <span aria-hidden>&middot;</span>
            <Link href="/coming-soon/privacy" className="hover:underline">
              Privacy
            </Link>
            <span aria-hidden>&middot;</span>
            <Link href="/coming-soon/terms" className="hover:underline">
              Terms
            </Link>
            <span aria-hidden>&middot;</span>
            <Link href="/coming-soon/company-details" className="hover:underline">
              Company details
            </Link>
          </p>
          <p className="flex items-center gap-6 font-medium">
            <span className="flex items-center gap-2">
              <Globe size={16} />
              English (IN)
            </span>
            <span>&#8377; INR</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
