import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  trips,
  tripCountries,
  tripCities,
  tripParticipants,
  users,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { tripSchema } from "@/lib/validations";
import { v4 as uuid } from "uuid";

// GET /api/trips — list trips for current user with optional filters
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const url = req.nextUrl;
    const searchTitle = url.searchParams.get("title") || "";
    const searchDate = url.searchParams.get("date") || "";
    const searchCountry = url.searchParams.get("country") || "";
    const searchCity = url.searchParams.get("city") || "";

    const myTripIds = await db
      .select({ tripId: tripParticipants.tripId })
      .from(tripParticipants)
      .where(eq(tripParticipants.userId, user.id));

    const tripIdArray = Array.from(new Set(myTripIds.map((t) => t.tripId)));

    if (tripIdArray.length === 0) {
      return NextResponse.json({ trips: [] });
    }

    const allTrips = await db
      .select({
        id: trips.id,
        title: trips.title,
        startDate: trips.startDate,
        endDate: trips.endDate,
        currency: trips.currency,
        totalBudget: trips.totalBudget,
        ownerId: trips.ownerId,
        inviteCode: trips.inviteCode,
        createdAt: trips.createdAt,
      })
      .from(trips)
      .where(inArray(trips.id, tripIdArray));

    const allCountries = await db.select().from(tripCountries);
    const allCities = await db.select().from(tripCities);

    const countriesByTrip = new Map<string, string[]>();
    for (const c of allCountries) {
      if (!countriesByTrip.has(c.tripId)) countriesByTrip.set(c.tripId, []);
      countriesByTrip.get(c.tripId)!.push(c.country);
    }

    const citiesByTrip = new Map<string, string[]>();
    for (const c of allCities) {
      if (!citiesByTrip.has(c.tripId)) citiesByTrip.set(c.tripId, []);
      citiesByTrip.get(c.tripId)!.push(c.city);
    }

    const allOwners = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users);

    const ownersById = new Map(allOwners.map((o) => [o.id, o]));

    let filtered = allTrips;

    if (searchTitle) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(searchTitle.toLowerCase()),
      );
    }

    if (searchDate) {
      filtered = filtered.filter(
        (t) => t.startDate <= searchDate && t.endDate >= searchDate,
      );
    }

    if (searchCountry) {
      filtered = filtered.filter((t) => {
        const countries = countriesByTrip.get(t.id) || [];
        return countries.some((c) =>
          c.toLowerCase().includes(searchCountry.toLowerCase()),
        );
      });
    }

    if (searchCity) {
      filtered = filtered.filter((t) => {
        const cities = citiesByTrip.get(t.id) || [];
        return cities.some((c) =>
          c.toLowerCase().includes(searchCity.toLowerCase()),
        );
      });
    }

    const result = filtered.map((t) => ({
      ...t,
      totalBudget: t.totalBudget ? String(t.totalBudget) : null,
      countries: countriesByTrip.get(t.id) || [],
      cities: citiesByTrip.get(t.id) || [],
      owner: ownersById.get(t.ownerId) || null,
    }));

    return NextResponse.json({ trips: result });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET trips error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/trips — create a new trip
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
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

    const inviteCode = uuid().slice(0, 8);

    const [trip] = await db
      .insert(trips)
      .values({
        title,
        startDate,
        endDate,
        currency,
        totalBudget: totalBudget || null,
        ownerId: user.id,
        inviteCode,
      })
      .returning();

    await db.insert(tripParticipants).values({
      tripId: trip.id,
      userId: user.id,
      role: "owner",
    });

    if (countries.length > 0) {
      await db.insert(tripCountries).values(
        countries.map((c) => ({ tripId: trip.id, country: c })),
      );
    }

    if (cities.length > 0) {
      await db.insert(tripCities).values(
        cities.map((c) => ({ tripId: trip.id, city: c })),
      );
    }

    return NextResponse.json({
      trip: {
        ...trip,
        totalBudget: trip.totalBudget ? String(trip.totalBudget) : null,
        countries,
        cities,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST trip error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
