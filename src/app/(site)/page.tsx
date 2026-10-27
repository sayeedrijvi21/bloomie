"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { useShop } from "@/data/ShopDataProvider";
import { ProductGrid } from "@/components/ui";

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-sage" fill="currentColor" aria-hidden>
      <path d="M20 3.5c-7.8.2-13.3 3.4-14.9 9.4-.5 1.9-.4 3.6.2 5.1L3.2 20.1l1.1 1.1 2.1-2.1c1.5.6 3.2.7 5.1.2 6-1.6 9.2-7.1 9.4-14.9l-.9-.9Zm-8.5 13.1-1.1-1.1c2.3-2.6 4.8-4.8 7.4-6.6-1.8 2.7-3.9 5.2-6.3 7.7Z" />
    </svg>
  );
}

export default function Home() {
  const { t, num } = useLang();
  const { products, status } = useShop();

  return (
    <>
      <section className="bg-linen">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pb-16 md:pt-14">
          <div className="order-2 md:order-1">
            <h1 className="font-display text-[2.6rem] leading-[1.08] text-bark text-balance md:text-6xl">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-md text-lg text-bark-soft">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/shop"
                className="rounded-full bg-moss px-7 py-3.5 text-base font-semibold text-milk transition-colors hover:bg-bark"
              >
                {t.hero.cta}
              </Link>
              <span className="text-sm text-bark-soft">{t.how.note}</span>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div
              className="hero-in relative mx-auto aspect-square w-[88%] max-w-[480px]"
              style={{ clipPath: "url(#petal)" }}
            >
              <Image
                src="/images/bibs-flatlay.jpg"
                alt="Bloomie muslin bibs in cherry, floral and bear prints"
                fill
                priority
                sizes="(min-width: 768px) 480px, 88vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      <div className="scallop-edge" aria-hidden />

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-bark md:text-4xl">{t.featured.title}</h2>
          <Link href="/shop" className="text-sm font-semibold text-moss underline-offset-4 hover:underline">
            {t.featured.all}
          </Link>
        </div>
        <ProductGrid products={products} status={status} emptyText={t.shop.empty} />
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-10 rounded-[32px] bg-sage-soft/60 px-6 py-10 md:grid-cols-[0.8fr_1.2fr] md:px-12 md:py-14">
          <h2 className="font-display text-3xl text-moss md:text-4xl">{t.why.title}</h2>
          <ul className="space-y-6">
            {t.why.points.map((p) => (
              <li key={p.t} className="flex gap-4">
                <Leaf />
                <div>
                  <p className="text-lg font-semibold text-bark">{p.t}</p>
                  <p className="text-bark-soft">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="font-display text-3xl text-bark md:text-4xl">{t.how.title}</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-sage font-display text-lg text-moss">
                {num(i + 1)}
              </span>
              <p className="pt-2 text-lg text-bark">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="font-display text-3xl text-bark md:text-4xl">{t.reviews.title}</h2>
        <p className="mt-6 rounded-2xl border-2 border-dashed border-sage/50 px-6 py-8 text-center text-bark-soft">
          {t.reviews.placeholder}
        </p>
      </section>
    </>
  );
}
