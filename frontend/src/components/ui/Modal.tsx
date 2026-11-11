"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  /** Stacking class; raise it for a modal opened from another full-screen layer. */
  layer?: string;
  children: ReactNode;
}

const widths = {
  sm: "md:max-w-[440px]",
  md: "md:max-w-[568px]",
  lg: "md:max-w-[780px]",
  full: "md:max-w-none md:h-full md:rounded-none",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, footer, size = "md", layer = "z-50", children }: ModalProps) {
  // false on the server and during hydration, true after: document.body does not exist before that.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Keep the latest onClose without re-running the effect (which would steal focus).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current!;

    // Lock page scroll while open.
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus inside: first form field if there is one, else the close button.
    (dialog.querySelector<HTMLElement>("input, select, textarea") ?? dialog.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: wrap Tab / Shift+Tab inside the dialog.
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      previouslyFocused?.focus();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  // Portal to <body>: a modal opened from inside the fixed header would otherwise be trapped under its z-index.
  return createPortal(
    <div
      className={`animate-fade-in fixed inset-0 ${layer} flex items-end justify-center bg-black/50 md:items-center md:p-6`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        className={`animate-modal-in flex h-full w-full flex-col overflow-hidden bg-white shadow-high md:h-auto md:max-h-[90vh] md:rounded-32 ${widths[size]}`}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-bebe px-16">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute left-4 flex size-8 items-center justify-center rounded-full hover:bg-faint"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
          {title && (
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-bebe px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
