import { Suspense } from "react";
import BookingForm from "./BookingForm";
import ErrorBanner from "./ErrorBanner";
import { iranToday } from "@/lib/booking";
import { SHOP } from "@/lib/shop";

/**
 * Statically rendered + revalidated so Vercel serves it straight from the edge
 * CDN instead of executing a serverless function on every visit. The only
 * time-dependent value is `minDate` (today in Tehran), which the server action
 * re-validates anyway — see `bookAppointment` in ./actions.ts.
 */
export const revalidate = 600;

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-lg px-5 py-10">
        <header className="mb-10">
          <p className="mb-2 text-sm text-neutral-400">رزرو آنلاین</p>
          <h1 className="text-3xl font-bold">{SHOP.name}</h1>

          <p className="mt-3 leading-7 text-neutral-400">
            خدمات موردنظرت رو انتخاب کن و در کمتر از یک دقیقه وقت بگیر.
          </p>

        </header>

        <Suspense fallback={null}>
          <ErrorBanner />
        </Suspense>

        <BookingForm minDate={iranToday()} />

        <footer className="mt-10 flex items-center justify-center gap-6 border-t border-neutral-900 pt-6 text-sm text-neutral-400">
          <a href={`tel:${SHOP.phone}`} className="hover:text-white">
            📞 تماس
          </a>

          {SHOP.instagram && (
            <a
              href={`https://instagram.com/${SHOP.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              📷 اینستاگرام
            </a>
          )}
        </footer>
      </div>
    </main>
  );
}
