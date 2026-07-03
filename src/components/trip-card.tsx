"use client";

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
  owner: { id: string; name: string; email: string } | null;
}

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-indigo-300 transition group"
    >
      <h3 className="font-semibold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
        {trip.title}
      </h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        <span>📅</span>
        <span>
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
        </span>
      </div>

      {trip.countries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {trip.countries.map((c, i) => (
            <span
              key={i}
              className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
            >
              {c}
            </span>
          ))}
          {trip.cities.slice(0, 3).map((c, i) => (
            <span
              key={`city-${i}`}
              className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full"
            >
              {c}
            </span>
          ))}
          {trip.cities.length > 3 && (
            <span className="text-xs text-slate-400">
              +{trip.cities.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {trip.currency} {trip.totalBudget ? Number(trip.totalBudget).toLocaleString() : "—"}
        </span>
        {trip.owner && (
          <span className="text-slate-400 text-xs">
            {trip.owner.name}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
