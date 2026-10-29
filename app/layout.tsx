import type { Metadata, Viewport } from "next";
import { SHOP } from "@/lib/shop";
import "./globals.css";

const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

function getSafeBaseUrl(url: string): URL {
  try {
    return new URL(url);
  } catch {
    return new URL("http://localhost:3000");
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
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
