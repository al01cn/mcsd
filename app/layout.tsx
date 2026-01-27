import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = "Minecraft 音频包生成器";
const description = "在线生成Minecraft音频包，使用在线FFmpeg转换音频文件。纯本地运算，无需上传文件到服务器。";

async function getMetadataBase(): Promise<URL | undefined> {
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

  return undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getMetadataBase();

  return {
    metadataBase,
    applicationName: `${defaultTitle}`,
    title: {
      default: defaultTitle,
      template: `%s | ${defaultTitle}`,
    },
    description,
    alternates: {
      canonical: "/",
    },
    keywords: [
      "Minecraft",
      "资源包",
      "音频包",
      "OGG",
      "Vorbis",
      "FFmpeg",
      "sounds.json",
      "Java版",
      "基岩版",
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${defaultTitle}`,
      description,
      type: "website",
      locale: "zh_CN",
      url: "/",
      siteName: defaultTitle,
      images: [
        {
          url: "/note_block.png",
          width: 512,
          height: 512,
          alt: defaultTitle,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${defaultTitle}`,
      description,
      images: ["/note_block.png"],
    },
    icons: {
      icon: [{ url: "/favicon.ico" }],
      apple: [{ url: "/favicon.ico" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#38bdf8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="baidu-hm" strategy="afterInteractive">
          {`var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?27aeec8f9c84f9129d12c1be2b3ad9e6";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`}
        </Script>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
