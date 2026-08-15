import Link from "next/link";

export default function SuccessPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-white"
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-5 text-5xl">✓</div>

        <h1 className="text-2xl font-bold">نوبت شما ثبت شد</h1>

        <p className="mt-3 leading-7 text-neutral-400">
          در صورت نیاز آرایشگاه با شما تماس می‌گیرد.
        </p>

        <Link
          href="/"
          className="mt-8 block rounded-2xl bg-white p-4 font-semibold text-black"
        >
          بازگشت
        </Link>
      </div>
    </main>
  );
}
