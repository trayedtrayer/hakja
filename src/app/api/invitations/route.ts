import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, tripParticipants, trips } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// POST /api/invitations — join via token (no tripId needed)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Токен обязателен" }, { status: 400 });
    }

    let targetTripId: string | null = null;
    let invId: string | null = null;

    // Check invitations table first
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (invitation) {
      targetTripId = invitation.tripId;
      invId = invitation.id;
    } else {
      // Check if token is a trip's inviteCode
      const [tripByCode] = await db
        .select()
        .from(trips)
        .where(eq(trips.inviteCode, token));
      if (tripByCode) {
        targetTripId = tripByCode.id;
      }
    }

    if (!targetTripId) {
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
        and(eq(tripParticipants.tripId, targetTripId), eq(tripParticipants.userId, user.id)),
      );

    if (existing) {
      return NextResponse.json({ ok: true, tripId: targetTripId });
    }

    await db.insert(tripParticipants).values({
      tripId: targetTripId,
      userId: user.id,
      role: "participant",
    });

    if (invId) {
      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, invId));
    }

    return NextResponse.json({ ok: true, tripId: targetTripId });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Invitation accept error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
