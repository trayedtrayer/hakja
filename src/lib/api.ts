// Client-side API helpers

export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }

  return data;
}

// Auth
export async function login(email: string, password: string) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, name: string, password: string) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name, password }),
  });
}

export async function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return apiFetch("/api/auth/me");
}

// Trips
export async function getTrips(params?: URLSearchParams) {
  const qs = params ? `?${params.toString()}` : "";
  return apiFetch(`/api/trips${qs}`);
}

export async function createTrip(data: any) {
  return apiFetch("/api/trips", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTrip(id: string) {
  return apiFetch(`/api/trips/${id}`);
}

export async function updateTrip(id: string, data: any) {
  return apiFetch(`/api/trips/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: string) {
  return apiFetch(`/api/trips/${id}`, {
    method: "DELETE",
  });
}

// Participants
export async function getParticipants(tripId: string) {
  return apiFetch(`/api/trips/${tripId}/participants`);
}

export async function addParticipantDirect(tripId: string, data: any) {
  return apiFetch(`/api/trips/${tripId}/add-participant`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function inviteParticipant(tripId: string, email: string) {
  return apiFetch(`/api/trips/${tripId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Expenses
export async function getExpenses(tripId: string) {
  return apiFetch(`/api/trips/${tripId}/expenses`);
}

export async function createExpense(tripId: string, data: any) {
  return apiFetch(`/api/trips/${tripId}/expenses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExpense(tripId: string, expenseId: string, data: any) {
  return apiFetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(tripId: string, expenseId: string) {
  return apiFetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    method: "DELETE",
  });
}

// Notifications
export async function getNotifications(tripId: string) {
  return apiFetch(`/api/trips/${tripId}/notifications`);
}

// Global notifications (all trips)
export async function getAllNotifications() {
  return apiFetch(`/api/notifications`);
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch(`/api/notifications/${notificationId}`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return apiFetch(`/api/notifications/read-all`, {
    method: "POST",
  });
}

export async function deleteNotification(notificationId: string) {
  return apiFetch(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

// Sent emails (demo inbox)
export async function getSentEmails() {
  return apiFetch(`/api/emails`);
}

// Summary
export async function getSummary(tripId: string) {
  return apiFetch(`/api/trips/${tripId}/summary`);
}

// Profiles
export async function getProfiles() {
  return apiFetch("/api/profiles");
}

// Join
export async function joinByToken(token: string) {
  return apiFetch("/api/invitations", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
