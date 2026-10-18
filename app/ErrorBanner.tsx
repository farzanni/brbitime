"use client";

import { useSearchParams } from "next/navigation";

/**
 * Reads the ?error= flag from the URL on the client so that the home page
 * itself stays statically renderable (a server-side `await searchParams`
 * would opt the whole route into dynamic rendering and disable edge caching).
 */
export default function ErrorBanner() {
  const error = useSearchParams().get("error");

  if (error === "slot-taken") {
    return (
      <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm">
        این ساعت همین الان توسط شخص دیگری رزرو شد. ساعت دیگری انتخاب کن.
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm">
        اطلاعات واردشده معتبر نیست.
      </div>
    );
  }

  return null;
}
