"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createTrip } from "@/lib/api";

const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "CNY", "JPY", "TRY", "THB"];

export default function NewTripPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [totalBudget, setTotalBudget] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const addCountry = () => {
    if (countryInput.trim() && !countries.includes(countryInput.trim())) {
      setCountries([...countries, countryInput.trim()]);
      setCountryInput("");
    }
  };

  const addCity = () => {
    if (cityInput.trim() && !cities.includes(cityInput.trim())) {
      setCities([...cities, cityInput.trim()]);
      setCityInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (countries.length === 0) {
      setError("Добавьте хотя бы одну страну");
      return;
    }
    if (cities.length === 0) {
      setError("Добавьте хотя бы один город");
      return;
    }

    setLoading(true);
    try {
      const data = await createTrip({
        title,
        startDate,
        endDate,
        currency,
        totalBudget,
        countries,
        cities,
      });
      router.push(`/trips/${data.trip.id}`);
    } catch (err: any) {
      setError(err.message || "Ошибка создания поездки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Новая поездка
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Название поездки
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Например: Летний евротур"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Дата начала
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Дата окончания
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Валюта
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Общий бюджет
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Страны
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCountry();
                  }
                }}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Добавить страну"
              />
              <button
                type="button"
                onClick={addCountry}
                className="bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-200 transition"
              >
                +
              </button>
            </div>
            {countries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {countries.map((c, i) => (
                  <span
                    key={i}
                    className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => setCountries(countries.filter((_, j) => j !== i))}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cities */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Города
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCity();
                  }
                }}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Добавить город"
              />
              <button
                type="button"
                onClick={addCity}
                className="bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-200 transition"
              >
                +
              </button>
            </div>
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cities.map((c, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => setCities(cities.filter((_, j) => j !== i))}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            {loading ? "Создание..." : "Создать поездку"}
          </button>
        </form>
      </div>
    </div>
  );
}
