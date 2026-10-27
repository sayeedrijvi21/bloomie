"use client";

import Link from "next/link";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import type { ProductRow, StockStatus } from "@/admin/types";
import { btn, Icon, Page, PageHeader } from "@/admin/ui";
import { ProductThumb } from "@/admin/ProductThumb";

export default function ProductsPage() {
  const { t, lang, money, num, fill, toast, products, reloadProducts } = useAdmin();

  useEffect(() => {
    reloadProducts();
  }, [reloadProducts]);

  async function setStock(p: ProductRow, stock: StockStatus) {
    if (!supabase) return;
    const { error } = await supabase.from("products").update({ stock }).eq("id", p.id);
    if (error) return toast(t.common.saveFailed);
    await reloadProducts();
    toast(`${lang === "bn" ? p.name_bn : p.name_en}: ${t.stock[stock]}`);
  }

  return (
    <>
      <PageHeader
        title={t.nav.products}
        action={
          <Link href="/admin/product/?new=1" className={`${btn.primary} ${btn.small}`}>
            <Icon name="plus" className="h-4 w-4" />
            {t.products.add}
          </Link>
        }
      />
      <Page>
        {products.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-sage/40 px-5 py-8 text-center text-bark-soft">{t.products.empty}</p>
        ) : (
          <div className="grid gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className={`grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3.5 rounded-2xl border border-sage/30 bg-white/80 p-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] ${p.is_active ? "" : "opacity-70"}`}
              >
                <ProductThumb p={p} />
                <div className="min-w-0">
                  <h3 className="font-bold">{lang === "bn" ? p.name_bn : p.name_en}</h3>
                  <p className="text-[13px] text-bark-soft">{lang === "bn" ? p.name_en : p.name_bn}</p>
                  <p className="text-[13px] tabular-nums text-bark-soft">
                    {money(p.price)} · {p.prints.length === 1 ? t.products.print1 : fill(t.products.prints, { n: num(p.prints.length) })}
                    {!p.is_active && <span className="ml-2 font-bold text-st-cancel">{t.products.hidden}</span>}
                  </p>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                  <select
                    aria-label={t.product.stock}
                    value={p.stock}
                    onChange={(e) => setStock(p, e.target.value as StockStatus)}
                    className="rounded-full border border-sage/60 bg-white px-3 py-1.5 text-[13px] font-bold"
                  >
                    {(["in", "preorder", "out"] as const).map((s) => <option key={s} value={s}>{t.stock[s]}</option>)}
                  </select>
                  <Link href={`/admin/product/?slug=${p.slug}`} className={`${btn.ghost} ${btn.small}`}>{t.products.edit}</Link>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-sm text-bark-soft">{t.products.note}</p>
      </Page>
    </>
  );
}
