"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/notification-bell";

export function Navigation() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-indigo-600">
          🧳 TravelTogether
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {loading ? (
            <span className="text-slate-400">Загрузка...</span>
          ) : user ? (
            <>
              <Link href="/" className="text-slate-600 hover:text-slate-900">
                Мои поездки
              </Link>
              <Link
                href="/trips/new"
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
              >
                + Новая поездка
              </Link>
              <span className="text-slate-500">|</span>
              <NotificationBell />
              <span className="text-slate-700">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 transition"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Войти
              </Link>
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
