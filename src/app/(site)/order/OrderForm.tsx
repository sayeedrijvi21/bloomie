"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fill, useLang } from "@/i18n/LanguageProvider";
import { useShop } from "@/data/ShopDataProvider";
import { supabase } from "@/lib/supabase";
import { districts } from "@/data/districts";
import { Price, ProductImage } from "@/components/ui";

type Errors = Partial<Record<"name" | "phone" | "address" | "district", string>>;

const toAsciiDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export default function OrderForm() {
  const params = useSearchParams();
  const { t, lang, num } = useLang();
  const { getProduct, products, shop, status } = useShop();
  const product = getProduct(params.get("product")) ?? products[0];

  const [print, setPrint] = useState(Number(params.get("print") ?? 0) || 0);
  const [qty, setQty] = useState(Math.max(1, Number(params.get("qty") ?? 1) || 1));
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "", note: "" });
  const [payment, setPayment] = useState<"cod" | "bkash">("cod");
  const [errors, setErrors] = useState<Errors>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const deliveryCharge = form.district === "Dhaka" ? shop.delivery.insideDhaka : shop.delivery.outsideDhaka;
  const subtotal = (product?.price ?? 0) * qty;
  const sortedDistricts = useMemo(
    () => [...districts].sort((a, b) => a[lang].localeCompare(b[lang], lang)),
    [lang],
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product || sending) return;
    setSubmitError(null);
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = t.order.errors.name;
    if (!/^01[3-9]\d{8}$/.test(toAsciiDigits(form.phone.replace(/[\s-]/g, "")))) next.phone = t.order.errors.phone;
    if (form.address.trim().length < 8) next.address = t.order.errors.address;
    if (!form.district) next.district = t.order.errors.district;
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`f-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    if (!supabase) {
      setSubmitError(t.order.failed);
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_name: form.name.trim(),
      p_phone: toAsciiDigits(form.phone.replace(/[\s-]/g, "")),
      p_address: form.address.trim(),
      p_district: form.district,
      p_note: form.note.trim(),
      p_payment: payment,
      p_items: [{ slug: product.slug, print: product.prints[print]?.en ?? null, qty }],
    });
    setSending(false);
    if (error || !data?.order_no) {
      console.error("place_order failed", error);
      setSubmitError(error?.message?.toLowerCase().includes("sold out") ? t.order.soldOut : t.order.failed);
      return;
    }
    setOrderId(data.order_no);
    window.scrollTo({ top: 0 });
  }

  if (orderId) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-3xl text-moss">✓</div>
        <h1 className="mt-6 font-display text-3xl text-bark">{t.order.thanksTitle}</h1>
        <p className="mt-3 text-lg text-bark-soft">{fill(t.order.thanksBody, { id: num(orderId) })}</p>
        <Link
          href="/shop"
          className="mt-8 inline-block rounded-full bg-moss px-7 py-3.5 font-semibold text-milk hover:bg-bark"
        >
          {t.order.keepShopping}
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <h1 className="font-display text-4xl text-bark">{t.order.title}</h1>
        {status === "loading" ? (
          <div aria-hidden className="mt-8 h-64 animate-pulse rounded-[28px] bg-linen motion-reduce:animate-none" />
        ) : (
          <p className="mt-8 rounded-2xl bg-linen px-6 py-8 text-center text-bark-soft">
            {status === "error" ? t.loadFailed : t.product.notFound}
          </p>
        )}
      </div>
    );
  }

  const field = "mt-1.5 w-full rounded-xl border bg-white/70 px-4 py-3 text-base text-bark outline-none focus:border-moss";
  const border = (k: keyof Errors) => (errors[k] ? "border-cherry" : "border-sage/50");
  const Err = ({ k }: { k: keyof Errors }) =>
    errors[k] ? <p className="mt-1 text-sm text-cherry">{errors[k]}</p> : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="font-display text-4xl text-bark">{t.order.title}</h1>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-10 md:grid-cols-[1fr_380px] md:items-start">
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-bark">{t.order.details}</h2>
          <label className="block">
            <span className="text-sm font-semibold">{t.order.name}</span>
            <input id="f-name" className={`${field} ${border("name")}`} value={form.name} onChange={set("name")} autoComplete="name" />
            <Err k="name" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{t.order.phone}</span>
            <input
              id="f-phone"
              className={`${field} ${border("phone")}`}
              value={form.phone}
              onChange={set("phone")}
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
            />
            {errors.phone ? <Err k="phone" /> : <p className="mt-1 text-sm text-bark-soft">{t.order.phoneHint}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{t.order.address}</span>
            <textarea id="f-address" rows={3} className={`${field} ${border("address")}`} value={form.address} onChange={set("address")} autoComplete="street-address" />
            <Err k="address" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{t.order.district}</span>
            <select id="f-district" className={`${field} ${border("district")}`} value={form.district} onChange={set("district")}>
              <option value="">—</option>
              {sortedDistricts.map((d) => (
                <option key={d.en} value={d.en}>
                  {d[lang]}
                </option>
              ))}
            </select>
            <Err k="district" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{t.order.note}</span>
            <textarea rows={2} className={`${field} border-sage/50`} value={form.note} onChange={set("note")} />
          </label>

          <fieldset>
            <legend className="text-lg font-semibold text-bark">{t.order.payment}</legend>
            <div className="mt-3 space-y-3">
              {(shop.bkashNumber ? (["cod", "bkash"] as const) : (["cod"] as const)).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === m ? "border-moss bg-sage-soft/50" : "border-sage/40"}`}
                >
                  <input type="radio" name="payment" checked={payment === m} onChange={() => setPayment(m)} className="mt-1 accent-[var(--moss)]" />
                  <span>
                    <span className="font-semibold">{m === "cod" ? t.order.cod : t.order.bkash}</span>
                    {m === "bkash" && payment === "bkash" && (
                      <span className="mt-1 block text-sm text-bark-soft">
                        {fill(t.order.bkashSend, { number: shop.bkashNumber })}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="rounded-[28px] bg-linen p-5 md:sticky md:top-24">
          <div className="flex gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-milk">
              <ProductImage product={product} sizes="96px" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg leading-snug">{product.name[lang]}</p>
              <select
                aria-label={t.product.choosePrint}
                value={print}
                onChange={(e) => setPrint(Number(e.target.value))}
                className="mt-1 rounded-lg border border-sage/50 bg-milk px-2 py-1 text-sm"
              >
                {product.prints.map((p, i) => (
                  <option key={p.en} value={i}>
                    {p[lang]}
                  </option>
                ))}
              </select>
              <div className="mt-2 inline-flex items-center rounded-full border border-sage/50 bg-milk">
                <button type="button" className="h-8 w-8 text-moss" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">−</button>
                <span className="w-7 text-center font-semibold">{num(qty)}</span>
                <button type="button" className="h-8 w-8 text-moss" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="+">+</button>
              </div>
            </div>
          </div>

          <dl className="mt-5 space-y-2 border-t border-sage/30 pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-bark-soft">{t.order.subtotal}</dt>
              <dd><Price value={subtotal} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-bark-soft">
                {t.order.delivery}
                <span className="block text-xs">
                  {form.district === "Dhaka" ? t.order.insideDhaka : t.order.outsideDhaka}
                </span>
              </dt>
              <dd><Price value={deliveryCharge} /></dd>
            </div>
            <div className="flex justify-between border-t border-sage/30 pt-3 text-lg font-semibold">
              <dt>{t.order.total}</dt>
              <dd className="text-moss"><Price value={subtotal + deliveryCharge} /></dd>
            </div>
          </dl>

          {submitError && (
            <p role="alert" className="mt-5 rounded-xl border border-cherry/40 bg-milk px-4 py-3 text-sm text-cherry">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            aria-busy={sending}
            className="mt-5 w-full rounded-full bg-moss py-4 text-lg font-semibold text-milk transition-colors hover:bg-bark disabled:cursor-wait disabled:opacity-70"
          >
            {sending ? t.order.sending : t.order.confirm}
          </button>
        </aside>
      </form>
    </div>
  );
}
