import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = "mailto:noreply@traction.app";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Current UTC hour as HH:00
    const now = new Date();
    const currentHour =
      now.getUTCHours().toString().padStart(2, "0") + ":00";

    // Get all enabled subscriptions for this hour
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription")
      .eq("enabled", true)
      .like("reminder_time", currentHour.slice(0, 2) + ":%");

    if (subError) {
      console.error("Failed to fetch subscriptions:", subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions for this hour" }),
        { status: 200 }
      );
    }

    // Get today's date in YYYY-MM-DD
    const today = now.toISOString().slice(0, 10);

    // Check which users already logged weight today
    const userIds = subscriptions.map((s) => s.user_id);
    const { data: entries } = await supabase
      .from("weight_entries")
      .select("user_id")
      .in("user_id", userIds)
      .eq("date", today);

    const usersWithEntries = new Set((entries || []).map((e) => e.user_id));

    // Filter to users who haven't logged today
    const toNotify = subscriptions.filter(
      (s) => !usersWithEntries.has(s.user_id)
    );

    // Send push notifications
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;

    let sent = 0;
    let failed = 0;

    for (const sub of toNotify) {
      try {
        const subscription = sub.subscription;
        const payload = JSON.stringify({
          title: "TrAction",
          body: "Hast du heute schon gewogen? Trag dein Gewicht ein!",
        });

        // Import web-push compatible signing
        const { default: webpush } = await import("npm:web-push@3.6.7");

        webpush.setVapidDetails(
          VAPID_SUBJECT,
          vapidPublicKey,
          vapidPrivateKey
        );

        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e) {
        console.error(`Failed to send to user ${sub.user_id}:`, e);
        failed++;

        // Remove invalid subscriptions (expired or unsubscribed)
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", sub.user_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        skipped: subscriptions.length - toNotify.length,
        total: subscriptions.length,
      }),
      { status: 200 }
    );
  } catch (e) {
    console.error("send-reminders error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
