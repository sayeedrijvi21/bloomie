"use client";

import Image from "next/image";
import { useLang } from "@/i18n/LanguageProvider";

export default function AboutPage() {
  const { t } = useLang();
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
      <div className="relative mx-auto aspect-square w-[80%] max-w-[420px]" style={{ clipPath: "url(#petal)" }}>
        <Image src="/images/bib-cherry.jpg" alt="" fill sizes="(min-width: 768px) 420px, 80vw" className="object-cover" />
      </div>
      <div>
        <h1 className="font-display text-4xl text-bark md:text-5xl">{t.about.title}</h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-bark-soft">{t.about.body}</p>
        <p className="mt-8 font-display text-2xl text-moss">{t.footer.tagline}</p>
      </div>
    </div>
  );
}
