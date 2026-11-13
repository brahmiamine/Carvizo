import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { error, jsonObject, ok } from "@/lib/api";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ notifications: items });
}
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const b = await jsonObject(request);
  if (!b || typeof b.id !== "string") return error("Identifiant requis");
  const count = await db.notification.updateMany({
    where: { id: b.id, userId: user.id },
    data: { readAt: new Date() },
  });
  return count.count ? ok({ success: true }) : error("Rappel introuvable", 404);
}
