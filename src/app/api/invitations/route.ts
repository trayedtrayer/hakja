import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, tripParticipants } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Приглашение не найдено или уже использовано" },
        { status: 404 },
      );
    }

    // Check if already a participant
    const [existing] = await db
      .select()
      .from(tripParticipants)
      .where(
        eq(tripParticipants.tripId, invitation.tripId),
      );

    if (existing && existing.userId === user.id) {
      return NextResponse.json(
        { error: "Вы уже участник этой поездки" },
        { status: 409 },
      );
    }

    await db.insert(tripParticipants).values({
      tripId: invitation.tripId,
      userId: user.id,
      role: "participant",
    });

    await db
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, invitation.id));

    return NextResponse.json({ ok: true, tripId: invitation.tripId });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Invitation accept error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
