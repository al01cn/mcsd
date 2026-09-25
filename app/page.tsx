import UpgradeNotice from "./UpgradeNotice";

export default function Home() {

  const defaultTitle = "Minecraft 音频包生成器";
  const description = "在线生成Minecraft音频包，使用在线FFmpeg转换音频文件。纯本地运算，无需上传文件到服务器。";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${defaultTitle}`,
    description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    inLanguage: "zh-CN"
  } as const;

  return (
    <>
      <main>
        <h1 className="sr-only">{defaultTitle}</h1>
        <p className="sr-only">{description}</p>
        <UpgradeNotice />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
