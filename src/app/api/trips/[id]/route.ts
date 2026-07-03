import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  trips,
  tripCountries,
  tripCities,
  tripParticipants,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { tripSchema } from "@/lib/validations";

// GET /api/trips/[id] — get trip details
export async function GET(
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

    // Check if user is a participant
    const [participant] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!participant) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const countries = await db
      .select()
      .from(tripCountries)
      .where(eq(tripCountries.tripId, id));
    const cities = await db
      .select()
      .from(tripCities)
      .where(eq(tripCities.tripId, id));

    const [owner] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, trip.ownerId));

    return NextResponse.json({
      trip: {
        ...trip,
        totalBudget: trip.totalBudget ? String(trip.totalBudget) : null,
        countries: countries.map((c) => c.country),
        cities: cities.map((c) => c.city),
        owner: owner || null,
        userRole: participant.role,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET trip error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/trips/[id] — update trip
export async function PUT(
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
        { error: "Только владелец может редактировать поездку" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = tripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { title, startDate, endDate, currency, totalBudget, countries, cities } =
      parsed.data;

    await db
      .update(trips)
      .set({ title, startDate, endDate, currency, totalBudget: totalBudget || null })
      .where(eq(trips.id, id));

    // Replace countries
    await db.delete(tripCountries).where(eq(tripCountries.tripId, id));
    if (countries.length > 0) {
      await db.insert(tripCountries).values(
        countries.map((c) => ({ tripId: id, country: c })),
      );
    }

    // Replace cities
    await db.delete(tripCities).where(eq(tripCities.tripId, id));
    if (cities.length > 0) {
      await db.insert(tripCities).values(
        cities.map((c) => ({ tripId: id, city: c })),
      );
    }

    return NextResponse.json({
      trip: {
        ...trip,
        title,
        startDate,
        endDate,
        currency,
        totalBudget: totalBudget || null,
        countries,
        cities,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT trip error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/trips/[id] — delete trip
export async function DELETE(
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
        { error: "Только владелец может удалить поездку" },
        { status: 403 },
      );
    }

    await db.delete(trips).where(eq(trips.id, id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE trip error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
