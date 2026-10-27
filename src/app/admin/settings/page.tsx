"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import type { SettingsRow } from "@/admin/types";
import { PushAlertsCard } from "@/admin/PushAlerts";
import { btn, Field, input, LoadError, Page, PageHeader, Panel, PanelTitle, Skeleton } from "@/admin/ui";

export default function SettingsPage() {
  const { t, toast } = useAdmin();
  const [form, setForm] = useState<Record<keyof SettingsRow, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setFailed(false);
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (error) return setFailed(true);
    const s = data as SettingsRow;
    setForm({
      delivery_inside_dhaka: String(s.delivery_inside_dhaka),
      delivery_outside_dhaka: String(s.delivery_outside_dhaka),
      bkash_number: s.bkash_number,
      messenger_url: s.messenger_url,
      facebook_url: s.facebook_url,
      instagram_url: s.instagram_url,
      preorder_days: s.preorder_days,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !form) return;
    const inside = Number(form.delivery_inside_dhaka), outside = Number(form.delivery_outside_dhaka);
    const bkash = form.bkash_number.replace(/[\s-]/g, "");
    if (!(inside >= 0) || !(outside >= 0)) return setError(t.product.errors.price);
    if (bkash && !/^01[3-9]\d{8}$/.test(bkash)) return setError(t.newOrder.errors.phone);
    setError(null);
    setBusy(true);
    const { error } = await supabase
      .from("settings")
      .update({
        delivery_inside_dhaka: Math.round(inside),
        delivery_outside_dhaka: Math.round(outside),
        bkash_number: bkash,
        messenger_url: form.messenger_url.trim(),
        facebook_url: form.facebook_url.trim(),
        instagram_url: form.instagram_url.trim(),
        preorder_days: form.preorder_days.trim(),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) return setError(t.common.saveFailed);
    toast(t.settings.saved);
  }

  const set = (k: keyof SettingsRow) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <PageHeader title={t.nav.settings} />
      <Page>
        {failed ? (
          <LoadError message={t.common.loadFailed} onRetry={load} label={t.common.refresh} />
        ) : !form ? (
          <Skeleton rows={3} />
        ) : (
          <div className="grid max-w-xl gap-4">
          <PushAlertsCard />
          <form onSubmit={save} noValidate className="grid gap-4">
            <Panel>
              <PanelTitle>{t.settings.delivery}</PanelTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.settings.inside}><input id="s-in" type="number" min={0} className={input} value={form.delivery_inside_dhaka} onChange={set("delivery_inside_dhaka")} /></Field>
                <Field label={t.settings.outside}><input id="s-out" type="number" min={0} className={input} value={form.delivery_outside_dhaka} onChange={set("delivery_outside_dhaka")} /></Field>
              </div>
            </Panel>
            <Panel>
              <PanelTitle>{t.settings.payment}</PanelTitle>
              <Field label={t.settings.bkash} hint={t.settings.bkashHint}>
                <input id="s-bkash" inputMode="tel" placeholder="01XXXXXXXXX" className={input} value={form.bkash_number} onChange={set("bkash_number")} />
              </Field>
              <Field label={t.settings.preorder} hint={t.settings.preorderHint}>
                <input id="s-pre" className={input} value={form.preorder_days} onChange={set("preorder_days")} />
              </Field>
            </Panel>
            <Panel>
              <PanelTitle>{t.settings.links}</PanelTitle>
              <Field label={t.settings.messenger}><input id="s-msg" type="url" className={input} value={form.messenger_url} onChange={set("messenger_url")} /></Field>
              <Field label={t.settings.facebook}><input id="s-fb" type="url" className={input} value={form.facebook_url} onChange={set("facebook_url")} /></Field>
              <Field label={t.settings.instagram}><input id="s-ig" type="url" className={input} value={form.instagram_url} onChange={set("instagram_url")} /></Field>
            </Panel>
            {error && <p role="alert" className="text-sm text-st-new">{error}</p>}
            <button type="submit" disabled={busy} className={`${btn.primary} justify-self-start`}>{busy ? t.common.saving : t.settings.save}</button>
          </form>
          </div>
        )}
      </Page>
    </>
  );
}
