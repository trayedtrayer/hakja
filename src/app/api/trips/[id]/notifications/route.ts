import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, tripParticipants } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/trips/[id]/notifications
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;

    const [part] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!part) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const list = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.tripId, id), eq(notifications.userId, user.id)))
      .orderBy(desc(notifications.createdAt));

    return NextResponse.json({ notifications: list });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
