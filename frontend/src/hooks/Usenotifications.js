import { useState } from "react";

/**
 * useNotifications
 * Manages the notification queue: push, mark read, clear.
 */
export function useNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const pushNotif = (msg, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifs((prev) =>
      [{ id, msg, type, ts: Date.now(), read: false }, ...prev].slice(0, 50)
    );
    if (type !== "danger") {
      setTimeout(
        () => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
        15000
      );
    }
    return id;
  };

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearNotif = (id) => setNotifs((prev) => prev.filter((n) => n.id !== id));
  const clearAllNotifs = () => setNotifs([]);

  return { notifs, notifOpen, setNotifOpen, pushNotif, markAllRead, clearNotif, clearAllNotifs };
}