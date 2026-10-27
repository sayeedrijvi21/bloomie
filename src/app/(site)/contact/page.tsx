"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { useShop } from "@/data/ShopDataProvider";
import { MessengerIcon } from "@/components/ui";

export default function ContactPage() {
  const { t } = useLang();
  const { shop } = useShop();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-12">
      <h1 className="font-display text-4xl text-bark md:text-5xl">{t.contact.title}</h1>

      <a
        href={shop.messengerUrl}
        className="mt-8 flex items-center gap-5 rounded-[28px] bg-moss p-6 text-milk transition-colors hover:bg-bark"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-milk/15">
          <MessengerIcon className="h-7 w-7" />
        </span>
        <span>
          <span className="block text-xl font-semibold">{t.contact.messenger}</span>
          <span className="mt-1 block text-milk/80">{t.contact.messengerSub}</span>
        </span>
      </a>

      <h2 className="mt-12 text-lg font-semibold text-bark">{t.contact.follow}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a href={shop.facebookUrl} className="rounded-2xl border border-sage/50 px-5 py-4 font-semibold text-moss hover:bg-sage-soft">
          Facebook
        </a>
        <a href={shop.instagramUrl} className="rounded-2xl border border-sage/50 px-5 py-4 font-semibold text-moss hover:bg-sage-soft">
          Instagram
        </a>
      </div>
    </div>
  );
}
