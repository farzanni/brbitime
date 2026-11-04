import Image from "next/image";

export default function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dim = size === "sm" ? 36 : size === "md" ? 52 : size === "lg" ? 104 : 148;
  const src = size === "sm" ? "/emblem.webp" : "/logo.webp";

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl select-none shadow-[0_0_30px_rgba(255,255,255,0.12)] border border-white/20 bg-black ${className}`}
      style={{ width: dim, height: dim }}
    >
      <Image
        src={src}
        alt="لوگو مو کات"
        fill
        sizes={`${dim}px`}
        className="object-cover object-center"
        priority
      />
    </div>
  );
}
