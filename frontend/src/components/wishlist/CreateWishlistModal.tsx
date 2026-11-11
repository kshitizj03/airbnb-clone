"use client";

import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Mount it only while it should show: the name state starts from `initialName` each time. */
export function CreateWishlistModal({
  initialName,
  onCreate,
  onClose,
}: {
  initialName: string;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const valid = name.trim().length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) onCreate(name.trim());
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create wishlist"
      size="sm"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-8 px-2 py-1 font-semibold underline hover:bg-faint">
            Cancel
          </button>
          <Button type="submit" form="create-wishlist-form" disabled={!valid}>
            Create
          </Button>
        </div>
      }
    >
      <form id="create-wishlist-form" onSubmit={submit} className="p-6">
        <label className="relative block rounded-8 border border-deco px-3 pt-2 pb-1 focus-within:border-2 focus-within:border-hof">
          <span className="block text-label text-secondary">Name</span>
          <input
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            className="w-full pr-8 text-base outline-none"
          />
          {name && (
            <button
              type="button"
              aria-label="Clear name"
              onClick={() => setName("")}
              className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full hover:bg-faint"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <p className="mt-2 text-label font-normal text-secondary">{name.length}/50 characters</p>
      </form>
    </Modal>
  );
}
