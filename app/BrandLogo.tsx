export default function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? 32 : size === "lg" ? 72 : 48;
  const stroke = size === "sm" ? 1.5 : 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
      >
        {/* Outer sharp cut diamond */}
        <polygon
          points="50,4 96,50 50,96 4,50"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/80"
        />

        {/* Inner geometric diamond frame */}
        <polygon
          points="50,14 86,50 50,86 14,50"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
          className="text-white/30"
        />

        {/* Crossed scissors / razor abstract lines */}
        <path
          d="M32 32 L68 68"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-white"
        />
        <path
          d="M68 32 L32 68"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-white"
        />

        {/* Central Monogram M */}
        <path
          d="M40 58 L40 44 L50 54 L60 44 L60 58"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        />
      </svg>
    </div>
  );
}
