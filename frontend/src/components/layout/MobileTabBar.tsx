"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageSquare, Plane, Search, User as UserIcon, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "./AuthModal";

interface Tab {
  label: string;
  Icon: LucideIcon;
  href?: string; // no href = opens the login modal
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const authModal = useAuthModal();

  const tabs: Tab[] = user
    ? [
        { label: "Explore", Icon: Search, href: "/" },
        { label: "Wishlists", Icon: Heart, href: "/wishlists" },
        { label: "Trips", Icon: Plane, href: "/trips" },
        { label: "Messages", Icon: MessageSquare, href: "/coming-soon/messages" },
        { label: "Profile", Icon: UserIcon, href: "/coming-soon/profile" },
      ]
    : [
        { label: "Explore", Icon: Search, href: "/" },
        { label: "Wishlists", Icon: Heart, href: "/wishlists" },
        { label: "Log in", Icon: UserIcon },
      ];

  if (pathname.startsWith("/rooms/")) return null; // the booking bar takes the bottom of the screen

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-bebe bg-white md:hidden"
    >
      {tabs.map(({ label, Icon, href }) => {
        const active = href !== undefined && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        const cls = `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
          active ? "text-rausch" : "text-secondary"
        }`;
        const inner = (
          <>
            <Icon size={24} strokeWidth={1.75} />
            {label}
          </>
        );
        return href ? (
          <Link key={label} href={href} className={cls} aria-current={active ? "page" : undefined}>
            {inner}
          </Link>
        ) : (
          <button key={label} type="button" className={cls} onClick={() => authModal.open()}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
