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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: siteUrl ? new URL("/sitemap.xml", siteUrl).toString() : undefined,
    host: siteUrl ? siteUrl.origin : undefined,
  };
}
