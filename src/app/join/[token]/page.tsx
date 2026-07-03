"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { joinByToken } from "@/lib/api";

export default function JoinPage() {
  const params = useParams();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [tripId, setTripId] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/login?redirect=/join/${token}`);
      return;
    }

    async function join() {
      try {
        const data = await joinByToken(token);
        setStatus("success");
        setMessage("Вы успешно присоединились к поездке!");
        setTripId(data.tripId);
        setTimeout(() => {
          router.push(`/trips/${data.tripId}`);
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Не удалось присоединиться");
      }
    }

    join();
  }, [token, user, authLoading, router]);

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-600">Присоединяем к поездке...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">{message}</h1>
            <p className="text-sm text-slate-500">
              Сейчас вы будете перенаправлены...
            </p>
            {tripId && (
              <button
                onClick={() => router.push(`/trips/${tripId}`)}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Перейти к поездке
              </button>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Ошибка</h1>
            <p className="text-sm text-slate-500">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              На главную
            </button>
          </>
        )}
      </div>
    </div>
  );
}
