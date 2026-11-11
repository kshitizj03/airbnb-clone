"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthModalProvider } from "@/components/layout/AuthModal";
import { WishlistProvider } from "@/hooks/useWishlists";

export function Providers({ children }: { children: ReactNode }) {
  // useState so each browser session gets one client, not one per render.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthModalProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </AuthModalProvider>
      <Toaster
        position="bottom-left"
        offset={{ left: 32, bottom: 60 }}
        mobileOffset={{ left: 16, right: 16, bottom: 80 }}
        toastOptions={{ style: { borderRadius: 12, boxShadow: "0 6px 16px rgba(0,0,0,.12)" } }}
      />
    </QueryClientProvider>
  );
}
