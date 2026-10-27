// Bloomie — notify-order
// Sends a phone alert to every device where an admin turned on order alerts.
// Called only by the database (see supabase/003-alerts.sql), which proves who
// it is with the x-webhook-secret header.
//
// Secrets this function needs (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, WEBHOOK_SECRET

import webpush from "npm:web-push@3.6.7";

type Sub = { endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    return new Response("VAPID keys are not set", { status: 500 });
  }
  webpush.setVapidDetails("mailto:sayeedrijvi62@gmail.com", publicKey, privateKey);

  const { payload, subscriptions } = (await req.json()) as { payload: Record<string, string>; subscriptions: Sub[] };
  const message = JSON.stringify(payload);

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, {
        TTL: 60 * 60 * 24, // keep trying for a day if the phone is offline
        urgency: "high",
      }),
    ),
  );

  const failed = results
    .map((r, i) => (r.status === "rejected" ? { endpoint: subscriptions[i].endpoint, error: String(r.reason?.statusCode ?? r.reason) } : null))
    .filter(Boolean);
  if (failed.length) console.error("Some alerts failed", failed);

  return Response.json({ sent: results.length - failed.length, failed: failed.length });
});
