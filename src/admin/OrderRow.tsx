"use client";

import Link from "next/link";
import { useAdmin } from "./AdminProvider";
import type { Order } from "./types";
import { SourceTag, StatusPill } from "./ui";

export function OrderRow({ order: o }: { order: Order }) {
  const { t, money, fmtDate, districtName } = useAdmin();
  return (
    <Link
      href={`/admin/order/?no=${o.order_no}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-2xl border border-sage/30 bg-white/80 px-4 py-3.5 hover:border-sage ${
        o.status === "new" ? "border-l-4 border-l-st-new" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-bark">{o.customer_name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-bark-soft">
          <span className="tabular-nums" lang="en">{o.order_no}</span>
          <span>{districtName(o.district)}</span>
          <SourceTag source={o.source} label={t.source[o.source]} />
        </p>
        <p className="text-[13px] text-bark-soft">{fmtDate(o.created_at)}</p>
      </div>
      <div className="grid content-start justify-items-end gap-1.5">
        <span className="font-extrabold tabular-nums">{money(o.total)}</span>
        <StatusPill status={o.status} label={t.status[o.status]} />
      </div>
    </Link>
  );
}
