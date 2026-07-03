"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getTrip,
  getParticipants,
  inviteParticipant,
  addParticipantDirect,
  getProfiles,
} from "@/lib/api";
import { TripTabs } from "@/components/trip-tabs";

interface Participant {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface TravelProfile {
  id: string;
  name: string;
  email: string;
}

export default function ParticipantsPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previousProfiles, setPreviousProfiles] = useState<TravelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Direct add profile form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [directAddLoading, setDirectAddLoading] = useState(false);

  // Invite email form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    type: "success" | "error";
    message: string;
    link?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tripData, partData, profData] = await Promise.all([
        getTrip(id),
        getParticipants(id),
        getProfiles(),
      ]);
      setTrip(tripData.trip);
      setParticipants(partData.participants || []);
      setPreviousProfiles(profData.profiles || []);
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
  }, [id, authLoading, user, router, loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteResult(null);
    setInviteLoading(true);
    try {
      const data = await inviteParticipant(id, inviteEmail);
      setInviteResult({
        type: "success",
        message: "Приглашение создано!",
        link: data.inviteLink,
      });
      setInviteEmail("");
    } catch (err: any) {
      setInviteResult({
        type: "error",
        message: err.message || "Ошибка приглашения",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() && !newEmail.trim()) return;
    setDirectAddLoading(true);
    try {
      await addParticipantDirect(id, { name: newName, email: newEmail });
      setNewName("");
      setNewEmail("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Ошибка добавления");
    } finally {
      setDirectAddLoading(false);
    }
  };

  const handleAddExistingProfile = async (prof: TravelProfile) => {
    try {
      await addParticipantDirect(id, { userId: prof.id });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Ошибка добавления");
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

  const isOwner = trip?.userRole === "owner";
  const existingUserIds = new Set(participants.map((p) => p.userId));
  const suggestedProfiles = previousProfiles.filter(
    (p) => !existingUserIds.has(p.id),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{trip?.title}</h1>
      <p className="text-sm text-slate-500 mb-4">Участники поездки</p>

      <TripTabs tripId={id} />

      {/* Suggested Profiles from previous trips */}
      {isOwner && suggestedProfiles.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">
            💡 Ранее вы уже путешествовали с ними. Добавить в эту поездку?
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestedProfiles.map((prof) => (
              <button
                key={prof.id}
                onClick={() => handleAddExistingProfile(prof)}
                className="bg-white border border-indigo-300 hover:border-indigo-500 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm transition flex items-center gap-1.5"
              >
                <span>+</span>
                <span>{prof.name}</span>
                <span className="text-indigo-400">({prof.email})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Participants list */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">
            Участники ({participants.length})
          </h2>
          <div className="space-y-3">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {(p.name || p.email)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {p.name || p.email}
                    {p.userId === user?.id && (
                      <span className="text-xs text-slate-400 ml-1">(вы)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.role === "owner"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {p.role === "owner" ? "Владелец" : "Участник"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite & Create Profile forms */}
        {isOwner && (
          <div className="space-y-6">
            {/* Create profile / direct add */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">
                Создать профиль участника
              </h2>
              <form onSubmit={handleAddDirect} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Имя участника
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="Алексей"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email (необязательно)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alex@email.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={directAddLoading}
                  className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition font-medium text-sm disabled:opacity-50"
                >
                  {directAddLoading ? "Добавление..." : "+ Добавить профиль"}
                </button>
              </form>
            </div>

            {/* Invite link form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">
                Пригласить по ссылке / email
              </h2>
              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email для приглашения
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="friend@email.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
                >
                  {inviteLoading ? "Создание..." : "Сформировать ссылку"}
                </button>
              </form>

              {inviteResult && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm ${
                    inviteResult.type === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <p>{inviteResult.message}</p>
                  {inviteResult.link && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.link}
                        className="flex-1 border border-green-300 rounded px-2 py-1 text-xs bg-white"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.link!);
                          alert("Ссылка скопирована!");
                        }}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Копировать
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
