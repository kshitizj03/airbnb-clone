"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CircleHelp, Heart, Menu, MessageSquare, Plane, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "./AuthModal";

const row = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-faint";
const divider = <div role="separator" className="my-2 h-px bg-bebe" />;

export function UserMenu() {
  const { user, logout } = useAuth();
  const authModal = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const link = (href: string, label: string, icon?: ReactNode) => (
    <Link href={href} role="menuitem" className={row} onClick={() => setOpen(false)}>
      {icon}
      {label}
    </Link>
  );

  async function onLogout() {
    setOpen(false);
    try {
      await logout();
      toast("Logged out");
      router.push("/");
    } catch {
      toast.error("Could not log out. Please try again.");
    }
  }

  const icon = (I: typeof Heart) => <I size={18} className="shrink-0" />;
  const soon = (slug: string, label: string, I: typeof Heart) => link(`/coming-soon/${slug}`, label, icon(I));

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2">
      <button
        type="button"
        aria-label="Profile"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe"
      >
        {user ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-rausch-light text-sm font-semibold text-product-rausch">
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <UserIcon size={18} />
        )}
      </button>
      <button
        type="button"
        aria-label="Main menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full bg-quaternary hover:bg-bebe"
      >
        <Menu size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 w-60 rounded-12 bg-white py-2 shadow-secondary"
        >
          {user ? (
            <>
              {link("/wishlists", "Wishlists", icon(Heart))}
              {link("/trips", "Trips", icon(Plane))}
              {soon("messages", "Messages", MessageSquare)}
              {soon("profile", "Profile", UserIcon)}
              {divider}
              {soon("account-settings", "Account settings", Settings)}
              {soon("help-centre", "Help Centre", CircleHelp)}
              {divider}
              {user.is_host ? link("/hosting", "Switch to hosting") : link("/become-a-host", "Become a host")}
              {divider}
              <button type="button" role="menuitem" className={row} onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              {link("/coming-soon/help-centre", "Help Centre")}
              {link("/become-a-host", "Become a host")}
              {divider}
              <button
                type="button"
                role="menuitem"
                className={`${row} font-medium`}
                onClick={() => {
                  setOpen(false);
                  authModal.open();
                }}
              >
                Log in or sign up
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
