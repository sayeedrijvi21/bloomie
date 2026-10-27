"use client";

import type { OrderSource, OrderStatus } from "./types";

const paths: Record<string, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /></>,
  orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  box: <><path d="m3 7.5 9-4.5 9 4.5v9L12 21l-9-4.5z" /><path d="m3 7.5 9 4.5 9-4.5M12 12v9" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  doc: <><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  fb: <path d="M14 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H8.3v3h2.6V21" />,
  ig: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /></>,
  msg: <path d="M4 18.5 5 15A8 8 0 1 1 8.5 19z" />,
  other: <><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>,
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

const statusStyle: Record<OrderStatus, string> = {
  new: "text-st-new bg-st-new-bg",
  confirmed: "text-st-conf bg-st-conf-bg",
  shipped: "text-st-ship bg-st-ship-bg",
  delivered: "text-st-done bg-st-done-bg",
  cancelled: "text-st-cancel bg-st-cancel-bg",
};

export function StatusPill({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold ${statusStyle[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

const sourceIcon: Record<OrderSource, string> = { website: "web", facebook: "fb", instagram: "ig", messenger: "msg", other: "other" };

export function SourceTag({ source, label }: { source: OrderSource; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-bark-soft">
      <Icon name={sourceIcon[source]} className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="no-print border-b border-sage/30 bg-milk/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <h1 className="font-display text-2xl text-bark md:text-[1.7rem]">{title}</h1>
        {action}
      </div>
    </header>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">{children}</div>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`grid min-w-0 gap-4 rounded-[20px] border border-sage/30 bg-white/80 p-[18px] ${className}`}>{children}</section>;
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl text-bark">{children}</h2>;
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-moss px-5 py-2.5 font-bold text-milk hover:bg-bark disabled:cursor-wait disabled:opacity-60",
  ghost: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-bold text-moss ring-[1.5px] ring-inset ring-moss/45 hover:bg-sage-soft disabled:opacity-60",
  danger: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-bold text-st-new ring-[1.5px] ring-inset ring-st-new/40 hover:bg-st-new-bg",
  small: "!px-3.5 !py-1.5 text-sm",
};

export const input =
  "w-full rounded-xl border border-sage/60 bg-white px-3.5 py-2.5 outline-none focus:border-moss focus:ring-2 focus:ring-moss/20";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-st-new">{error}</span> : hint ? <span className="mt-1 block text-xs text-bark-soft">{hint}</span> : null}
    </label>
  );
}

export function LoadError({ message, onRetry, label }: { message: string; onRetry: () => void; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sage/40 px-5 py-8 text-center text-bark-soft">
      <p>{message}</p>
      <button onClick={onRetry} className={`${btn.ghost} ${btn.small} mt-4`}>
        <Icon name="refresh" className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="grid animate-pulse gap-3 motion-reduce:animate-none">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-linen" />
      ))}
    </div>
  );
}
