import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, tripParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { trips, users } from "@/db/schema";
import { notifyParticipantJoined } from "@/lib/notifications";

// POST /api/trips/[id]/join — join via token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Токен обязателен" }, { status: 400 });
    }

    let validJoin = false;
    let invId: string | null = null;

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tripId, id), eq(invitations.token, token)));

    if (invitation) {
      validJoin = true;
      invId = invitation.id;
    } else {
      const [tripByCode] = await db
        .select()
        .from(trips)
        .where(and(eq(trips.id, id), eq(trips.inviteCode, token)));
      if (tripByCode) {
        validJoin = true;
      }
    }

    if (!validJoin) {
      return NextResponse.json(
        { error: "Приглашение не найдено или ссылка недействительна" },
        { status: 404 },
      );
    }

    // Check if already a participant
    const [existing] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(
          eq(tripParticipants.tripId, id),
          eq(tripParticipants.userId, user.id),
        ),
      );

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    await db.insert(tripParticipants).values({
      tripId: id,
      userId: user.id,
      role: "participant",
    });

    if (invId) {
      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, invId));
    }

    // Notify the trip owner that someone joined
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    if (trip && trip.ownerId !== user.id) {
      const [owner] = await db
        .select()
        .from(users)
        .where(eq(users.id, trip.ownerId));
      if (owner) {
        await notifyParticipantJoined({
          tripId: id,
          ownerId: owner.id,
          ownerName: owner.name,
          ownerEmail: owner.email,
          participantName: user.name,
        }).catch((err) => console.error("notifyParticipantJoined failed:", err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Join error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
