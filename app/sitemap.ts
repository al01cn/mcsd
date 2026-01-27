import type { MetadataRoute } from "next";
import { headers } from "next/headers";

async function getSiteUrl(): Promise<URL | null> {
  const h = await headers();

  const hostHeader = h.get("x-forwarded-host") ?? h.get("host");
  const protoHeader = h.get("x-forwarded-proto");
  const host = hostHeader?.split(",")[0]?.trim();
  const proto = protoHeader?.split(",")[0]?.trim() || "https";

  if (host) {
    try {
      return new URL(`${proto}://${host}`);
    } catch {
      void 0;
    }
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) {
    try {
      return new URL(env);
    } catch {
      void 0;
    }
  }

  return null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  if (!siteUrl) return [];

  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
