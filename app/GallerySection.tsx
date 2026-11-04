import { type GalleryItem } from "@/lib/shop";
import { Camera, Sparkles } from "lucide-react";

export default function GallerySection({ gallery }: { gallery: GalleryItem[] }) {
  if (!gallery || gallery.length === 0) return null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-white">
              گالری تصاویر سالن
            </h2>
            <p className="text-xs text-neutral-400">
              نگاهی به فضای اختصاصی، ابزار حرفه‌ای و نمونه کارهای سالن
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[10px] text-neutral-300">
          GALLERY ATELIER
        </span>
      </div>

      {/* Sharp Cut Stone Photo Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gallery.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:shadow-[0_12px_40px_rgba(255,255,255,0.08)]"
          >
            {/* Image Container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center filter grayscale contrast-110 transition-transform duration-500 group-hover:scale-105 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Tag Badge */}
              {item.tag && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                    {item.tag}
                  </span>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="p-4">
              <h3 className="text-xs font-bold text-white transition group-hover:text-white">
                {item.title}
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-neutral-400">
                {item.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
