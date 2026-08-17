import BookingForm from "./BookingForm";
import { iranToday } from "@/lib/booking";
import { SHOP } from "@/lib/shop";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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

        <BookingForm error={error} minDate={iranToday()} />

      </div>
      <div className="mt-4 flex gap-4 text-sm text-neutral-400">
        <a href={`tel:${SHOP.phone}`}>تماس</a>
      </div>
    </main>
  );
}
