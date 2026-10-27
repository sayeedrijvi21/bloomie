"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import { amountDue, type Order, type SettingsRow } from "@/admin/types";
import { btn, Page, PageHeader, Skeleton } from "@/admin/ui";

export default function InvoicePage() {
  return (
    <Suspense>
      <Invoice />
    </Suspense>
  );
}

function Invoice() {
  const no = useSearchParams().get("no");
  const { t, money, num, fill, productName, printName, districtName, lang } = useAdmin();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [settings, setSettings] = useState<SettingsRow | null>(null);

  useEffect(() => {
    if (!supabase || !no) return;
    supabase.from("orders").select("*, order_items(*)").eq("order_no", no).maybeSingle().then(({ data }) => setOrder((data as Order) ?? null));
    supabase.from("settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setSettings(data as SettingsRow));
  }, [no]);

  if (order === undefined) return <><PageHeader title={t.invoice.title} /><Page><Skeleton rows={3} /></Page></>;
  if (!order) return <><PageHeader title={t.invoice.title} /><Page><p className="text-center text-bark-soft">{t.order.notFound}</p></Page></>;

  const o = order;
  const due = amountDue(o);
  const date = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(o.created_at));
  const fb = settings?.facebook_url?.replace(/^https?:\/\/(www\.)?/, "") ?? "facebook.com/bloomiebd";

  return (
    <>
      <PageHeader
        title={t.invoice.title}
        action={<button onClick={() => window.print()} className={`${btn.primary} ${btn.small}`}>{t.invoice.print}</button>}
      />
      <Page>
        <Link href={`/admin/order/?no=${o.order_no}`} className="no-print font-bold text-moss hover:underline">
          ← {fill(t.invoice.back, { no: o.order_no })}
        </Link>

        <article className="print-plain mx-auto grid w-full max-w-[720px] gap-7 rounded-md border border-sage/30 bg-white p-6 text-[#2c2d24] shadow-[0_10px_30px_rgba(59,60,48,0.08)] sm:p-11">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/images/logo.png" alt="" width={60} height={60} />
              <div>
                <p className="font-display text-2xl leading-none text-moss" lang="en">Bloomie</p>
                <p className="text-sm text-bark-soft">{t.invoice.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="font-display text-3xl">{t.invoice.title}</h2>
              <p className="text-sm text-bark-soft"><span lang="en">{o.order_no}</span><br />{date}</p>
            </div>
          </header>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-extrabold tracking-wide text-bark-soft">{t.invoice.billTo}</h3>
              <p>{o.customer_name}<br /><span className="tabular-nums">{o.phone}</span><br />{o.address}<br />{districtName(o.district)}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-extrabold tracking-wide text-bark-soft">{t.invoice.from}</h3>
              <p><span lang="en">Bloomie</span><br />{fb}<br />{t.invoice.deliveryLine}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage/40 text-left text-xs text-bark-soft">
                  <th className="pb-2 font-bold">{t.invoice.item}</th>
                  <th className="pb-2 text-right font-bold">{t.order.qty}</th>
                  <th className="pb-2 text-right font-bold">{t.invoice.unit}</th>
                  <th className="pb-2 text-right font-bold">{t.invoice.amount}</th>
                </tr>
              </thead>
              <tbody>
                {o.order_items.map((i) => (
                  <tr key={i.id} className="border-b border-sage/30 align-top">
                    <td className="py-2.5 pr-3">
                      {productName(i.product_id, i.product_name)}
                      {i.print && <span className="block text-bark-soft">{fill(t.order.printLabel, { print: printName(i.product_id, i.print) })}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{num(i.qty)}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(i.unit_price)}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto grid w-full max-w-[300px] gap-1.5 text-sm tabular-nums">
            <div className="flex justify-between"><dt>{t.order.subtotal}</dt><dd>{money(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>{t.order.delivery}</dt><dd>{money(o.delivery_charge)}</dd></div>
            <div className="flex justify-between border-t border-sage/40 pt-2 text-base font-extrabold"><dt>{t.order.total}</dt><dd>{money(o.total)}</dd></div>
            {o.advance_paid > 0 && o.payment_status !== "paid" && (
              <div className="flex justify-between"><dt>{t.invoice.advance}</dt><dd>− {money(o.advance_paid)}</dd></div>
            )}
          </dl>

          <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-sage-soft px-4 py-3 font-bold tabular-nums">
            <span>{o.payment_status === "paid" ? t.invoice.paid : o.payment_method === "cod" ? t.invoice.collect : t.invoice.payBkash}</span>
            <span>{money(due)}</span>
          </div>

          {(o.courier || o.tracking_no) && (
            <p className="text-sm text-bark-soft">
              {t.order.courier}: {o.courier ?? "—"} · {t.order.tracking}: <span className="tabular-nums">{o.tracking_no ?? "—"}</span>
            </p>
          )}

          <p className="border-t border-sage/30 pt-4 text-center text-sm text-bark-soft">{t.invoice.thanks}</p>
        </article>
      </Page>
    </>
  );
}
