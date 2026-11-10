import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rawBase =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://muucut.ir");
  const baseUrl = /^https?:\/\//i.test(rawBase)
    ? rawBase.replace(/\/$/, "")
    : `https://${rawBase.replace(/\/$/, "")}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/my", "/success"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
