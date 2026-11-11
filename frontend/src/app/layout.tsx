import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const cereal = Plus_Jakarta_Sans({ variable: "--font-cereal", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Airbnb clone",
  description: "A take-home clone of Airbnb: search, book and host stays.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cereal.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
