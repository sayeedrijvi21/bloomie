"use client";

import type { ProductRow } from "./types";

export function ProductThumb({ p, size = 64 }: { p: Pick<ProductRow, "image_url">; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linen" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image_url || "/images/logo.png"} alt="" className={p.image_url ? "h-full w-full object-cover" : "h-3/5 w-3/5 object-contain opacity-50"} />
    </div>
  );
}
