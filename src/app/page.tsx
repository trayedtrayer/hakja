"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTrips, createTrip, createExpense } from "@/lib/api";
import { TripCard } from "@/components/trip-card";
import { TripFilter } from "@/components/trip-filter";
import Link from "next/link";

interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  currency: string;
  totalBudget: string | null;
  countries: string[];
  cities: string[];
  ownerId: string;
  owner: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [filters, setFilters] = useState({
    title: "",
    date: "",
    country: "",
    city: "",
  });

  // Load all trips on first mount (no filters)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadAll() {
      try {
        setLoading(true);
        const data = await getTrips();
        setTrips(data.trips || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [authLoading, user]);

  // Search only when button is clicked
  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.title) params.set("title", filters.title);
      if (filters.date) params.set("date", filters.date);
      if (filters.country) params.set("country", filters.country);
      if (filters.city) params.set("city", filters.city);
      const data = await getTrips(params);
      setTrips(data.trips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemo = async () => {
    setDemoLoading(true);
    try {
      const demoTrip = await createTrip({
        title: "Летний евротур 2026",
        startDate: "2026-06-15",
        endDate: "2026-06-25",
        currency: "EUR",
        totalBudget: "2500",
        countries: ["Италия", "Франция"],
        cities: ["Рим", "Флоренция", "Ницца", "Париж"],
      });

      if (user && demoTrip?.trip?.id) {
        await createExpense(demoTrip.trip.id, {
          paidByUserId: user.id,
          category: "Проживание (отель в Риме)",
          description: "Бронирование отеля на 3 ночи",
          amount: "600",
          currency: "EUR",
          splitType: "equal",
          participantIds: [user.id],
        });
      }

      // Reload all trips after demo creation
      const data = await getTrips();
      setTrips(data.trips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDemoLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="text-6xl animate-bounce">🧳</div>
        <h1 className="text-3xl font-extrabold text-slate-800 text-center">
          TravelTogether — Совместные путешествия
        </h1>
        <p className="text-slate-600 text-center max-w-lg text-base">
          Планируйте маршруты с друзьями, ведите общий бюджет и прозрачно делите расходы
          без ручных подсчётов!
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
          >
            Войти в аккаунт
          </Link>
          <Link
            href="/register"
            className="bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 transition font-semibold text-sm shadow-sm"
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Мои поездки</h1>
          <p className="text-sm text-slate-500">
            Все запланированные и прошедшие путешествия
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateDemo}
            disabled={demoLoading}
            className="bg-slate-100 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50"
          >
            {demoLoading ? "Создание..." : "⚡ Тестовая поездка"}
          </button>
          <Link
            href="/trips/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            + Новая поездка
          </Link>
        </div>
      </div>

      <TripFilter filters={filters} onChange={setFilters} onSearch={handleSearch} />

      {trips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-4xl mb-3">🌍</div>
          <p className="text-lg font-semibold text-slate-700 mb-1">
            Поездок пока нет
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Создайте свою первую поездку или нажмите «⚡ Тестовая поездка», чтобы попробовать все функции!
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/trips/new"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
            >
              + Создать поездку
            </Link>
            <button
              onClick={handleCreateDemo}
              disabled={demoLoading}
              className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition font-medium text-sm"
            >
              Создать тестовую
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
