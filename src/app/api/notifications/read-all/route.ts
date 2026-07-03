import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// POST /api/notifications/read-all — mark all as read
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, user.id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
