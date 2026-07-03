import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trips, invitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { notifyInvite } from "@/lib/notifications";

// POST /api/trips/[id]/invite — create invitation link
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
        { error: "Только владелец может приглашать участников" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email обязателен" }, { status: 400 });
    }

    const token = uuid();

    await db.insert(invitations).values({
      tripId: id,
      email,
      invitedByUserId: user.id,
      token,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/join/${token}`;

    // Send invitation email + notification
    await notifyInvite({
      tripId: id,
      inviterUserId: user.id,
      inviterName: user.name,
      recipientEmail: email,
      inviteLink,
    }).catch((err) => console.error("notifyInvite failed:", err));

    return NextResponse.json({ inviteLink, token });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
