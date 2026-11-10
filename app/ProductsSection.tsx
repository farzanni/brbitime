import { type ProductItem } from "@/lib/shop";
import { ShoppingBag } from "lucide-react";

export default function ProductsSection({ products }: { products: ProductItem[] }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">محصولات تخصصی سالن</h2>
            <p className="text-xs text-neutral-400">محصولات مراقبت، حالت‌دهی و آرایشی اورجینال</p>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-4 sm:p-5 backdrop-blur-xl transition hover:border-white/25 hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                {product.tag && (
                  <span className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-200">
                    {product.tag}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  موجود در سالن
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                  {product.title}
                </h3>
                {product.description && (
                  <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed line-clamp-3">
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-neutral-400">قیمت:</span>
              <span className="font-mono text-sm font-black text-white">
                {product.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
