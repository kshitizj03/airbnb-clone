"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

/** The logged-in user (or null) lives in the TanStack Query cache under ["me"]. */
export function useAuth() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<User>("/api/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null; // just not logged in
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // After login/logout, store the new user and drop every other cached query
  // (wishlists, trips, ...) so one account never sees another's data.
  function setUser(user: User | null) {
    qc.setQueryData(["me"], user);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  }

  async function login(email: string, password: string) {
    setUser(await api<User>("/api/auth/login", { method: "POST", json: { email, password } }));
  }
  async function signup(name: string, email: string, password: string) {
    setUser(await api<User>("/api/auth/signup", { method: "POST", json: { name, email, password } }));
  }
  async function demo(role: "guest" | "host") {
    setUser(await api<User>("/api/auth/demo", { method: "POST", json: { role } }));
  }
  async function logout() {
    await api<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return { user: data ?? null, isLoading, login, signup, demo, logout };
}
