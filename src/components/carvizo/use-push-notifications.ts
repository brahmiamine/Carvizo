"use client";
import { useEffect, useState } from "react";
import { api } from "./helpers";
type PushOptions = {
  userId?: string;
  clearMessages: () => void;
  setSuccess: (message: string) => void;
  setErrorMessage: (message: string) => void;
};
export function usePushNotifications({
  userId,
  clearMessages,
  setSuccess,
  setErrorMessage,
}: PushOptions) {
  const [pushEnabled, setPushEnabled] = useState(false);
  useEffect(() => {
    if (!userId || !("serviceWorker" in navigator)) return;
    let live = true;
    navigator.serviceWorker.ready
      .then((r) => r.pushManager?.getSubscription())
      .then((s) => {
        if (live) setPushEnabled(Boolean(s));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);
  const subscribe = async () => {
    clearMessages();
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw new Error(
          "Les notifications push ne sont pas prises en charge sur ce navigateur.",
        );
      const { publicKey: key } = await api<{ publicKey: string }>("/api/push");
      if (!key)
        throw new Error(
          "Les notifications push ne sont pas encore configurées sur ce serveur.",
        );
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error("Autorisation de notification refusée.");
      const reg = await navigator.serviceWorker.ready;
      const subscription =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await api("/api/push", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });
      setPushEnabled(true);
      setSuccess("Notifications push activées.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await api("/api/push", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      setSuccess("Notifications push désactivées.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  return { pushEnabled, setPushEnabled, subscribe, unsubscribe };
}
