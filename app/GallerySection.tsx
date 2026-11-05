import Image from "next/image";
import { type GalleryItem } from "@/lib/shop";
import { Camera } from "lucide-react";

export default function GallerySection({ gallery }: { gallery: GalleryItem[] }) {
  if (!gallery || gallery.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Clean Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Camera className="h-4 w-4 text-neutral-300" />
        <h2 className="text-sm font-bold text-white">گالری سالن</h2>
      </div>

      {/* Clean Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {gallery.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 transition hover:border-white/25"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 inset-x-3 text-center sm:text-right">
              <span className="text-xs font-bold text-white drop-shadow-md">
                {item.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
