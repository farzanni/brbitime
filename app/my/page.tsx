import type { Metadata } from "next";
import { Suspense } from "react";
import CustomerPortalClient from "./CustomerPortalClient";
import { getShopConfig } from "@/lib/shop";

export const metadata: Metadata = {
  title: "نوبت‌های من و پیگیری رزرو",
  description: "مشاهده نوبت‌های فعال، سابقه مراجعات و لغو آنلاین نوبت در مو کات",
};

export default async function MyBookingsPage() {
  const shop = await getShopConfig();

  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-black text-neutral-400 text-sm"
        >
          در حال بارگذاری اطلاعات نوبت‌های شما...
        </div>
      }
    >
      <CustomerPortalClient
        shopName={shop.name}
        shopPhone={shop.phone}
        shopAddress={shop.address}
        shopMapUrl={shop.mapUrl}
      />
    </Suspense>
  );
}
