"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { districts } from "@/data/districts";
import { useAdmin } from "@/admin/AdminProvider";
import type { OrderSource, SettingsRow } from "@/admin/types";
import { btn, Field, input, Page, PageHeader, Panel } from "@/admin/ui";

type Line = { slug: string; print: string; qty: number };
const SOURCES: OrderSource[] = ["facebook", "instagram", "messenger", "website", "other"];

export default function NewOrderPage() {
  const router = useRouter();
  const { t, lang, money, fill, toast, products, reloadCounts } = useAdmin();
  const sellable = products.filter((p) => p.is_active && p.stock !== "out");
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [source, setSource] = useState<OrderSource>("facebook");
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "", note: "", payment: "cod", advance: "0" });
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase?.from("settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setSettings(data as SettingsRow));
  }, []);

  useEffect(() => {
    if (!lines.length && sellable.length) setLines([{ slug: sellable[0].slug, print: sellable[0].prints[0]?.en ?? "", qty: 1 }]);
  }, [sellable, lines.length]);

  const sortedDistricts = useMemo(() => [...districts].sort((a, b) => a[lang].localeCompare(b[lang], lang)), [lang]);
  const bySlug = (slug: string) => products.find((p) => p.slug === slug);
  const subtotal = lines.reduce((a, l) => a + (bySlug(l.slug)?.price ?? 0) * l.qty, 0);
  const delivery = !form.district ? 0 : form.district === "Dhaka" ? settings?.delivery_inside_dhaka ?? 0 : settings?.delivery_outside_dhaka ?? 0;
  const total = subtotal + delivery;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    const phone = form.phone.replace(/[\s-]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const advance = Math.max(0, Math.round(Number(form.advance) || 0));
    const err = form.name.trim().length < 2 ? t.newOrder.errors.name
      : !/^01[3-9]\d{8}$/.test(phone) ? t.newOrder.errors.phone
      : form.address.trim().length < 5 ? t.newOrder.errors.address
      : !form.district ? t.newOrder.errors.district
      : advance > total ? t.newOrder.errors.advance : null;
    setError(err);
    if (err) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_place_order", {
      p_source: source,
      p_name: form.name.trim(),
      p_phone: phone,
      p_address: form.address.trim(),
      p_district: form.district,
      p_note: form.note.trim(),
      p_payment: form.payment,
      p_items: lines.map((l) => ({ slug: l.slug, print: l.print || null, qty: l.qty })),
      p_advance: advance,
    });
    setBusy(false);
    if (error || !data?.order_no) {
      console.error(error);
      setError(t.common.saveFailed);
      return;
    }
    toast(fill(t.newOrder.saved, { no: data.order_no }));
    reloadCounts();
    router.push(`/admin/order/?no=${data.order_no}`);
  }

  const segBtn = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-bold ${active ? "bg-moss text-milk" : "bg-white ring-1 ring-inset ring-sage/60"}`;

  return (
    <>
      <PageHeader title={t.newOrder.title} />
      <Page>
        <Link href="/admin/orders/" className="font-bold text-moss hover:underline">← {t.overview.allOrders}</Link>
        <form onSubmit={submit} noValidate className="grid max-w-2xl gap-4">
          <Panel>
            <div>
              <p className="mb-2 text-sm font-bold">{t.newOrder.source}</p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={segBtn(source === s)}>
                    {t.source[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.order.name}><input id="n-name" className={input} value={form.name} onChange={set("name")} /></Field>
              <Field label={t.order.phone}><input id="n-phone" className={input} inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label={t.order.address}><input id="n-address" className={input} value={form.address} onChange={set("address")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.order.district}>
                <select id="n-district" className={input} value={form.district} onChange={set("district")}>
                  <option value="">—</option>
                  {sortedDistricts.map((d) => <option key={d.en} value={d.en}>{d[lang]}</option>)}
                </select>
              </Field>
              <Field label={t.order.method}>
                <select id="n-pay" className={input} value={form.payment} onChange={set("payment")}>
                  <option value="cod">{t.order.cod}</option>
                  <option value="bkash">{t.order.bkash}</option>
                </select>
              </Field>
            </div>
          </Panel>

          <Panel>
            <p className="text-sm font-bold">{t.newOrder.items}</p>
            {lines.map((l, i) => {
              const p = bySlug(l.slug);
              return (
                <div key={i} className="grid gap-3 border-b border-sage/30 pb-4 sm:grid-cols-[1.6fr_1fr_5rem_auto] sm:items-end">
                  <Field label={t.newOrder.product}>
                    <select
                      className={input}
                      value={l.slug}
                      onChange={(e) => setLine(i, { slug: e.target.value, print: bySlug(e.target.value)?.prints[0]?.en ?? "" })}
                    >
                      {sellable.map((x) => <option key={x.slug} value={x.slug}>{lang === "bn" ? x.name_bn : x.name_en} · {money(x.price)}</option>)}
                    </select>
                  </Field>
                  <Field label={t.newOrder.print}>
                    <select className={input} value={l.print} onChange={(e) => setLine(i, { print: e.target.value })}>
                      {(p?.prints ?? []).map((pr) => <option key={pr.en} value={pr.en}>{lang === "bn" ? pr.bn : pr.en}</option>)}
                    </select>
                  </Field>
                  <Field label={t.newOrder.qty}>
                    <input type="number" min={1} max={20} className={input} value={l.qty} onChange={(e) => setLine(i, { qty: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
                  </Field>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="pb-2.5 text-sm font-bold text-st-new">
                      {t.newOrder.remove}
                    </button>
                  )}
                </div>
              );
            })}
            {sellable.length > 0 && (
              <button
                type="button"
                className="justify-self-start font-bold text-moss hover:underline"
                onClick={() => setLines((ls) => [...ls, { slug: sellable[0].slug, print: sellable[0].prints[0]?.en ?? "", qty: 1 }])}
              >
                + {t.newOrder.addItem}
              </button>
            )}
          </Panel>

          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.order.note}><input id="n-note" className={input} value={form.note} onChange={set("note")} /></Field>
              <Field label={t.order.advance} hint={t.order.advanceHint}>
                <input id="n-advance" type="number" min={0} className={input} value={form.advance} onChange={set("advance")} />
              </Field>
            </div>
            <dl className="grid gap-1.5 border-t border-sage/30 pt-3 text-sm tabular-nums">
              <div className="flex justify-between"><dt className="text-bark-soft">{t.order.subtotal}</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-bark-soft">{t.order.delivery}{form.district && ` (${form.district === "Dhaka" ? t.order.insideDhaka : t.order.outsideDhaka})`}</dt>
                <dd>{money(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-sage/30 pt-2 text-base font-extrabold"><dt>{t.order.total}</dt><dd>{money(total)}</dd></div>
            </dl>
            {error && <p role="alert" className="text-sm text-st-new">{error}</p>}
            <button type="submit" disabled={busy || !lines.length} className={`${btn.primary} py-3`}>
              {busy ? t.newOrder.saving : t.newOrder.save}
            </button>
          </Panel>
        </form>
      </Page>
    </>
  );
}
