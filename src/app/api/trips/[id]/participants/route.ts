import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tripParticipants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/trips/[id]/participants
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;

    const participants = await db
      .select({
        id: tripParticipants.id,
        userId: tripParticipants.userId,
        role: tripParticipants.role,
        joinedAt: tripParticipants.joinedAt,
        name: users.name,
        email: users.email,
      })
      .from(tripParticipants)
      .leftJoin(users, eq(tripParticipants.userId, users.id))
      .where(eq(tripParticipants.tripId, id));

    return NextResponse.json({ participants });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
