"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getTrip,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getParticipants,
  getNotifications,
} from "@/lib/api";
import { TripTabs } from "@/components/trip-tabs";

interface Participant {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
}

interface ExpenseParticipant {
  id: string;
  userId: string;
  amountOwed: string;
  name: string;
  email: string;
}

interface ExpenseLogEntry {
  id: string;
  action: string;
  changedByUserId: string;
  oldData: any;
  newData: any;
  createdAt: string;
}

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  currency: string;
  splitType: string;
  receiptUrl: string | null;
  paidByUserId: string;
  createdByUserId: string;
  paidBy: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  participants: ExpenseParticipant[];
  logs: ExpenseLogEntry[];
  createdAt: string;
  updatedAt: string;
}

interface NotificationItem {
  id: string;
  message: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES = [
  "Проживание (одинаковая сумма на всех)",
  "Транспорт",
  "Питание",
  "Развлечения",
  "Музеи / экскурсии",
  "Сувениры",
  "Связь",
  "Страховка",
  "Прочее",
];

function ExpenseLog({ logs }: { logs: ExpenseLogEntry[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-2">История изменений:</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-xs text-slate-500 flex gap-2">
            <span className="font-semibold text-slate-700">
              {log.action === "created"
                ? "Создана"
                : log.action === "updated"
                  ? "Изменена"
                  : "Удалена"}
            </span>
            <span>
              {new Date(log.createdAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formPaidBy, setFormPaidBy] = useState("");
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formSplitType, setFormSplitType] = useState<"equal" | "custom">("equal");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [formParticipantIds, setFormParticipantIds] = useState<string[]>([]);
  const [formCustomAmounts, setFormCustomAmounts] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Selected receipt preview modal
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tripData, expData, partData, notifData] = await Promise.all([
        getTrip(id),
        getExpenses(id),
        getParticipants(id),
        getNotifications(id),
      ]);
      setTrip(tripData.trip);
      setExpenses(expData.expenses || []);
      setParticipants(partData.participants || []);
      setNotificationsList(notifData.notifications || []);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    loadData();
  }, [authLoading, user, router, loadData]);

