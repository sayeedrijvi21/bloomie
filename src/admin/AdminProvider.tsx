"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/i18n/LanguageProvider";
import adminEn, { type AdminDict } from "./i18n/en";
import adminBn from "./i18n/bn";
import type { ProductRow } from "./types";
import { districts } from "@/data/districts";
import { Icon } from "./ui";

type Ctx = {
  t: AdminDict;
  lang: "en" | "bn";
  num: (n: number | string) => string;
  money: (n: number) => string;
  fmtDate: (iso: string) => string;
  fill: (s: string, vars: Record<string, string | number>) => string;
  toast: (msg: string) => void;
  products: ProductRow[];
  reloadProducts: () => Promise<void>;
  productName: (id: string | null, fallback: string) => string;
  printName: (id: string | null, print: string) => string;
  districtName: (en: string) => string;
  newCount: number;
  reloadCounts: () => Promise<void>;
};

const AdminContext = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { lang, num, toggle } = useLang();
  const t = lang === "bn" ? adminBn : adminEn;
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      setIsAdmin(null);
      return;
    }
    supabase.rpc("is_admin").then(({ data, error }) => setIsAdmin(!error && data === true));
  }, [session]);

  const reloadProducts = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("products").select("*").order("sort_order").order("created_at");
    if (data) setProducts(data as ProductRow[]);
  }, []);

  const reloadCounts = useCallback(async () => {
    if (!supabase) return;
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new");
    setNewCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    reloadProducts();
    reloadCounts();
    const onVisible = () => document.visibilityState === "visible" && reloadCounts();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isAdmin, reloadProducts, reloadCounts]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  const money = (n: number) => "৳ " + num(n);
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Dhaka",
    }).format(new Date(iso));
  const fill = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  const productName = (id: string | null, fallback: string) => {
    const p = id ? products.find((x) => x.id === id) : undefined;
    return p ? (lang === "bn" ? p.name_bn : p.name_en) : fallback;
  };

  const printName = (id: string | null, print: string) => {
    if (lang === "en") return print;
    const p = id ? products.find((x) => x.id === id) : undefined;
    return p?.prints.find((x) => x.en === print)?.bn ?? print;
  };
  const districtName = (en: string) => (lang === "bn" ? districts.find((d) => d.en === en)?.bn ?? en : en);

  const ctx: Ctx = { t, lang, num, money, fmtDate, fill, toast, products, reloadProducts, productName, printName, districtName, newCount, reloadCounts };

  if (session === undefined || (session && isAdmin === null)) {
    return <FullScreen><p className="text-bark-soft">{t.common.loading}</p></FullScreen>;
  }
  if (!session) return <SignIn t={t} onToggle={toggle} />;
  if (!isAdmin) {
    return (
      <FullScreen>
        <div className="w-full max-w-sm space-y-5 rounded-3xl bg-white/80 p-7 text-center">
          <p className="text-bark">{t.auth.notAdmin}</p>
          <button onClick={() => supabase?.auth.signOut()} className="rounded-full bg-moss px-5 py-2.5 font-semibold text-milk">
            {t.auth.signOut}
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <AdminContext.Provider value={ctx}>
      <Shell email={session.user.email ?? ""} onToggle={toggle}>
        {children}
      </Shell>
      {toastMsg && (
        <div
          role="status"
          className="no-print fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-bark px-5 py-2.5 text-sm font-semibold text-milk shadow-lg md:bottom-8"
        >
          {toastMsg}
        </div>
      )}
    </AdminContext.Provider>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-linen px-4">{children}</div>;
}

function SignIn({ t, onToggle }: { t: AdminDict; onToggle: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(true);
  }

  return (
    <FullScreen>
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl bg-white/85 p-7 shadow-[0_10px_30px_rgba(59,60,48,0.08)]">
        <div className="flex justify-end">
          <button type="button" onClick={onToggle} className="rounded-full border border-moss/40 px-3 py-1 text-sm font-semibold text-moss">
            {t.langSwitch}
          </button>
        </div>
        <Image src="/images/logo.png" alt="Bloomie" width={72} height={72} className="mx-auto" />
        <div className="text-center">
          <h1 className="font-display text-2xl">{t.appName}</h1>
          <p className="mt-1 text-sm text-bark-soft">{t.auth.sub}</p>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">{t.auth.email}</span>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sage/60 bg-white px-4 py-3 outline-none focus:border-moss"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">{t.auth.password}</span>
          <input
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sage/60 bg-white px-4 py-3 outline-none focus:border-moss"
          />
        </label>
        {error && <p role="alert" className="text-sm text-cherry">{t.auth.failed}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-moss py-3.5 font-semibold text-milk hover:bg-bark disabled:opacity-70">
          {busy ? t.auth.signingIn : t.auth.submit}
        </button>
      </form>
    </FullScreen>
  );
}

function Shell({ children, email, onToggle }: { children: React.ReactNode; email: string; onToggle: () => void }) {
  const { t, newCount, num } = useAdmin();
  const path = (usePathname() || "/").replace(/\/$/, "") || "/";
  const nav = [
    { href: "/admin/", key: "overview", icon: "home", active: path === "/admin" },
    { href: "/admin/orders/", key: "orders", icon: "orders", active: /^\/admin\/(orders|order|invoice)/.test(path) },
    { href: "/admin/products/", key: "products", icon: "box", active: /^\/admin\/products?/.test(path) },
    { href: "/admin/settings/", key: "settings", icon: "gear", active: path.startsWith("/admin/settings") },
  ] as const;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen flex-col gap-1 border-r border-sage/30 bg-linen px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <Image src="/images/logo.png" alt="" width={38} height={38} />
          <div>
            <p className="font-display text-xl leading-none text-moss" lang="en">Bloomie</p>
            <p className="text-xs text-bark-soft">{t.appName}</p>
          </div>
        </div>
        {nav.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            aria-current={n.active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold ${
              n.active ? "bg-white/80 text-moss" : "text-bark-soft hover:bg-white/50 hover:text-bark"
            }`}
          >
            <Icon name={n.icon} className="h-5 w-5" />
            {t.nav[n.key]}
            {n.key === "orders" && newCount > 0 && (
              <span className="ml-auto rounded-full bg-st-new px-2 text-xs text-white">{num(newCount)}</span>
            )}
          </Link>
        ))}
        <div className="flex-1" />
        <div className="space-y-2 border-t border-sage/30 px-3 pt-3 text-sm text-bark-soft">
          <button onClick={onToggle} className="font-semibold text-moss">{t.langSwitch}</button>
          <p className="break-all">{t.auth.signedInAs}<br />{email}</p>
          <div className="flex gap-4">
            <button onClick={() => supabase?.auth.signOut()} className="font-semibold text-moss hover:underline">{t.auth.signOut}</button>
            <a href="/" target="_blank" rel="noopener" className="font-semibold text-moss hover:underline">{t.common.viewShop}</a>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-12">
        <div className="no-print flex items-center justify-between gap-3 border-b border-sage/30 bg-milk/95 px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="" width={30} height={30} />
            <span className="font-display text-lg text-moss" lang="en">Bloomie</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-moss">
            <button onClick={onToggle}>{t.langSwitch}</button>
            <button onClick={() => supabase?.auth.signOut()}>{t.auth.signOut}</button>
          </div>
        </div>
        {children}
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-sage/30 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label={t.appName}>
        {nav.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            aria-current={n.active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold ${n.active ? "text-moss" : "text-bark-soft"}`}
          >
            <Icon name={n.icon} className="h-[22px] w-[22px]" />
            {t.nav[n.key]}
            {n.key === "orders" && newCount > 0 && (
              <span className="absolute left-1/2 top-1.5 ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-st-new px-1 text-[11px] text-white">
                {num(newCount)}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
