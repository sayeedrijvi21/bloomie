"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { defaultSettings, type Product, type ShopSettings, type Stock } from "./products";

type Status = "loading" | "ready" | "error";
type Ctx = {
  status: Status;
  products: Product[];
  shop: ShopSettings;
  getProduct: (slug: string | null) => Product | undefined;
};

const ShopDataContext = createContext<Ctx | null>(null);

type ProductRow = {
  slug: string;
  category: string;
  price: number;
  stock: Stock;
  image_url: string | null;
  name_en: string;
  name_bn: string;
  short_en: string;
  short_bn: string;
  size_en: string;
  size_bn: string;
  prints: { en: string; bn: string }[];
};

const toProduct = (r: ProductRow): Product => ({
  slug: r.slug,
  category: r.category,
  price: r.price,
  stock: r.stock,
  image: r.image_url,
  name: { en: r.name_en, bn: r.name_bn },
  short: { en: r.short_en, bn: r.short_bn },
  size: { en: r.size_en, bn: r.size_bn },
  prints: Array.isArray(r.prints) ? r.prints : [],
});

export function ShopDataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<ShopSettings>(defaultSettings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setStatus("error");
        return;
      }
      const [p, s] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (cancelled) return;
      if (p.error) {
        console.error("Could not load products", p.error);
        setStatus("error");
        return;
      }
      setProducts((p.data as ProductRow[]).map(toProduct));
      if (s.data) {
        setShop({
          messengerUrl: s.data.messenger_url || defaultSettings.messengerUrl,
          facebookUrl: s.data.facebook_url || defaultSettings.facebookUrl,
          instagramUrl: s.data.instagram_url || defaultSettings.instagramUrl,
          bkashNumber: s.data.bkash_number ?? "",
          delivery: { insideDhaka: s.data.delivery_inside_dhaka, outsideDhaka: s.data.delivery_outside_dhaka },
          preorderDays: s.data.preorder_days || defaultSettings.preorderDays,
        });
      }
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getProduct = (slug: string | null) => (slug ? products.find((x) => x.slug === slug) : undefined);

  return (
    <ShopDataContext.Provider value={{ status, products, shop, getProduct }}>{children}</ShopDataContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopDataContext);
  if (!ctx) throw new Error("useShop must be used inside ShopDataProvider");
  return ctx;
}
