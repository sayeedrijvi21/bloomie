"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en, { type Dict } from "./en";
import bn from "./bn";

export type Lang = "bn" | "en";

const dicts: Record<Lang, Dict> = { en, bn };
const STORAGE_KEY = "bloomie-lang";

type Ctx = { lang: Lang; t: Dict; toggle: () => void; num: (n: number | string) => string };

const LanguageContext = createContext<Ctx | null>(null);

const bnDigits = "০১২৩৪৫৬৭৮৯";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Bangla is the default: most Bloomie buyers read it first.
  const [lang, setLang] = useState<Lang>("bn");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    const pick = fromUrl ?? saved;
    if (pick === "en" || pick === "bn") setLang(pick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const toggle = useCallback(() => setLang((l) => (l === "bn" ? "en" : "bn")), []);

  const num = useCallback(
    (n: number | string) => {
      const s = typeof n === "number" ? n.toLocaleString("en-IN") : n;
      return lang === "bn" ? s.replace(/[0-9]/g, (d) => bnDigits[Number(d)]) : s;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, t: dicts[lang], toggle, num }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

/** Fill {placeholders} in a translated string. */
export function fill(s: string, vars: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
