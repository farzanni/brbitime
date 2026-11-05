import Image from "next/image";

export default function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dim = size === "sm" ? 38 : size === "md" ? 56 : size === "lg" ? 116 : 152;
  const src = size === "sm" ? "/emblem.webp" : "/logo.webp";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dim, height: dim }}
    >
      <Image
        src={src}
        alt="لوگو مو کات"
        fill
        sizes={`${dim}px`}
        className="object-contain object-center drop-shadow-[0_2px_16px_rgba(255,255,255,0.18)]"
        priority
      />
    </div>
  );
}
