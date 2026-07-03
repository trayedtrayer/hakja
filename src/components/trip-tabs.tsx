"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const tabs = [
    { label: "Обзор", href: `/trips/${tripId}` },
    { label: "Траты", href: `/trips/${tripId}/expenses` },
    { label: "Участники", href: `/trips/${tripId}/participants` },
    { label: "Итого", href: `/trips/${tripId}/summary` },
  ];

  return (
    <div className="border-b border-slate-200 mb-6">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