  const resetForm = () => {
    setFormPaidBy(user?.id || "");
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormCustomCategory("");
    setFormDescription("");
    setFormAmount("");
    setFormCurrency(trip?.currency || "RUB");
    setFormSplitType("equal");
    setFormReceiptUrl("");
    setFormParticipantIds([]);
    setFormCustomAmounts({});
    setFormError("");
    setEditingExpense(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    // By default, the author paid so others owe them
    setFormPaidBy(user?.id || "");
    setFormCurrency(trip?.currency || "RUB");
    setFormParticipantIds(participants.map((p) => p.userId));
    setShowForm(true);
  };

  const openEditForm = (exp: Expense) => {
    setEditingExpense(exp);
    setFormPaidBy(exp.paidByUserId);
    setFormCategory(exp.category);
    setFormCustomCategory("");
    setFormDescription(exp.description || "");
    setFormAmount(String(exp.amount));
    setFormCurrency(exp.currency);
    setFormSplitType(exp.splitType as "equal" | "custom");
    setFormReceiptUrl(exp.receiptUrl || "");
    const partIds = exp.participants.map((p) => p.userId);
    setFormParticipantIds(partIds);
    const customAmts: Record<string, string> = {};
    if (exp.splitType === "custom") {
      exp.participants.forEach((p) => {
        customAmts[p.userId] = String(p.amountOwed);
      });
    }
    setFormCustomAmounts(customAmts);
    setShowForm(true);
  };

  const toggleParticipant = (userId: string) => {
    setFormParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formParticipantIds.length === 0) {
      setFormError("Выберите хотя бы одного участника");
      return;
    }

    const category = formCategory === "__custom__" ? formCustomCategory : formCategory;

    if (formCategory === "__custom__" && !formCustomCategory.trim()) {
      setFormError("Введите название категории");
      return;
    }

    if (!formAmount || parseFloat(formAmount) <= 0) {
      setFormError("Введите корректную сумму");
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        paidByUserId: formPaidBy,
        category,
        description: formDescription,
        amount: formAmount,
        currency: formCurrency,
        splitType: formSplitType,
        receiptUrl: formReceiptUrl || undefined,
        participantIds: formParticipantIds,
        customAmounts: formSplitType === "custom" ? formCustomAmounts : undefined,
      };

      if (editingExpense) {
        await updateExpense(id, editingExpense.id, data);
      } else {
        await createExpense(id, data);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Ошибка сохранения");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Удалить эту трату?")) return;
    try {
      await deleteExpense(id, expenseId);
      await loadData();
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

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  const getParticipantName = (userId: string) => {
    const p = participants.find((p) => p.userId === userId);
    return p?.name || p?.email || "Участник";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{trip?.title}</h1>
          <p className="text-sm text-slate-500">Управление тратами</p>
        </div>
        <button
          onClick={showForm ? resetForm : openCreateForm}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          {showForm ? "Отмена" : "+ Добавить трату"}
        </button>
      </div>

      <TripTabs tripId={id} />

      {/* Notifications feed */}
      {notificationsList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            🔔 Уведомления об изменениях трат
          </h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs text-amber-900">
            {notificationsList.slice(0, 5).map((n) => (
              <div key={n.id} className="flex justify-between items-center">
                <span>{n.message}</span>
                <span className="text-amber-600 text-[10px]">
                  {new Date(n.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">
            {editingExpense ? "Редактировать трату" : "Новая трата"}
          </h2>

          {formError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Кто платил (по умолчанию автор траты) */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Кто платил <span className="text-xs text-indigo-600">(по умолчанию вы)</span>
                </label>
                <select
                  value={formPaidBy}
                  onChange={(e) => setFormPaidBy(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {participants.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name || p.email} {p.userId === user?.id ? "(вы)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Категория
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">Своя категория (например: завтрак)...</option>
                </select>
                {formCategory === "__custom__" && (
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="Например: Завтрак в кафе"
                    className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                )}
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Описание / комментарий
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Например: Отель на 3 ночи"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Сумма */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Сумма
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              {/* Валюта */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Валюта
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {["RUB", "USD", "EUR", "GBP", "CNY", "JPY", "TRY", "THB"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Фото чека */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Фотография чека (URL)
              </label>
              <input
                type="text"
                value={formReceiptUrl}
                onChange={(e) => setFormReceiptUrl(e.target.value)}
                placeholder="https://example.com/receipt.jpg"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Тип распределения */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Как делить сумму:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-4 py-2 border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="splitType"
                    value="equal"
                    checked={formSplitType === "equal"}
                    onChange={() => setFormSplitType("equal")}
                    className="text-indigo-600"
                  />
                  <span className="text-sm font-medium">Поровну на всех</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-4 py-2 border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="splitType"
                    value="custom"
                    checked={formSplitType === "custom"}
                    onChange={() => setFormSplitType("custom")}
                    className="text-indigo-600"
                  />
                  <span className="text-sm font-medium">Вручную</span>
                </label>
              </div>
            </div>

            {/* Участники */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                За кого платили:
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {participants.map((p) => {
                  const checked = formParticipantIds.includes(p.userId);
                  return (
                    <label
                      key={p.userId}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                        checked
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.userId)}
                        className="text-indigo-600 rounded"
                      />
                      <span className="text-sm flex-1">
                        {p.name || p.email}
                      </span>
                      {formSplitType === "custom" && checked && (
                        <input
                          type="number"
                          step="0.01"
                          value={formCustomAmounts[p.userId] || ""}
                          onChange={(e) =>
                            setFormCustomAmounts({
                              ...formCustomAmounts,
                              [p.userId]: e.target.value,
                            })
                          }
                          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                          placeholder="0.00"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
            >
              {formLoading
                ? "Сохранение..."
                : editingExpense
                  ? "Сохранить изменения"
                  : "Добавить трату"}
            </button>
          </form>
        </div>
      )}

      {/* Expenses list */}
      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-2">Трат пока нет</p>
            <p className="text-sm">
              Нажмите кнопку «+ Добавить трату» выше, чтобы внести первую трату
            </p>
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {exp.category}
                    </span>
                    <span className="text-lg font-bold text-slate-800">
                      {Number(exp.amount).toLocaleString()} {exp.currency}
                    </span>
                  </div>

                  {exp.description && (
                    <p className="text-sm text-slate-600 mt-1">
                      {exp.description}
                    </p>
                  )}

                  {exp.receiptUrl && (
                    <div className="mt-2">
                      <button
                        onClick={() => setSelectedReceipt(exp.receiptUrl)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg"
                      >
                        🧾 Чек
                      </button>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>
                      Платил:{" "}
                      <span className="font-semibold text-slate-700">
                        {exp.paidBy?.name || getParticipantName(exp.paidByUserId)}
                      </span>
                    </p>
                    <p>
                      Автор записи:{" "}
                      <span className="font-semibold text-slate-700">
                        {exp.createdBy?.name || getParticipantName(exp.createdByUserId)}
                      </span>
                    </p>
                    <p>
                      Распределение ({exp.splitType === "equal" ? "поровну" : "вручную"}):
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {exp.participants.map((p) => (
                        <span
                          key={p.userId}
                          className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700"
                        >
                          {getParticipantName(p.userId)}:{" "}
                          <b>
                            {Number(p.amountOwed).toLocaleString()} {exp.currency}
                          </b>
                        </span>
                      ))}
                    </div>
                  </div>

                  <ExpenseLog logs={exp.logs} />
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditForm(exp)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="text-xs text-red-500 hover:text-red-700 transition font-medium"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for receipt view */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Чек</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedReceipt}
                alt="Чек"
                className="max-w-full rounded-lg object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-right">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
