import type { Metadata } from "next";
import { getShopConfig } from "@/lib/shop";
import GalleryClient from "./GalleryClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "گالری مدل مو و نمونه کارهای تخصصی | مو کات",
  description:
    "مشاهده آلبوم تخصصی انواع مدل موی مردانه، فید، کراپ، پامپادور و استایل ریش در سالن مو کات",
};

export default async function GalleryPage() {
  const shop = await getShopConfig();

  return (
    <GalleryClient
      shopName={shop.name}
      shopPhone={shop.phone}
      shopAddress={shop.address}
      shopInstagram={shop.instagram}
      customGallery={shop.gallery}
    />
  );
}
