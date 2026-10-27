"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "./AdminProvider";
import { usePush } from "./push";
import { btn, Panel, PanelTitle } from "./ui";

/** Full "Order alerts" card for the Settings page. */
export function PushAlertsCard() {
  const { t, fill, num, toast } = useAdmin();
  const { state, enable, disable, test } = usePush();
  const [busy, setBusy] = useState(false);
  const a = t.alerts;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <Panel>
      <PanelTitle>{a.title}</PanelTitle>
      <p className="text-sm text-bark-soft">{a.intro}</p>

      {state === "loading" && <p className="text-sm text-bark-soft">{t.common.loading}</p>}
      {state === "unsupported" && <p className="rounded-xl bg-linen p-3 text-sm">{a.unsupported}</p>}
      {state === "needs-install" && <p className="rounded-xl bg-st-conf-bg p-3 text-sm text-bark">{a.install}</p>}
      {state === "denied" && <p className="rounded-xl bg-st-new-bg p-3 text-sm text-bark">{a.denied}</p>}

      {state === "off" && (
        <button
          type="button"
          disabled={busy}
          className={`${btn.primary} justify-self-start`}
          onClick={() => run(async () => { if (!(await enable())) toast(a.failed); else toast(a.on); })}
        >
          {busy ? a.turningOn : a.turnOn}
        </button>
      )}

      {state === "on" && (
        <>
          <p className="flex items-center gap-2 font-bold text-st-done">
            <span className="h-2.5 w-2.5 rounded-full bg-st-done" />
            {a.on}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
          type="button"
              disabled={busy}
              className={btn.primary}
              onClick={() => run(async () => {
                const n = await test();
                toast(n === null ? t.common.saveFailed : fill(a.testSent, { n: num(n) }));
              })}
            >
              {a.test}
            </button>
            <button type="button" disabled={busy} className={btn.ghost} onClick={() => run(disable)}>{a.turnOff}</button>
          </div>
        </>
      )}

      <p className="border-t border-sage/30 pt-3 text-xs text-bark-soft">{a.installTip}</p>
    </Panel>
  );
}

/** Small prompt on the Overview page until alerts are on for this device. */
export function PushAlertsBanner() {
  const { t } = useAdmin();
  const { state } = usePush();
  if (state !== "off" && state !== "needs-install") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sage-soft px-4 py-3">
      <p className="text-sm font-semibold text-bark">{t.alerts.banner}</p>
      <Link href="/admin/settings/" className={`${btn.primary} ${btn.small}`}>{t.alerts.setUp}</Link>
    </div>
  );
}
