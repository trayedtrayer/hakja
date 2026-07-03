import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, trips } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/notifications — all notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();

    const rows = await db
      .select({
        id: notifications.id,
        tripId: notifications.tripId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        email: notifications.email,
        emailSent: notifications.emailSent,
        actionUrl: notifications.actionUrl,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        tripTitle: trips.title,
      })
      .from(notifications)
      .leftJoin(trips, eq(notifications.tripId, trips.id))
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt));

    const unreadCount = rows.filter((r) => !r.isRead).length;

    return NextResponse.json({ notifications: rows, unreadCount });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
