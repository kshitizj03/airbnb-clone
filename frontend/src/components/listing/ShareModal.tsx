"use client";

import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { ListingDetail } from "@/lib/types";

export function ShareModal({ listing, onClose }: { listing: ListingDetail; onClose: () => void }) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      // The async clipboard API needs a focused page; the old textarea trick does not.
      const box = document.createElement("textarea");
      box.value = window.location.href;
      document.body.append(box);
      box.select();
      const ok = document.execCommand("copy");
      box.remove();
      if (ok) toast("Link copied");
      else toast.error("Could not copy the link");
    }
    onClose();
  }
  const btn = "flex h-14 items-center gap-3 rounded-12 border border-deco px-4 text-base hover:bg-faint";
  const soon = () => toast("Coming soon");
  const mail = `mailto:?subject=${encodeURIComponent(listing.title)}&body=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`;

  return (
    <Modal open onClose={onClose} title="Share this place" size="sm">
      <div className="p-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.photos[0]} alt="" className="size-16 rounded-12 object-cover" />
          <p className="text-base">
            {listing.title}
            <span className="block text-sm text-secondary">
              {listing.bedrooms} bedroom{listing.bedrooms === 1 ? "" : "s"} · {listing.beds} bed{listing.beds === 1 ? "" : "s"} · {listing.bathrooms} bathroom
              {listing.bathrooms === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={copyLink} className={btn}>
            <Copy size={20} /> Copy Link
          </button>
          <a href={mail} className={btn}>
            <Mail size={20} /> Email
          </a>
          {["Messages", "WhatsApp", "Messenger", "Facebook"].map((name) => (
            <button key={name} type="button" onClick={soon} className={btn}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
