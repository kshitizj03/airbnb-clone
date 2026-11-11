"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Wishlist } from "@/lib/types";

export function SaveToWishlistModal({
  lists,
  onPick,
  onCreateNew,
  onClose,
}: {
  lists: Wishlist[];
  onPick: (list: Wishlist) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Save to wishlist"
      footer={
        <Button className="w-full" onClick={onCreateNew}>
          Create new wishlist
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-6">
        {lists.map((w) => (
          <button key={w.id} type="button" onClick={() => onPick(w)} className="text-left">
            <div className="aspect-square overflow-hidden rounded-16 bg-bebe">
              {w.cover_photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.cover_photos[0]} alt="" className="size-full object-cover" />
              )}
            </div>
            <p className="mt-2 truncate text-tab">{w.name}</p>
            <p className="text-label font-normal text-secondary">{w.count} saved</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
