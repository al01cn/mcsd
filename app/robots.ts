import type { MetadataRoute } from "next";

function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const host = siteUrl.origin;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host,
  };
}

