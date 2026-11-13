import { db } from "@/lib/db";
import webpush from "web-push";
import { validPushEndpoint } from "@/lib/push-validation";

export function pushConfigured() {
  const publicKey =
      process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey = process.env.VAPID_PRIVATE_KEY,
    subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}
export async function notify(
  userId: string,
  dedupeKey: string,
  title: string,
  body: string,
  push: boolean,
) {
  // Pending delivery stays durable in the dedupe key; the next run retries it.
  const pendingKey = `pending:${dedupeKey}`;
  const delivered = await db.notification.findUnique({
    where: { userId_dedupeKey: { userId, dedupeKey } },
  });
  if (delivered) return false;
  let created = false;
  let notification = await db.notification.findUnique({
    where: { userId_dedupeKey: { userId, dedupeKey: pendingKey } },
  });
  if (!notification) {
    try {
      notification = await db.notification.create({
        data: { userId, dedupeKey: pendingKey, title, body },
      });
      created = true;
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002")
        return false;
      throw e;
    }
  }
  let failed = false;
  if (push) {
    const subs = await db.pushSubscription.findMany({ where: { userId } });
    for (const s of subs) {
      if (!validPushEndpoint(s.endpoint)) {
        await db.pushSubscription.deleteMany({ where: { id: s.id } });
        continue;
      }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url: "/?tab=rappels" }),
          { timeout: 10_000, TTL: 86400 },
        );
      } catch (e) {
        if (
          e &&
          typeof e === "object" &&
          "statusCode" in e &&
          [404, 410].includes(Number(e.statusCode))
        )
          await db.pushSubscription.deleteMany({ where: { id: s.id } });
        else failed = true;
      }
    }
  }
  if (!failed) {
    try {
      await db.notification.update({
        where: { id: notification.id },
        data: { dedupeKey },
      });
    } catch (e) {
      // Another evaluation can finish between our lookup and pending creation.
      // Keep its finalized notification and remove our redundant pending row.
      if (e && typeof e === "object" && "code" in e && e.code === "P2002")
        await db.notification.deleteMany({
          where: { id: notification.id, dedupeKey: pendingKey },
        });
      else if (!(
        e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "P2025"
      ))
        throw e;
    }
  }
  return created;
}
