import { type ProductItem } from "@/lib/shop";
import { Sparkles, Check, ArrowUpLeft } from "lucide-react";

export default function ProductsSection({ products }: { products: ProductItem[] }) {
  return (
    <aside className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              محصولات اختصاصی
            </h2>
            <p className="text-[10px] text-neutral-400">فرمولاسیون حرفه‌ای استایل و مراقبت</p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-neutral-300">
          PRODUCTS
        </span>
      </div>

      <p className="text-[11px] leading-5 text-neutral-400">
        محصولات تست‌شده توسط آرایشگران برتر؛ قابل تهیه حضوری در سالن هنگام مراجعه.
      </p>

      {/* Luxury Product Slabs */}
      <div className="space-y-3.5">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/60 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:from-white/[0.08] hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)]"
          >
            {/* Top row: Tag & In-salon status */}
            <div className="mb-2.5 flex items-center justify-between gap-2">
              {product.tag ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-neutral-200">
                  {product.tag}
                </span>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                <Check className="h-3 w-3 text-white" />
                موجود در سالن
              </span>
            </div>

            {/* Product Name */}
            <h3 className="text-xs font-bold text-white transition group-hover:text-neutral-100">
              {product.title}
            </h3>

            {/* Description */}
            <p className="mt-1 text-[11px] leading-5 text-neutral-400">
              {product.description}
            </p>

            {/* Bottom: Price in crisp monospace */}
            <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                قیمت
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-tight">
                {product.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
