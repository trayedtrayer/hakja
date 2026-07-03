"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAllNotifications } from "@/lib/api";
import {
  isNotificationSupported,
  notificationPermission,
  requestNotificationPermission,
  showLocalNotification,
} from "@/lib/push";

/**
 * Mounted once in the app shell. When the user is logged in it:
 *  1. requests browser notification permission (once)
 *  2. polls the server for new notifications and fires a native OS
 *     notification the first time a given notification is seen.
 */
export function PushListener() {
  const { user } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!isNotificationSupported()) return;

    // Ask for permission once per session
    if (notificationPermission() === "default") {
      requestNotificationPermission().catch(() => {});
    }
    // Pre-load already-seen ids so we don't spam on first poll
    getAllNotifications()
      .then((data) => {
        (data.notifications || []).forEach((n: any) => seenIds.current.add(n.id));
        initialized.current = true;
      })
      .catch(() => {
        initialized.current = true;
      });

    const interval = setInterval(async () => {
      if (notificationPermission() !== "granted") return;
      if (!initialized.current) return;
      try {
        const data = await getAllNotifications();
        for (const n of data.notifications || []) {
          if (!seenIds.current.has(n.id)) {
            seenIds.current.add(n.id);
            showLocalNotification(`TravelTogether: ${n.title || "Уведомление"}`, {
              body: n.message,
              tag: n.id,
            });
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}
