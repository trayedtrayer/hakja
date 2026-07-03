"use client";

interface TripFilterProps {
  filters: {
    title: string;
    date: string;
    country: string;
    city: string;
  };
  onChange: (filters: TripFilterProps["filters"]) => void;
  onSearch: () => void;
}

export function TripFilter({ filters, onChange, onSearch }: TripFilterProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Название
          </label>
          <input
            type="text"
            value={filters.title}
            onChange={(e) => onChange({ ...filters, title: e.target.value })}
            placeholder="Название поездки..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Дата
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Страна
          </label>
          <input
            type="text"
            value={filters.country}
            onChange={(e) => onChange({ ...filters, country: e.target.value })}
            placeholder="Страна..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Город
          </label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            placeholder="Город..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={onSearch}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
        >
          Поиск
        </button>
      </div>
    </div>
  );
}
