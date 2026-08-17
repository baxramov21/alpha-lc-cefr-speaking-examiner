import type { Metadata } from "next";
import { Merriweather, Geist_Mono } from "next/font/google";
import "./globals.css";

const merriweather = Merriweather({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alpha LC — CEFR Speaking Examiner",
  description:
    "AI-powered CEFR speaking assessment platform. Instant, accurate band scoring with Professional AI.",
  keywords: ["CEFR", "IELTS", "speaking exam", "AI assessment", "language learning"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${merriweather.variable} ${geistMono.variable} h-full antialiased font-sans`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
