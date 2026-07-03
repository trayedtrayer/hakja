"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSentEmails,
  joinByToken,
} from "@/lib/api";

interface NotificationItem {
  id: string;
  tripId: string;
  tripTitle: string | null;
  title: string;
  message: string;
  type: string;
  email: string | null;
  emailSent: boolean;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface SentEmail {
  id: string;
  to: string;
  toName: string | null;
  subject: string;
  html: string;
  status: string;
  tripId: string | null;
  createdAt: string;
}

type Tab = "notifications" | "emails";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notifications");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  const load = useCallback(async () => {
    try {
      const [notifData, emailData] = await Promise.all([
        getAllNotifications(),
        getSentEmails().catch(() => ({ emails: [] })),
      ]);
      setNotifications(notifData.notifications || []);
      setUnreadCount(notifData.unreadCount || 0);
      setEmails(emailData.emails || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    load();
  }, [authLoading, user, router, load]);

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

  const handleAcceptInvite = async (notification: NotificationItem) => {
    try {
      const token = notification.actionUrl?.split("/join/")[1];
      if (!token) {
        alert("В уведомлении нет ссылки приглашения. Откройте ссылку из email.");
        return;
      }

      const data = await joinByToken(token);
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      window.location.href = `/trips/${data.tripId}`;
    } catch (err: any) {
      alert(err.message || "Не удалось присоединиться к поездке");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const iconForType = (type: string) => {
    switch (type) {
      case "expense": return "💸";
      case "invite": return "✉️";
      case "participant": return "🎉";
      default: return "🔔";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Рассылки и уведомления</h1>
          <p className="text-sm text-slate-500">
            Центр всех уведомлений и отправленных писем
          </p>
        </div>
        {tab === "notifications" && unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Прочитать все ({unreadCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {([
          { key: "notifications", label: "Уведомления" },
          { key: "emails", label: "Отправленные письма" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.key === "emails" && emails.length > 0 && (
              <span className="ml-1.5 bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full">
                {emails.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "notifications" ? (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🔕</div>
              <p>Пока нет уведомлений</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white rounded-xl shadow-sm border p-4 flex gap-3 cursor-pointer transition ${
                  !n.isRead
                    ? "border-indigo-200 bg-indigo-50/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => {
                  if (!n.isRead) handleMarkRead(n.id, n.tripId);
                  if (n.type !== "invite" && n.tripId) router.push(`/trips/${n.tripId}`);
                }}
              >
                <span className="text-2xl shrink-0">{iconForType(n.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {n.title || n.tripTitle || "Уведомление"}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  {n.type === "invite" && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvite(n);
                        }}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        Присоединиться к поездке
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString("ru-RU")}
                    </span>
                    {n.emailSent && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        ✓ отправлено на email
                      </span>
                    )}
                    {!n.emailSent && n.email && (
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                        в логе рассылок
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {emails.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📬</div>
              <p>Писем пока не отправлялось</p>
              <p className="text-sm mt-1">
                Пригласите участника или измените трату — письмо появится здесь
              </p>
            </div>
          ) : (
            emails.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{e.subject}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Кому: {e.toName ? `${e.toName} <${e.to}>` : e.to}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">
                        {new Date(e.createdAt).toLocaleString("ru-RU")}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          e.status === "sent"
                            ? "bg-green-50 text-green-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {e.status === "sent" ? "✓ доставлено" : "в логе (демо)"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmail(e)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
                  >
                    Просмотр
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Email preview modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between rounded-t-2xl">
              <div>
                <p className="font-semibold text-slate-800">{selectedEmail.subject}</p>
                <p className="text-xs text-slate-500">
                  Кому: {selectedEmail.toName || selectedEmail.to}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div
              className="p-5"
              dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
