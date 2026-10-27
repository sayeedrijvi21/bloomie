"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import type { Product, Stock } from "@/data/products";

/** Petal outline taken from the bib's scalloped edge: 10 rounded lobes. */
const petalPath = (() => {
  const pts: string[] = [];
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.5 * (0.86 + 0.14 * Math.abs(Math.cos(5 * a)));
    pts.push(`${(0.5 + r * Math.cos(a)).toFixed(4)},${(0.5 + r * Math.sin(a)).toFixed(4)}`);
  }
  return `M${pts.join("L")}Z`;
})();

export function PetalClip() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <clipPath id="petal" clipPathUnits="objectBoundingBox">
        <path d={petalPath} />
      </clipPath>
    </svg>
  );
}

export function StockTag({ stock }: { stock: Stock }) {
  const { t } = useLang();
  const style =
    stock === "in"
      ? "bg-sage-soft text-moss"
      : stock === "preorder"
        ? "bg-milk text-cherry ring-1 ring-cherry/40"
        : "bg-bark text-milk";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {t.stock[stock]}
    </span>
  );
}

export function ProductImage({ product, sizes, priority }: { product: Product; sizes: string; priority?: boolean }) {
  const { t, lang } = useLang();
  if (!product.image) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-linen text-bark-soft">
        <Image src="/images/logo.png" alt="" width={72} height={72} className="opacity-60" />
        <span className="text-sm">{t.photoSoon}</span>
      </div>
    );
  }
  return (
    <Image
      src={product.image}
      alt={product.name[lang]}
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}

export function Price({ value, className = "" }: { value: number; className?: string }) {
  const { num } = useLang();
  return <span className={className}>৳{"\u00a0"}{num(value)}</span>;
}

export function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const soldOut = product.stock === "out";
  return (
    <article className="group flex flex-col">
      <Link
        href={`/product/?slug=${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-[28px] bg-linen"
      >
        <ProductImage product={product} sizes="(min-width: 1024px) 25vw, 50vw" />
        <span className="absolute left-3 top-3">
          <StockTag stock={product.stock} />
        </span>
      </Link>
      <div className="mt-3 flex flex-1 flex-col px-1">
        <h3 className="font-display text-lg leading-snug text-bark">
          <Link href={`/product/?slug=${product.slug}`} className="hover:text-moss">
            {product.name[lang]}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-bark-soft">{product.short[lang]}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Price value={product.price} className="whitespace-nowrap font-semibold text-bark" />
          {soldOut ? (
            <span className="text-sm text-bark-soft">{t.stock.out}</span>
          ) : (
            <Link
              href={`/order?product=${product.slug}`}
              className="whitespace-nowrap rounded-full bg-moss px-3.5 py-2 text-sm font-semibold text-milk transition-colors hover:bg-bark sm:px-4"
            >
              {t.orderNow}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function MessengerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.88c.17-.07.36-.09.53-.04.91.25 1.88.39 2.91.39 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
    </svg>
  );
}

function CardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse motion-reduce:animate-none">
      <div className="aspect-square rounded-[28px] bg-linen" />
      <div className="mt-4 h-5 w-3/4 rounded-full bg-linen" />
      <div className="mt-2 h-4 w-1/2 rounded-full bg-linen" />
      <div className="mt-5 h-9 rounded-full bg-linen" />
    </div>
  );
}

/** Product grid with loading placeholders and a load-failure message. */
export function ProductGrid({ products, status, emptyText }: { products: Product[]; status: "loading" | "ready" | "error"; emptyText?: string }) {
  const { t } = useLang();
  if (status === "error") {
    return <p className="mt-8 rounded-2xl bg-linen px-6 py-8 text-center text-bark-soft">{t.loadFailed}</p>;
  }
  if (status === "ready" && products.length === 0) {
    return <p className="mt-12 text-center text-bark-soft">{emptyText}</p>;
  }
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4" aria-busy={status === "loading"}>
      {status === "loading"
        ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)
        : products.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  );
}
