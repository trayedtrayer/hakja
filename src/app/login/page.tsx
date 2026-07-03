"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
          Вход в TravelTogether
        </h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          Введите почту и пароль для доступа к путешествиям
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
