"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTrip, deleteTrip } from "@/lib/api";
import { TripTabs } from "@/components/trip-tabs";

interface TripDetail {
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
  userRole: string;
  inviteCode: string;
  createdAt: string;
}

export default function TripOverviewPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;

    async function load() {
      try {
        const data = await getTrip(id);
        setTrip(data.trip);
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, authLoading, user, router]);

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить эту поездку?")) return;
    try {
      await deleteTrip(id);
      router.push("/");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="text-center py-20 text-red-500">
        {error || "Поездка не найдена"}
      </div>
    );
  }

  const isOwner = trip.userRole === "owner";
  const inviteLink = `${window.location.origin}/join/${trip.inviteCode}`;

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{trip.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 hover:text-red-700 transition"
          >
            Удалить
          </button>
        )}
      </div>

      <TripTabs tripId={id} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Информация</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Валюта</dt>
              <dd className="font-medium">{trip.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Бюджет</dt>
              <dd className="font-medium">
                {trip.totalBudget
                  ? `${Number(trip.totalBudget).toLocaleString()} ${trip.currency}`
                  : "Не указан"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Владелец</dt>
              <dd className="font-medium">{trip.owner?.name || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Места</h2>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-slate-500">Страны: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {trip.countries.map((c, i) => (
                  <span
                    key={i}
                    className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Города: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {trip.cities.map((c, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:col-span-2">
            <h2 className="font-semibold text-slate-700 mb-2">
              Приглашение участников
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Отправьте эту ссылку другим путешественникам, чтобы они
              присоединились:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  alert("Ссылка скопирована!");
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
              >
                Копировать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
