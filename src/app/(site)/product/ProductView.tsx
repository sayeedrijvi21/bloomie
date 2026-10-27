"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { fill, useLang } from "@/i18n/LanguageProvider";
import { useShop } from "@/data/ShopDataProvider";
import { Price, ProductImage, StockTag } from "@/components/ui";

export default function ProductView() {
  const slug = useSearchParams().get("slug");
  const { getProduct, shop, status } = useShop();
  const { t, lang, num } = useLang();
  const [print, setPrint] = useState(0);
  const [qty, setQty] = useState(1);
  const product = getProduct(slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link href="/shop" className="text-sm font-semibold text-moss hover:underline">
          ← {t.product.back}
        </Link>
        {status === "loading" ? (
          <div aria-hidden className="mt-5 grid animate-pulse gap-8 motion-reduce:animate-none md:grid-cols-2 md:gap-12">
            <div className="aspect-square rounded-[32px] bg-linen" />
            <div className="space-y-4 pt-2">
              <div className="h-5 w-24 rounded-full bg-linen" />
              <div className="h-10 w-3/4 rounded-full bg-linen" />
              <div className="h-8 w-28 rounded-full bg-linen" />
              <div className="h-14 rounded-full bg-linen" />
            </div>
          </div>
        ) : (
          <p className="mt-10 rounded-2xl bg-linen px-6 py-8 text-center text-bark-soft">
            {status === "error" ? t.loadFailed : t.product.notFound}
          </p>
        )}
      </div>
    );
  }

  const soldOut = product.stock === "out";

  const info = [
    [t.product.material, t.product.materialValue],
    [t.product.size, product.size[lang]],
    [t.product.care, t.product.careValue],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <Link href="/shop" className="text-sm font-semibold text-moss hover:underline">
        ← {t.product.back}
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-[32px] bg-linen">
          <ProductImage product={product} sizes="(min-width: 768px) 50vw, 100vw" priority />
        </div>

        <div>
          <StockTag stock={product.stock} />
          <h1 className="mt-3 font-display text-4xl leading-tight text-bark">{product.name[lang]}</h1>
          <p className="mt-2 text-bark-soft">{product.short[lang]}</p>
          <Price value={product.price} className="mt-4 block font-display text-3xl text-moss" />
          {product.stock === "preorder" && (
            <p className="mt-2 text-sm text-cherry">
              {fill(t.shop.preorderNote, { days: num(shop.preorderDays) })}
            </p>
          )}

          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-bark">{t.product.choosePrint}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.prints.map((p, i) => (
                <button
                  key={p.en}
                  type="button"
                  onClick={() => setPrint(i)}
                  aria-pressed={print === i}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    print === i
                      ? "border-moss bg-moss text-milk"
                      : "border-sage/50 text-bark hover:border-moss"
                  }`}
                >
                  {p[lang]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <p className="text-sm font-semibold text-bark">{t.product.quantity}</p>
            <div className="mt-3 inline-flex items-center rounded-full border border-sage/50">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-11 w-11 text-xl text-moss"
                aria-label="−"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-semibold" aria-live="polite">
                {num(qty)}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="h-11 w-11 text-xl text-moss"
                aria-label="+"
              >
                +
              </button>
            </div>
          </div>

          {soldOut ? (
            <p className="mt-8 rounded-full bg-linen py-4 text-center font-semibold text-bark-soft">{t.stock.out}</p>
          ) : (
            <Link
              href={`/order?product=${product.slug}&print=${print}&qty=${qty}`}
              className="mt-8 block rounded-full bg-moss py-4 text-center text-lg font-semibold text-milk transition-colors hover:bg-bark"
            >
              {t.orderNow}
            </Link>
          )}

          <dl className="mt-8 divide-y divide-sage/25 border-y border-sage/25">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3 text-[15px]">
                <dt className="text-bark-soft">{k}</dt>
                <dd className="text-right text-bark">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-moss">{t.product.delivery}</p>
        </div>
      </div>
    </div>
  );
}
