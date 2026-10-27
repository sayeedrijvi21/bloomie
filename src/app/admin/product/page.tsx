"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { categories } from "@/data/products";
import { useAdmin } from "@/admin/AdminProvider";
import type { ProductRow, StockStatus } from "@/admin/types";
import { btn, Field, input, Page, PageHeader, Panel, PanelTitle, Skeleton } from "@/admin/ui";
import { ProductThumb } from "@/admin/ProductThumb";

export default function ProductPage() {
  return (
    <Suspense>
      <ProductEditor />
    </Suspense>
  );
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";

/** Shrink a phone photo to at most 1200px and JPEG before uploading. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85));
}

type Form = {
  name_en: string; name_bn: string; short_en: string; short_bn: string; size_en: string; size_bn: string;
  price: string; stock: StockStatus; category: string; image_url: string | null; prints: { en: string; bn: string }[];
};

const empty: Form = { name_en: "", name_bn: "", short_en: "", short_bn: "", size_en: "", size_bn: "", price: "", stock: "in", category: "bibs", image_url: null, prints: [{ en: "", bn: "" }] };

function ProductEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const isNew = params.get("new") === "1";
  const slug = params.get("slug");
  const { t, lang, toast, products, reloadProducts } = useAdmin();
  const existing = products.find((p) => p.slug === slug);
  const [form, setForm] = useState<Form | null>(isNew ? empty : null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && existing && !form) {
      setForm({
        name_en: existing.name_en, name_bn: existing.name_bn, short_en: existing.short_en, short_bn: existing.short_bn,
        size_en: existing.size_en, size_bn: existing.size_bn, price: String(existing.price), stock: existing.stock,
        category: existing.category, image_url: existing.image_url,
        prints: existing.prints.length ? existing.prints.map((p) => ({ ...p })) : [{ en: "", bn: "" }],
      });
    }
  }, [existing, form, isNew]);

  const title = isNew ? t.product.newTitle : existing ? (lang === "bn" ? existing.name_bn : existing.name_en) : "";

  if (!form) {
    return (
      <>
        <PageHeader title={title} />
        <Page>{products.length && !existing ? <p className="text-center text-bark-soft">{t.product.notFound}</p> : <Skeleton rows={3} />}</Page>
      </>
    );
  }

  const f = form;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...f, [k]: e.target.value });
  const setPrint = (i: number, k: "en" | "bn", v: string) => setForm({ ...f, prints: f.prints.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });

  async function upload(file: File) {
    if (!supabase) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await shrink(file);
      const path = `${slugify(f.name_en || "product")}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((cur) => (cur ? { ...cur, image_url: data.publicUrl } : cur));
    } catch (e) {
      console.error(e);
      setError(t.product.uploadFailed);
    }
    setUploading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    const prints = f.prints.map((p) => ({ en: p.en.trim(), bn: p.bn.trim() })).filter((p) => p.en || p.bn);
    const price = Number(f.price);
    const err = !f.name_en.trim() || !f.name_bn.trim() ? t.product.errors.name
      : !(price >= 0) || f.price === "" ? t.product.errors.price
      : !prints.length || prints.some((p) => !p.en || !p.bn) ? t.product.errors.prints : null;
    setError(err);
    if (err) return;
    const row = {
      name_en: f.name_en.trim(), name_bn: f.name_bn.trim(), short_en: f.short_en.trim(), short_bn: f.short_bn.trim(),
      size_en: f.size_en.trim(), size_bn: f.size_bn.trim(), price: Math.round(price), stock: f.stock,
      category: f.category, image_url: f.image_url, prints,
    };
    setBusy(true);
    const res = isNew
      ? await supabase.from("products").insert({ ...row, slug: slugify(row.name_en), sort_order: products.length + 1 })
      : await supabase.from("products").update(row).eq("id", existing!.id);
    setBusy(false);
    if (res.error) {
      console.error(res.error);
      setError(res.error.code === "23505" ? t.product.errors.slugTaken : t.common.saveFailed);
      return;
    }
    await reloadProducts();
    toast(t.product.saved);
    router.push("/admin/products/");
  }

  async function toggleActive(p: ProductRow) {
    if (!supabase) return;
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast(t.common.saveFailed);
    await reloadProducts();
    toast(p.is_active ? t.product.hide : t.product.show);
  }

  return (
    <>
      <PageHeader title={title} />
      <Page>
        <Link href="/admin/products/" className="font-bold text-moss hover:underline">← {t.nav.products}</Link>
        <form onSubmit={save} noValidate className="grid max-w-2xl gap-4">
          <Panel>
            <div className="grid grid-cols-[96px_1fr] items-center gap-4 rounded-2xl border-2 border-dashed border-sage/40 p-3">
              <ProductThumb p={{ image_url: f.image_url }} size={96} />
              <div>
                <p className="font-bold">{t.product.photo}</p>
                <p className="text-sm text-bark-soft">{uploading ? t.product.uploading : t.product.photoHint}</p>
                <label className={`${btn.ghost} ${btn.small} mt-2 cursor-pointer`}>
                  {t.product.choose}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) upload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.product.nameEn}><input id="p-name-en" className={input} value={f.name_en} onChange={set("name_en")} /></Field>
              <Field label={t.product.nameBn}><input id="p-name-bn" className={input} lang="bn" value={f.name_bn} onChange={set("name_bn")} /></Field>
              <Field label={t.product.shortEn}><input id="p-short-en" className={input} value={f.short_en} onChange={set("short_en")} /></Field>
              <Field label={t.product.shortBn}><input id="p-short-bn" className={input} lang="bn" value={f.short_bn} onChange={set("short_bn")} /></Field>
              <Field label={t.product.sizeEn}><input id="p-size-en" className={input} value={f.size_en} onChange={set("size_en")} /></Field>
              <Field label={t.product.sizeBn}><input id="p-size-bn" className={input} lang="bn" value={f.size_bn} onChange={set("size_bn")} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t.product.price}><input id="p-price" type="number" min={0} className={input} value={f.price} onChange={set("price")} /></Field>
              <Field label={t.product.stock}>
                <select id="p-stock" className={input} value={f.stock} onChange={set("stock")}>
                  {(["in", "preorder", "out"] as const).map((s) => <option key={s} value={s}>{t.stock[s]}</option>)}
                </select>
              </Field>
              <Field label={t.product.category}>
                <select id="p-category" className={input} value={f.category} onChange={set("category")}>
                  {[...new Set([...categories, f.category])].map((c) => <option key={c} value={c}>{t.categories[c] ?? c}</option>)}
                </select>
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>{t.product.prints}</PanelTitle>
            {f.prints.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input aria-label={`${t.product.prints} ${i + 1} ${t.product.printEn}`} placeholder={t.product.printEn} className={input} value={p.en} onChange={(e) => setPrint(i, "en", e.target.value)} />
                <input aria-label={`${t.product.prints} ${i + 1} ${t.product.printBn}`} placeholder={t.product.printBn} lang="bn" className={input} value={p.bn} onChange={(e) => setPrint(i, "bn", e.target.value)} />
                <button
                  type="button"
                  aria-label={t.product.removePrint}
                  disabled={f.prints.length === 1}
                  onClick={() => setForm({ ...f, prints: f.prints.filter((_, j) => j !== i) })}
                  className="w-9 text-xl text-bark-soft disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="justify-self-start font-bold text-moss hover:underline" onClick={() => setForm({ ...f, prints: [...f.prints, { en: "", bn: "" }] })}>
              + {t.product.addPrint}
            </button>
          </Panel>

          {error && <p role="alert" className="text-sm text-st-new">{error}</p>}
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={busy || uploading} className={btn.primary}>{busy ? t.common.saving : t.product.save}</button>
            {existing && (
              <button type="button" onClick={() => toggleActive(existing)} className={existing.is_active ? btn.danger : btn.ghost}>
                {existing.is_active ? t.product.hide : t.product.show}
              </button>
            )}
          </div>
        </form>
      </Page>
    </>
  );
}
