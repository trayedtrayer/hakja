import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tripParticipants, trips, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// POST /api/trips/[id]/add-participant — add existing user or create/add profile
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;

    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    if (!trip) {
      return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
    }

    if (trip.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Только владелец может добавлять участников" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { userId, email, name } = body;

    let targetUserId = userId;

    if (!targetUserId && email) {
      const [found] = await db.select().from(users).where(eq(users.email, email));
      if (found) {
        targetUserId = found.id;
      } else if (name) {
        // Create user profile for non-registered participant
        const [newUser] = await db
          .insert(users)
          .values({
            email: email || `user_${Date.now()}@temp.local`,
            name: name,
            passwordHash: "temp_hash",
          })
          .returning();
        targetUserId = newUser.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Укажите существующего пользователя или имя/email" },
        { status: 400 },
      );
    }

    // Check if already participant
    const [existing] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(
          eq(tripParticipants.tripId, id),
          eq(tripParticipants.userId, targetUserId),
        ),
      );

    if (existing) {
      return NextResponse.json(
        { error: "Пользователь уже участвует в поездке" },
        { status: 409 },
      );
    }

    await db.insert(tripParticipants).values({
      tripId: id,
      userId: targetUserId,
      role: "participant",
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Add participant error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
