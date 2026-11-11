"use client";

import { Medal, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { Host } from "@/lib/types";

const yearsHosting = (h: Host) => new Date().getFullYear() - h.joined_year;
const hostingText = (h: Host) => (yearsHosting(h) >= 1 ? `${yearsHosting(h)} year${yearsHosting(h) === 1 ? "" : "s"} hosting` : "New host");

/** The small "Hosted by" row under the overview. */
export function HostRow({ host }: { host: Host }) {
  return (
    <div className="flex items-center gap-4 border-b border-bebe py-6">
      <Avatar name={host.name} src={host.avatar_url} size={40} />
      <div>
        <p className="text-base font-medium">Hosted by {host.name}</p>
        <p className="text-sm text-secondary">
          {host.is_superhost && "Superhost · "}
          {hostingText(host)}
        </p>
      </div>
    </div>
  );
}

export function MeetHost({ host }: { host: Host }) {
  const stats: [string, string][] = [
    [String(host.review_count), "Reviews"],
    [host.rating === null ? "-" : `${host.rating.toFixed(2)}`, "Rating"],
    [String(Math.max(yearsHosting(host), 0)), "Years hosting"],
  ];
  return (
    <section id="host" className="border-b border-bebe py-8">
      <h2 className="text-section">Meet your host</h2>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="flex items-center justify-between gap-6 rounded-32 bg-white p-6 shadow-secondary md:p-8">
          <div className="flex flex-col items-center text-center">
            <Avatar name={host.name} src={host.avatar_url} size={104} />
            <p className="mt-3 text-[32px] leading-9 font-semibold">{host.name}</p>
            <p className="flex items-center gap-1 text-sm">
              {host.is_superhost && <Medal size={14} />}
              {host.is_superhost ? "Superhost" : "Host"}
            </p>
          </div>
          <dl className="w-28 shrink-0 text-left">
            {stats.map(([value, label], i) => (
              <div key={label} className={`py-2 ${i < stats.length - 1 ? "border-b border-bebe" : ""}`}>
                <dd className="text-[22px] leading-6 font-semibold">{value}</dd>
                <dt className="text-xs">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div>
          {host.is_superhost && (
            <div className="mb-8">
              <h3 className="text-base font-semibold">{host.name.split(" ")[0]} is a Superhost</h3>
              <p className="mt-2 text-base">Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.</p>
            </div>
          )}
          <h3 className="text-base font-semibold">Host details</h3>
          <p className="mt-2 text-base">
            {host.listing_count} listing{host.listing_count === 1 ? "" : "s"} on Airbnb
          </p>
          {host.bio && <p className="mt-4 text-base">{host.bio}</p>}
          <Link href="/coming-soon/messages" className="mt-6 inline-flex h-12 items-center rounded-8 bg-quaternary px-6 text-base font-medium hover:bg-bebe">
            Message host
          </Link>
          <p className="mt-8 flex gap-3 border-t border-bebe pt-6 text-xs text-secondary">
            <ShieldCheck size={24} className="shrink-0 text-rausch" />
            To help protect your payment, always use Airbnb to send money and communicate with hosts.
          </p>
        </div>
      </div>
    </section>
  );
}
