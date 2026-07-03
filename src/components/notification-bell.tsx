"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";

interface NotificationItem {
  id: string;
  tripId: string;
  tripTitle: string | null;
  title: string;
  message: string;
  type: string;
  email: string | null;
  emailSent: boolean;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAllNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string, tripId: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "expense": return "💸";
      case "invite": return "✉️";
      case "participant": return "🎉";
      default: return "🔔";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
        aria-label="Уведомления"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Уведомления</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Прочитать все
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <div className="text-3xl mb-2">🔕</div>
                Пока нет уведомлений
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer ${
                    !n.isRead ? "bg-indigo-50/40" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) handleMarkRead(n.id, n.tripId);
                    setOpen(false);
                    if (n.type === "invite") {
                      // Приглашения нужно принять в центре уведомлений,
                      // а не открывать закрытую поездку напрямую.
                      router.push("/notifications");
                    } else if (n.tripId) {
                      router.push(`/trips/${n.tripId}`);
                    }
                  }}
                >
                  <div className="flex gap-2.5">
                    <span className="text-lg shrink-0">{iconForType(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {n.title || n.tripTitle || "Уведомление"}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {n.emailSent && (
                          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            ✓ email
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Все уведомления →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
