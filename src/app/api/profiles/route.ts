import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tripParticipants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/profiles — get all people you've traveled with
export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();

    // Get all trips the user has been in
    const myTrips = await db
      .select({ tripId: tripParticipants.tripId })
      .from(tripParticipants)
      .where(eq(tripParticipants.userId, user.id));

    const tripIds = myTrips.map((t) => t.tripId);

    // Get all unique participants from those trips
    const profiles = new Map<string, { id: string; name: string; email: string }>();

    for (const tripId of tripIds) {
      const participants = await db
        .select({
          userId: tripParticipants.userId,
          name: users.name,
          email: users.email,
        })
        .from(tripParticipants)
        .leftJoin(users, eq(tripParticipants.userId, users.id))
        .where(eq(tripParticipants.tripId, tripId));

      for (const p of participants) {
        if (p.userId !== user.id && !profiles.has(p.userId)) {
          profiles.set(p.userId, {
            id: p.userId,
            name: p.name || "Unknown",
            email: p.email || "",
          });
        }
      }
    }

    return NextResponse.json({
      profiles: Array.from(profiles.values()),
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
