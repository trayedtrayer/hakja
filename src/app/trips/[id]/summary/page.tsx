"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTrip, getSummary } from "@/lib/api";
import { TripTabs } from "@/components/trip-tabs";

interface Balance {
  userId: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

interface Debt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export default function SummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
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
        const [tripData, summaryData] = await Promise.all([
          getTrip(id),
          getSummary(id),
        ]);
        setTrip(tripData.trip);
        setBalances(summaryData.balances || []);
        setDebts(summaryData.debts || []);
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{trip?.title}</h1>
      <p className="text-sm text-slate-500 mb-4">Финансовый итог поездки</p>

      <TripTabs tripId={id} />

      {/* Balances */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-4">Баланс участников</h2>
        <div className="space-y-3">
          {balances.map((b) => (
            <div
              key={b.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {(b.name || b.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {b.name || b.email}
                    {b.userId === user?.id && (
                      <span className="text-xs text-slate-400 ml-1">(вы)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {b.role === "owner" ? "Владелец" : "Участник"}
                  </p>
                </div>
              </div>
              <div
                className={`text-lg font-bold ${
                  b.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {b.balance >= 0 ? "+" : ""}
                {b.balance.toLocaleString()} {trip?.currency}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">
          Кто кому должен
        </h2>

        {debts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Все расходы урегулированы! 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {debts.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200"
              >
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-slate-800">
                    {d.fromName}
                    {d.fromUserId === user?.id && (
                      <span className="text-xs text-slate-400 ml-1">(вы)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">должен</p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-amber-700">
                    {d.amount.toLocaleString()} {trip?.currency}
                  </span>
                  <span className="text-2xl">→</span>
                </div>

                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-slate-800">
                    {d.toName}
                    {d.toUserId === user?.id && (
                      <span className="text-xs text-slate-400 ml-1">(вы)</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
