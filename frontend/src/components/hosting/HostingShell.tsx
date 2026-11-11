"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { LoginPrompt } from "./shared";

const NAV = [
  { label: "Today", href: "/hosting", active: (p: string) => p === "/hosting" },
  { label: "Listings", href: "/hosting/listings", active: (p: string) => p.startsWith("/hosting/listings") },
  { label: "Messages", href: "/coming-soon/messages", active: () => false },
];

/** Hosting header (logo, Today / Listings / Messages, Switch to travelling, menu) and the login gate for every /hosting page. */
export function HostingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const nav = (cls: string) => (
    <nav aria-label="Hosting" className={cls}>
      {NAV.map(({ label, href, active }) => {
        const on = active(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`rounded-pill px-3 py-2 text-tab ${on ? "font-bold underline decoration-2 underline-offset-8" : "text-secondary hover:text-hof"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <header className="border-b border-bebe bg-white">
        <div className="flex h-20 items-center justify-between px-4 md:px-12">
          <Link href="/" aria-label="Airbnb home" className="flex flex-1 items-center gap-1">
            <Logo className="size-8" />
          </Link>
          {nav("hidden items-center gap-2 md:flex")}
          <div className="flex flex-1 items-center justify-end gap-2">
            <Link href="/" className="hidden rounded-pill px-4 py-3 text-tab hover:bg-faint md:block">
              Switch to travelling
            </Link>
            <UserMenu />
          </div>
        </div>
        {nav("flex justify-center gap-2 pb-2 md:hidden")}
      </header>
      {isLoading ? (
        <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-10 md:px-12">
          <Skeleton className="h-9 w-64 rounded-8" />
          <Skeleton className="h-40 w-full rounded-16" />
        </div>
      ) : user ? (
        children
      ) : (
        <LoginPrompt title="Log in to host" text="Your listings and reservations show up here once you are logged in." />
      )}
    </>
  );
}
