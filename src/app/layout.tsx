import type { Metadata } from "next";
import "@fontsource/young-serif/400.css";
import "@fontsource-variable/nunito-sans";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/tiro-bangla/400.css";
import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "Bloomie | Soft muslin for your little one",
  description: "Pure cotton muslin bibs, urine mats, quilts and swaddles. Delivery all over Bangladesh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="flex min-h-screen flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
