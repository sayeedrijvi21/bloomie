"use client";

import { useState } from "react";
import { fill, useLang } from "@/i18n/LanguageProvider";
import { categories } from "@/data/products";
import { useShop } from "@/data/ShopDataProvider";
import { ProductGrid } from "@/components/ui";

type Cat = "all" | (typeof categories)[number];
const cats: Cat[] = ["all", ...categories];

export default function ShopPage() {
  const { t, num } = useLang();
  const { products, shop, status } = useShop();
  const [cat, setCat] = useState<Cat>("all");
  const list = cat === "all" ? products : products.filter((p) => p.category === cat);
  const hasPreorder = list.some((p) => p.stock === "preorder");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="font-display text-4xl text-bark md:text-5xl">{t.shop.title}</h1>
      <p className="mt-3 text-lg text-bark-soft">{t.shop.sub}</p>

      <div className="-mx-4 mt-8 overflow-x-auto px-4" role="group" aria-label={t.nav.shop}>
        <div className="flex gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                cat === c ? "bg-moss text-milk" : "bg-linen text-bark-soft hover:text-bark"
              }`}
            >
              {t.shop.cats[c]}
            </button>
          ))}
        </div>
      </div>

      <ProductGrid products={list} status={status} emptyText={t.shop.empty} />

      {hasPreorder && (
        <p className="mt-10 text-sm text-bark-soft">
          {fill(t.shop.preorderNote, { days: num(shop.preorderDays) })}
        </p>
      )}
    </div>
  );
}
