import type { Metadata, Viewport } from "next";
import { AdminProvider } from "@/admin/AdminProvider";

export const metadata: Metadata = {
  title: "Bloomie admin",
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Bloomie", statusBarStyle: "default" },
  icons: { apple: "/admin/apple-touch-icon.png", icon: "/admin/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#55654a" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
