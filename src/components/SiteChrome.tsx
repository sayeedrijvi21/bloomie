"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/i18n/LanguageProvider";
import { useShop } from "@/data/ShopDataProvider";
import { MessengerIcon, PetalClip } from "./ui";

export function Navbar() {
  const { t, toggle, lang } = useLang();
  const path = usePathname();
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/shop", label: t.nav.shop },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-sage/25 bg-milk/90 backdrop-blur">
      <PetalClip />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="Bloomie" width={40} height={40} priority />
          <span className="font-display text-2xl leading-none text-moss" lang="en">
            Bloomie
          </span>
        </Link>
        <nav className="hidden md:block" aria-label="Main">
          <ul className="flex gap-7">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-[15px] ${isActive(l.href) ? "font-semibold text-moss" : "text-bark-soft hover:text-bark"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          onClick={toggle}
          className="rounded-full border border-moss/40 px-3.5 py-1.5 text-sm font-semibold text-moss hover:bg-sage-soft"
          lang={lang === "bn" ? "en" : "bn"}
          aria-label={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
        >
          {t.langSwitch}
        </button>
      </div>
      <nav className="md:hidden" aria-label="Main">
        <ul className="mx-auto flex max-w-6xl justify-between px-4 pb-2.5">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`text-[15px] ${isActive(l.href) ? "font-semibold text-moss underline decoration-sage decoration-2 underline-offset-[6px]" : "text-bark-soft"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  const { shop } = useShop();
  return (
    <footer className="mt-24 bg-moss text-milk">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4">
          <Image src="/images/logo.png" alt="" width={64} height={64} />
          <div>
            <p className="font-display text-2xl" lang="en">
              Bloomie
            </p>
            <p className="text-sm text-milk/80">{t.footer.tagline}</p>
          </div>
        </div>
        <div className="space-y-3 md:text-right">
          <a href={shop.messengerUrl} className="inline-flex items-center gap-2 font-semibold hover:underline">
            <MessengerIcon /> {t.footer.question}
          </a>
          <p className="flex gap-5 text-sm text-milk/85 md:justify-end">
            <a href={shop.facebookUrl} className="hover:underline">
              Facebook
            </a>
            <a href={shop.instagramUrl} className="hover:underline">
              Instagram
            </a>
          </p>
        </div>
      </div>
      <p className="border-t border-milk/15 py-4 text-center text-xs text-milk/70">
        © 2026 {t.footer.rights}
      </p>
    </footer>
  );
}

export function MessengerButton() {
  const { t } = useLang();
  const { shop } = useShop();
  return (
    <a
      href={shop.messengerUrl}
      aria-label={t.contact.messenger}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-moss text-milk shadow-[0_6px_20px_rgba(85,101,74,0.35)] hover:bg-bark"
    >
      <MessengerIcon className="h-7 w-7" />
    </a>
  );
}
