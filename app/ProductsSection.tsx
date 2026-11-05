import { type ProductItem } from "@/lib/shop";
import { Sparkles } from "lucide-react";

export default function ProductsSection({ products }: { products: ProductItem[] }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Sparkles className="h-4 w-4 text-neutral-300" />
        <h2 className="text-sm font-bold text-white">محصولات سالن</h2>
      </div>

      {/* Clean list */}
      <div className="space-y-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
          >
            <div>
              <h3 className="text-xs font-bold text-white">{product.title}</h3>
              {product.tag && (
                <span className="text-[10px] text-neutral-400">{product.tag}</span>
              )}
            </div>
            <span className="font-mono text-xs font-bold text-neutral-200">
              {product.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
