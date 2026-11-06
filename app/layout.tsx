import type { Metadata, Viewport } from "next";
import { SHOP } from "@/lib/shop";
import AnalyticsTracker from "./AnalyticsTracker";
import "./globals.css";

const rawAppUrl =
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://muucut.ir");
const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

function getSafeBaseUrl(url: string): URL {
  try {
    return new URL(url);
  } catch {
    return new URL("https://muucut.ir");
  }
}

export const metadata: Metadata = {
  metadataBase: getSafeBaseUrl(appUrl),
  title: {
    default: `${SHOP.name} — رزرو آنلاین نوبت`,
    template: `%s | ${SHOP.name}`,
  },
  description: `نوبت ${SHOP.name} را همین حالا آنلاین رزرو کن — بدون تماس تلفنی، بدون معطلی.`,
  openGraph: {
    title: `${SHOP.name} — رزرو آنلاین نوبت`,
    description: "بدون تماس، بدون انتظار. روز و ساعتت را خودت انتخاب کن.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/logo.webp",
        width: 1024,
        height: 1024,
        alt: `${SHOP.name} — رزرو آنلاین نوبت`,
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/emblem.webp", type: "image/webp", sizes: "256x256" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
