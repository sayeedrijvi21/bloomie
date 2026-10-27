"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import { amountDue, NEXT_STATUS, type Order, type OrderStatus } from "@/admin/types";
import { btn, Field, Icon, input, LoadError, Page, PageHeader, Panel, PanelTitle, Skeleton, SourceTag, StatusPill } from "@/admin/ui";

export default function OrderPage() {
  return (
    <Suspense>
      <OrderDetail />
    </Suspense>
  );
}

const FLOW: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];
const COURIERS = ["Steadfast", "Pathao", "RedX", "Sundarban", "Paperfly", "eCourier"];

function OrderDetail() {
  const no = useSearchParams().get("no");
  const { t, money, num, fmtDate, fill, toast, productName, printName, districtName, reloadCounts } = useAdmin();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", note: "", courier: "", tracking_no: "", advance_paid: "0" });
  const [formError, setFormError] = useState<string | null>(null);

  const fillForm = (o: Order) =>
    setForm({
      customer_name: o.customer_name,
      phone: o.phone,
      address: o.address,
      note: o.note ?? "",
      courier: o.courier ?? "",
      tracking_no: o.tracking_no ?? "",
      advance_paid: String(o.advance_paid),
    });

  const load = useCallback(async () => {
    if (!supabase || !no) return setOrder(null);
    setFailed(false);
    const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("order_no", no).maybeSingle();
    if (error) return setFailed(true);
    setOrder(data as Order | null);
    if (data) fillForm(data as Order);
  }, [no]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(patch: Partial<Order>, message: string) {
    if (!supabase || !order) return false;
    setBusy(true);
    const { data, error } = await supabase.from("orders").update(patch).eq("id", order.id).select("*, order_items(*)").single();
    setBusy(false);
    if (error) {
      console.error(error);
      toast(t.common.saveFailed);
      return false;
    }
    setOrder(data as Order);
    fillForm(data as Order);
    toast(message);
    reloadCounts();
    return true;
  }

  if (failed) return <Wrap title={no ?? ""}><LoadError message={t.common.loadFailed} onRetry={load} label={t.common.refresh} /></Wrap>;
  if (order === undefined) return <Wrap title={no ?? ""}><Skeleton rows={4} /></Wrap>;
  if (order === null) return <Wrap title={no ?? ""}><p className="rounded-2xl bg-linen px-5 py-8 text-center text-bark-soft">{t.order.notFound}</p></Wrap>;

  const o = order;
  const next = NEXT_STATUS[o.status];
  const at = FLOW.indexOf(o.status);
  const due = amountDue(o);
  const paymentLabel = o.payment_status === "paid" ? t.order.paidFull : o.advance_paid > 0 ? t.order.partPaid : t.order.notPaid;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const phone = form.phone.replace(/[\s-]/g, "");
    const advance = Math.max(0, Math.round(Number(form.advance_paid) || 0));
    if (form.customer_name.trim().length < 2) return setFormError(t.newOrder.errors.name);
    if (!/^01[3-9]\d{8}$/.test(phone)) return setFormError(t.newOrder.errors.phone);
    if (form.address.trim().length < 5) return setFormError(t.newOrder.errors.address);
    if (advance > o.total) return setFormError(t.newOrder.errors.advance);
    setFormError(null);
    await update(
      {
        customer_name: form.customer_name.trim(),
        phone,
        address: form.address.trim(),
        note: form.note.trim() || null,
        courier: form.courier.trim() || null,
        tracking_no: form.tracking_no.trim() || null,
        advance_paid: advance,
      },
      t.order.detailsSaved,
    );
  }

  return (
    <Wrap title={o.order_no}>
      <Link href="/admin/orders/" className="font-bold text-moss hover:underline">← {t.overview.allOrders}</Link>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid min-w-0 gap-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusPill status={o.status} label={t.status[o.status]} />
                <SourceTag source={o.source} label={t.source[o.source]} />
              </div>
              <span className="text-sm text-bark-soft">{fmtDate(o.created_at)}</span>
            </div>

            {o.status !== "cancelled" && (
              <ol className="flex" aria-label={t.status[o.status]}>
                {FLOW.map((s, i) => (
                  <li key={s} className={`relative flex-1 pt-5 text-center text-[11px] font-bold ${i <= at ? "text-moss" : "text-bark-soft"}`}>
                    {i > 0 && <span className={`absolute left-[-50%] top-2 h-0.5 w-full ${i <= at ? "bg-moss" : "bg-sage/30"}`} />}
                    <span className={`absolute left-1/2 top-1 z-10 -ml-[5px] h-2.5 w-2.5 rounded-full ring-2 ${i <= at ? "bg-moss ring-moss" : "bg-linen ring-sage/40"}`} />
                    {t.status[s]}
                  </li>
                ))}
              </ol>
            )}

            {o.status === "new" && <p className="text-sm text-bark-soft">{t.order.callFirst}</p>}
            {o.status === "confirmed" && <p className="text-sm text-bark-soft">{t.order.shipHint}</p>}

            {askCancel ? (
              <div className="grid gap-3 rounded-xl bg-st-new-bg p-4">
                <p className="font-bold text-st-new">{t.order.confirmCancel}</p>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} className={btn.danger + " bg-white"} onClick={async () => { if (await update({ status: "cancelled" }, fill(t.order.marked, { no: o.order_no, status: t.status.cancelled }))) setAskCancel(false); }}>
                    {t.order.yesCancel}
                  </button>
                  <button className={btn.ghost} onClick={() => setAskCancel(false)}>{t.order.keep}</button>
                </div>
              </div>
            ) : (
              (next || o.status === "new" || o.status === "confirmed" || o.status === "shipped") && (
                <div className="flex flex-wrap gap-2.5">
                  {next && (
                    <button
                      disabled={busy}
                      className={btn.primary}
                      onClick={() =>
                        update(
                          next === "delivered" ? { status: next, payment_status: "paid" } : { status: next },
                          fill(t.order.marked, { no: o.order_no, status: t.status[next] }),
                        )
                      }
                    >
                      {t.order.next[o.status]}
                    </button>
                  )}
                  <button className={btn.danger} onClick={() => setAskCancel(true)}>{t.order.cancelOrder}</button>
                </div>
              )
            )}
          </Panel>

          <Panel>
            <PanelTitle>{t.order.items}</PanelTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sage/30 text-left text-xs text-bark-soft">
                    <th className="pb-2 font-bold">{t.order.product}</th>
                    <th className="pb-2 text-right font-bold">{t.order.qty}</th>
                    <th className="pb-2 text-right font-bold">{t.order.price}</th>
                    <th className="pb-2 text-right font-bold">{t.order.total}</th>
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
            <dl className="grid gap-1.5 text-sm tabular-nums">
              <Row k={t.order.subtotal} v={money(o.subtotal)} />
              <Row k={`${t.order.delivery} (${o.district === "Dhaka" ? t.order.insideDhaka : t.order.outsideDhaka})`} v={money(o.delivery_charge)} />
              <Row k={t.order.total} v={money(o.total)} strong />
              {o.advance_paid > 0 && o.payment_status !== "paid" && <Row k={t.invoice.advance} v={`− ${money(o.advance_paid)}`} />}
              {o.status !== "cancelled" && <Row k={o.payment_status === "paid" ? t.order.paidFull : t.order.due} v={money(due)} strong />}
            </dl>
          </Panel>
        </div>

        <div className="grid min-w-0 gap-4">
          <Panel>
            <PanelTitle>{t.order.payment}</PanelTitle>
            <dl className="grid gap-2 text-sm">
              <Row k={t.order.method} v={o.payment_method === "cod" ? t.order.cod : t.order.bkash} />
              <Row k={t.order.paymentStatus} v={paymentLabel} />
            </dl>
            {o.payment_status !== "paid" && o.status !== "cancelled" && (
              <button disabled={busy} className={btn.ghost} onClick={() => update({ payment_status: "paid" }, t.order.paidFull)}>
                {t.order.markPaid}
              </button>
            )}
          </Panel>

          <Panel>
            <PanelTitle>{t.order.editDetails}</PanelTitle>
            <form onSubmit={saveDetails} className="grid gap-3.5" noValidate>
              <Field label={t.order.name}><input id="o-name" className={input} value={form.customer_name} onChange={set("customer_name")} /></Field>
              <Field label={t.order.phone}>
                <div className="flex gap-2">
                  <input id="o-phone" className={input} inputMode="tel" value={form.phone} onChange={set("phone")} />
                  <button
                    type="button"
                    className={`${btn.ghost} ${btn.small}`}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(o.phone);
                        toast(t.common.copied);
                      } catch {
                        (document.getElementById("o-phone") as HTMLInputElement)?.select();
                      }
                    }}
                  >
                    {t.common.copy}
                  </button>
                </div>
              </Field>
              <Field label={t.order.address}><textarea id="o-address" rows={2} className={input} value={form.address} onChange={set("address")} /></Field>
              <p className="text-sm"><span className="text-bark-soft">{t.order.district}: </span>{districtName(o.district)}</p>
              <Field label={t.order.note}><textarea id="o-note" rows={2} className={input} value={form.note} onChange={set("note")} /></Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label={t.order.courier} hint={t.order.courierHint}>
                  <input id="o-courier" className={input} list="couriers" value={form.courier} onChange={set("courier")} />
                  <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label={t.order.tracking}><input id="o-tracking" className={input} value={form.tracking_no} onChange={set("tracking_no")} /></Field>
              </div>
              <Field label={t.order.advance} hint={t.order.advanceHint}>
                <input id="o-advance" type="number" min={0} max={o.total} className={input} value={form.advance_paid} onChange={set("advance_paid")} />
              </Field>
              {formError && <p role="alert" className="text-sm text-st-new">{formError}</p>}
              <button type="submit" disabled={busy} className={btn.primary}>{busy ? t.common.saving : t.common.save}</button>
            </form>
          </Panel>

          <Link href={`/admin/invoice/?no=${o.order_no}`} className={`${btn.primary} w-full py-3`}>
            <Icon name="doc" className="h-5 w-5" />
            {t.order.invoice}
          </Link>
        </div>
      </div>
    </Wrap>
  );
}

function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <Page>{children}</Page>
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-sage/30 pt-2 text-base font-extrabold" : ""}`}>
      <dt className={strong ? "" : "text-bark-soft"}>{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
