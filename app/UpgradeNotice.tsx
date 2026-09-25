"use client";

import { ArrowRight, CircleArrowUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import WebConfig from "../lib/config";
import styles from "./UpgradeNotice.module.css";

const upgradeUrl = WebConfig.upgradeUrl;
const upgradeOrigin = new URL(upgradeUrl).origin;
const speculationRules = JSON.stringify({
  prefetch: [
    {
      source: "list",
      urls: [upgradeUrl],
      eagerness: "immediate",
      referrer_policy: "strict-origin-when-cross-origin",
    },
  ],
});

export default function UpgradeNotice() {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    linkRef.current?.focus({ preventScroll: true });

    let prefetch: HTMLLinkElement | undefined;
    let controller: AbortController | undefined;

    // Speculation Rules prefetch navigation documents without relying on CORS.
    if (!HTMLScriptElement.supports?.("speculationrules")) {
      prefetch = document.createElement("link");
      if (prefetch.relList.supports("prefetch")) {
        prefetch.rel = "prefetch";
        prefetch.as = "document";
        prefetch.href = upgradeUrl;
        document.head.appendChild(prefetch);
      } else {
        controller = new AbortController();
        void fetch(upgradeUrl, {
          mode: "no-cors",
          credentials: "include",
          cache: "force-cache",
          signal: controller.signal,
        }).catch(() => {
          // An optional warm-up must never block the normal navigation link.
        });
      }
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      prefetch?.remove();
      controller?.abort();
    };
  }, []);

  return (
    <>
      <link rel="dns-prefetch" href={upgradeOrigin} />
      <link rel="preconnect" href={upgradeOrigin} />
      <script
        type="speculationrules"
        dangerouslySetInnerHTML={{ __html: speculationRules }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        aria-describedby="upgrade-description"
        className={styles.overlay}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            linkRef.current?.focus();
          }
        }}
      >
        <header className={styles.header}>
          <span className={styles.brand}>MC SoundsGen</span>
          <span className={styles.legacy}>旧版站点</span>
        </header>

        <div className={styles.content}>
          <Image
            src="/note_block.png"
            alt=""
            width={80}
            height={80}
            priority
            className={styles.icon}
          />
          <p className={styles.eyebrow}>
            <CircleArrowUp size={16} aria-hidden="true" />
            新版本已上线
          </p>
          <h2 id="upgrade-title" className={styles.title}>
            MCSD 2.0
          </h2>
          <p id="upgrade-description" className={styles.description}>
            当前版本已过时。
            <br />
            请前往新版，继续创建你的 Minecraft 音频包。
          </p>
          <p className={styles.deadline}>
            旧版本将在一周后停止支持，并自动重定向到新版本。
          </p>
          <a
            ref={linkRef}
            href={upgradeUrl}
            className={styles.link}
          >
            前往 MCSD 2.0
            <ArrowRight size={20} aria-hidden="true" />
          </a>
          <p className={styles.destination}>{new URL(upgradeUrl).host}</p>
        </div>

        <footer className={styles.footer}>Minecraft 音频包生成器</footer>
      </section>
    </>
  );
}
