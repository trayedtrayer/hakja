"use client";

/**
 * Client-side helper for browser (Web) push notifications.
 * Requests permission once and shows native OS-level notifications when
 * something happens while the user has the tab open.
 */

let permissionRequested = false;

export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission !== "default") {
    return Notification.permission;
  }
  try {
    const permission = await Notification.requestPermission();
    permissionRequested = true;
    return permission;
  } catch {
    return "denied";
  }
}

export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      icon: "/icon.svg",
      badge: "/icon.svg",
      ...options,
    });
    // Auto-close after 6 seconds
    setTimeout(() => n.close(), 6000);
    return n;
  } catch {
    // Some browsers require a service worker for notifications; ignore.
  }
}

export function hasRequestedPermission(): boolean {
  return permissionRequested;
}
