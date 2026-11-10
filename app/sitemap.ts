import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const rawBase =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://muucut.ir");
  const baseUrl = /^https?:\/\//i.test(rawBase)
    ? rawBase.replace(/\/$/, "")
    : `https://${rawBase.replace(/\/$/, "")}`;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
