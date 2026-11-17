import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { BottomNav, BottomNavView, TopNav, TopNavView } from "@/components/nav";
import { OfflineBanner } from "@/components/offline-banner";
import { TimezoneSync } from "@/components/timezone-sync";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lift Log",
  description: "Personal workout planner and tracker",
  appleWebApp: { capable: true, title: "Lift Log", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <OfflineBanner />
        <Suspense fallback={<TopNavView pathname="" />}>
          <TopNav />
        </Suspense>
        <main className="mx-auto w-full max-w-xl px-2 pt-3 pb-12">{children}</main>
        <Suspense fallback={<BottomNavView pathname="" />}>
          <BottomNav />
        </Suspense>
        <TimezoneSync />
      </body>
    </html>
  );
}
