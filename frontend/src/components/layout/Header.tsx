"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, ConciergeBell, House, LayoutGrid, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

const tabs = [
  { label: "All", href: "/", Icon: LayoutGrid },
  { label: "Homes", href: "/", Icon: House },
  { label: "Experiences", href: "/coming-soon/experiences", Icon: Compass },
  { label: "Services", href: "/coming-soon/services", Icon: ConciergeBell },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  // "All" is never highlighted; "Homes" is the default tab on home and search pages.
  const isActive = (label: string, href: string) =>
    label === "Homes" ? pathname === "/" || pathname.startsWith("/s/") : label !== "All" && pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-bebe bg-white">
      {/* Mobile: Logo-less "Start your search" pill (tabs and menu live in the bottom bar) */}
      <div className="px-4 py-3 md:hidden">
        <div className="flex h-12 items-center justify-center gap-2 rounded-pill border border-deco text-sm font-medium shadow-elevation2">
          <Search size={16} strokeWidth={2.5} />
          Start your search
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex h-24 items-center justify-between px-12">
          <Link href="/" aria-label="Airbnb home" className="flex flex-1 items-center gap-1">
            <Logo className="size-8" />
            <span className="hidden text-[26px] leading-none font-bold tracking-[-0.06em] text-rausch xl:block">
              airbnb
            </span>
          </Link>

          <nav aria-label="Categories" className="flex items-end gap-8">
            {tabs.map(({ label, href, Icon }) => {
              const active = isActive(label, href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex flex-col items-center gap-1 pt-2 pb-3 text-tab ${
                    active ? "text-hof" : "text-secondary hover:text-hof"
                  }`}
                >
                  <Icon size={28} strokeWidth={1.5} />
                  {label}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 bg-hof ${
                      active ? "" : "scale-x-0 bg-deco group-hover:scale-x-100"
                    } transition-transform`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <Link
              href={user?.is_host ? "/hosting" : "/become-a-host"}
              className="rounded-pill px-4 py-3 text-tab hover:bg-faint"
            >
              {user?.is_host ? "Switch to hosting" : "Become a host"}
            </Link>
            <UserMenu />
          </div>
        </div>

        {/* Static placeholder for the search bar (Task 9 makes it interactive). */}
        <div className="px-12 pb-4">
          <div
            role="presentation"
            className="mx-auto flex h-[66px] w-[850px] max-w-full items-center rounded-pill border border-deco bg-white shadow-elevation3"
          >
            {[
              ["Where", "Search destinations"],
              ["When", "Add dates"],
              ["Who", "Add guests"],
            ].map(([label, value], i) => (
              <div key={label} className="relative flex h-full flex-1 flex-col justify-center px-8">
                {i > 0 && <span className="absolute top-4 bottom-4 left-0 w-px bg-deco" />}
                <span className="text-label">{label}</span>
                <span className="text-tab text-foggy">{value}</span>
              </div>
            ))}
            <span className="mr-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-rausch text-white">
              <Search size={18} strokeWidth={3} />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
