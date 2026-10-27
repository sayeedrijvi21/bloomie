"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const deviceLabel = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  return "Computer";
};

async function registration() {
  return navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" });
}

/** Order alerts on this device: current state plus turn on / off / test. */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID;
      if (!supported) return setState(isIOS() && !isStandalone() ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (!supabase) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      return false;
    }
    try {
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID) }));
      const json = sub.toJSON();
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, device: deviceLabel() }, { onConflict: "endpoint" });
      if (error) throw error;
      setState("on");
      return true;
    } catch (e) {
      console.error("Could not turn on alerts", e);
      setState("off");
      return false;
    }
  }, []);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/admin/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }, []);

  const test = useCallback(async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("send_test_alert");
    return error ? null : (data as number);
  }, []);

  return { state, enable, disable, test };
}
