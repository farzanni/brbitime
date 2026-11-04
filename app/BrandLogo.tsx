import Image from "next/image";

export default function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dim = size === "sm" ? 36 : size === "md" ? 54 : size === "lg" ? 112 : 148;
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
        className="object-contain object-center mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]"
        priority
      />
    </div>
  );
}
