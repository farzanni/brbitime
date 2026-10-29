import { type ProductItem } from "@/lib/shop";
import { ShoppingBag, Sparkles, Tag, Check } from "lucide-react";

export default function ProductsSection({ products }: { products: ProductItem[] }) {
  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">محصولات سالن</h2>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
          اورجینال
        </span>
      </div>

      <p className="text-xs leading-5 text-neutral-400">
        محصولات حرفه‌ای مراقبت از مو و ریش، قابل تهیه به صورت حضوری در سالن هنگام مراجعه.
      </p>

      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4 transition hover:border-amber-500/40 hover:bg-neutral-900"
          >
            {product.tag && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                <Sparkles className="h-3 w-3" />
                {product.tag}
              </div>
            )}

            <h3 className="font-semibold text-white group-hover:text-amber-300 transition text-sm">
              {product.title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              {product.description}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-neutral-800/60 pt-2.5">
              <span className="font-mono text-xs font-bold text-amber-400">
                {product.price}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <Check className="h-3 w-3 text-emerald-400" />
                موجود در سالن
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
