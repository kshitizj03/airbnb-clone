"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { Logo } from "./Logo";

/* ---- Context: any component calls useAuthModal().open() to ask the user to log in ---- */

interface AuthModalValue {
  open: (reason?: string) => void;
  close: () => void;
}
const AuthModalContext = createContext<AuthModalValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const value: AuthModalValue = {
    open: (r) => {
      setReason(r);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal open={isOpen} reason={reason} onClose={value.close} />
    </AuthModalContext.Provider>
  );
}

/* ---- The modal itself ---- */

function Field({
  label,
  error,
  ...input
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        className={`block px-3 pt-2 pb-1 ${
          error ? "border-2 border-arches" : "border border-deco focus-within:border-2 focus-within:border-hof"
        } rounded-8 bg-white`}
      >
        <span className="block text-label text-secondary">{label}</span>
        <input
          {...input}
          aria-invalid={!!error}
          className="w-full bg-transparent text-base outline-none placeholder:text-foggy"
        />
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs text-arches">
          {error}
        </p>
      )}
    </div>
  );
}

function AuthModal({ open, reason, onClose }: { open: boolean; reason?: string; onClose: () => void }) {
  const { login, signup, demo } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Run an auth call, show field errors under inputs and anything else as a toast.
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setFieldErrors({});
    try {
      await action();
      setPassword("");
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setFieldErrors(e.fields);
      else toast.error(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "login" ? login(email, password) : signup(name, email, password)));
  }

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setFieldErrors({});
  }

  const tab = (m: "login" | "signup", text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => switchMode(m)}
      className={`flex-1 rounded-pill py-2 text-sm font-medium ${
        mode === m ? "bg-white shadow-elevation1" : "text-secondary hover:text-hof"
      }`}
    >
      {text}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Log in or sign up" size="md">
      <div className="px-6 pt-6 pb-8">
        <div className="mb-4 flex justify-center">
          <Logo className="h-8 w-8" />
        </div>
        <h3 className="mb-1 text-[22px] leading-7 font-medium">Welcome to Airbnb</h3>
        {reason && <p className="mb-2 text-sm text-secondary">{reason}</p>}

        <div role="tablist" className="mt-4 mb-4 flex gap-1 rounded-pill bg-quaternary p-1">
          {tab("login", "Log in")}
          {tab("signup", "Sign up")}
        </div>

        <form onSubmit={submit} noValidate className="space-y-3">
          {mode === "signup" && (
            <Field
              label="Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
            />
          )}
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Field
            label="Password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          {mode === "signup" && !fieldErrors.password && (
            <p className="text-xs text-secondary">At least 8 characters.</p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
            {busy ? "Please wait..." : "Continue"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-4 text-xs text-secondary">
          <span className="h-px flex-1 bg-bebe" />
          or
          <span className="h-px flex-1 bg-bebe" />
        </div>

        <div className="space-y-3">
          <Button variant="outline" size="lg" disabled={busy} className="w-full" onClick={() => run(() => demo("guest"))}>
            Continue as demo guest
          </Button>
          <Button variant="outline" size="lg" disabled={busy} className="w-full" onClick={() => run(() => demo("host"))}>
            Continue as demo host
          </Button>
        </div>
      </div>
    </Modal>
  );
}
