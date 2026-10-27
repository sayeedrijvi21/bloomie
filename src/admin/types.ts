export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OrderSource = "website" | "facebook" | "instagram" | "messenger" | "other";
export type StockStatus = "in" | "preorder" | "out";

export const STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export type OrderItem = {
  id: number;
  product_id: string | null;
  product_name: string;
  print: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_no: string;
  source: OrderSource;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  address: string;
  district: string;
  note: string | null;
  payment_method: "cod" | "bkash";
  payment_status: "unpaid" | "paid";
  subtotal: number;
  delivery_charge: number;
  total: number;
  advance_paid: number;
  courier: string | null;
  tracking_no: string | null;
  created_at: string;
  order_items: OrderItem[];
};

export type ProductRow = {
  id: string;
  slug: string;
  category: string;
  price: number;
  stock: StockStatus;
  image_url: string | null;
  name_en: string;
  name_bn: string;
  short_en: string;
  short_bn: string;
  size_en: string;
  size_bn: string;
  prints: { en: string; bn: string }[];
  sort_order: number;
  is_active: boolean;
};

export type SettingsRow = {
  delivery_inside_dhaka: number;
  delivery_outside_dhaka: number;
  bkash_number: string;
  messenger_url: string;
  facebook_url: string;
  instagram_url: string;
  preorder_days: string;
};

/** Amount still to collect from the customer. */
export const amountDue = (o: Pick<Order, "payment_status" | "total" | "advance_paid">) =>
  o.payment_status === "paid" ? 0 : Math.max(0, o.total - o.advance_paid);
