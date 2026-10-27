// Shapes of the shop data. The data itself now lives in Supabase
// (see supabase/setup.sql) and is loaded by ShopDataProvider.

export type Stock = "in" | "preorder" | "out";
export type Text = { en: string; bn: string };

export type Product = {
  slug: string;
  category: string;
  price: number;
  stock: Stock;
  image: string | null;
  name: Text;
  short: Text;
  prints: Text[];
  size: Text;
};

export type ShopSettings = {
  messengerUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  bkashNumber: string;
  delivery: { insideDhaka: number; outsideDhaka: number };
  preorderDays: string;
};

// Used until the settings row has loaded, and if it can't be loaded.
export const defaultSettings: ShopSettings = {
  messengerUrl: "https://m.me/bloomiebd",
  facebookUrl: "https://facebook.com/bloomiebd",
  instagramUrl: "https://instagram.com/bloomiebd",
  bkashNumber: "",
  delivery: { insideDhaka: 70, outsideDhaka: 130 },
  preorderDays: "10–15",
};

/** Shop filter tabs. Products in any other category still show under "All". */
export const categories = ["bibs", "mats", "quilts", "swaddles"] as const;
