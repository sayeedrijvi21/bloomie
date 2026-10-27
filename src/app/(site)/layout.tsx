import { Footer, MessengerButton, Navbar } from "@/components/SiteChrome";
import { ShopDataProvider } from "@/data/ShopDataProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopDataProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <MessengerButton />
    </ShopDataProvider>
  );
}
