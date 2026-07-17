import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import EnterLabSplash from "@/components/layout/EnterLabSplash";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Toaster from "@/components/ui/Toast";
import "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Language Labs — Your Safe Space to Try, Test & Talk",
  description:
    "Learn English the scientific way. Take a free level test, book one of just 6 seats per lab, and build fluent, fearless English in 16 guided sessions over 8 weeks.",
  openGraph: {
    title: "Language Labs — Your Safe Space to Try, Test & Talk",
    description:
      "Small-group English labs with only 6 seats each — maximum speaking practice, personal attention and zero fear. Take the free level test to find your starting point.",
    type: "website",
    siteName: "Language Labs",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ErrorBoundary>
          <EnterLabSplash />
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
