"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, ConciergeBell, House, LayoutGrid } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";
import { MobileSearch } from "./MobileSearch";
import { CompactSearch, SearchBar, type Segment } from "./SearchBar";
import { UserMenu } from "./UserMenu";

const tabs = [
  { label: "All", href: "/", Icon: LayoutGrid },
  { label: "Homes", href: "/", Icon: House },
  { label: "Experiences", href: "/coming-soon/experiences", Icon: Compass },
  { label: "Services", href: "/coming-soon/services", Icon: ConciergeBell },
];

/** Checkout and hosting pages get a logo-only header (no search, no tabs). */
export const isLogoOnlyRoute = (pathname: string) => /^\/(book|hosting|become-a-host)(\/|$)/.test(pathname);

// Stand-in while useSearchParams suspends, same size as the real thing so nothing jumps.
const pillFallback = (className: string) => <div className={`rounded-pill border border-deco ${className}`} />;

function HomeLink() {
  return (
    <Link href="/" aria-label="Airbnb home" className="flex flex-1 items-center gap-1">
      <Logo className="size-8" />
      <span className="hidden text-[26px] leading-none font-bold tracking-[-0.06em] text-rausch xl:block">airbnb</span>
    </Link>
  );
}

function RightControls() {
  const { user } = useAuth();
  return (
    <div className="flex flex-1 items-center justify-end gap-2">
      <Link href={user?.is_host ? "/hosting" : "/become-a-host"} className="rounded-pill px-4 py-3 text-tab hover:bg-faint">
        {user?.is_host ? "Switch to hosting" : "Become a host"}
      </Link>
      <UserMenu />
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const logoOnly = isLogoOnlyRoute(pathname);
  const onHome = pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  // Set when the compact pill is clicked: shows the full bar again with that segment open.
  const [expanded, setExpanded] = useState<Segment | null>(null);

  // Scrolling collapses the home bar into the pill (and folds an expanded pill back).
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 0);
      setExpanded(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Inner pages always use the pill; the home page only after scrolling.
  const compact = (!onHome || scrolled) && expanded === null;

  // The header is fixed so it can change height without moving the page; this spacer reserves its resting height.
  const spacer = logoOnly ? "h-[81px]" : `h-[73px] ${onHome ? "md:h-[179px]" : "md:h-[81px]"}`;

  return (
    <div className={spacer}>
      <header className={`fixed inset-x-0 top-0 z-40 border-b bg-white ${compact || logoOnly ? "border-bebe" : "border-transparent"}`}>
        {logoOnly ? (
          <div className="flex h-20 items-center px-4 md:px-12">
            <HomeLink />
          </div>
        ) : (
          <>
            {/* Mobile: the tab bar at the bottom holds navigation, so only the search pill lives here. */}
            <div className="px-4 py-3 md:hidden">
              <Suspense fallback={pillFallback("h-12 w-full")}>
                <MobileSearch />
              </Suspense>
            </div>

            <div className="hidden md:block">
              {compact ? (
                <div className="flex h-20 items-center justify-between px-12">
                  <HomeLink />
                  <Suspense fallback={pillFallback("h-12 w-[300px]")}>
                    <CompactSearch onExpand={setExpanded} />
                  </Suspense>
                  <RightControls />
                </div>
              ) : (
                <>
                  <div className="flex h-24 items-center justify-between px-12">
                    <HomeLink />
                    <nav aria-label="Categories" className="flex items-end gap-8">
                      {tabs.map(({ label, href, Icon }) => {
                        // "All" is never highlighted; "Homes" is the default tab on home and search pages.
                        const active =
                          label === "Homes" ? onHome || pathname.startsWith("/s/") : label !== "All" && pathname === href;
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
                    <RightControls />
                  </div>
                  <div className="px-12 pb-4">
                    <Suspense fallback={pillFallback("mx-auto h-[66px] w-[850px] max-w-full shadow-elevation3")}>
                      <SearchBar initialActive={expanded} onDismiss={() => setExpanded(null)} />
                    </Suspense>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </header>
    </div>
  );
}
