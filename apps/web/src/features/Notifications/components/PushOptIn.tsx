"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { usePushConfig } from "../hooks/useNotifications";
import {
  useSubscribePush,
  useUnsubscribePush,
} from "../hooks/useNotificationCommands";
import type { PushStatus } from "../types";

function urlBase64ToUint8Array(base64: string) {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function bufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PushOptIn() {
  const { t } = useTranslation();
  const pushConfig = usePushConfig();
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();

  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !window.isSecureContext
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "granted" : "prompt");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Sync with the browser PushManager/serviceWorker external system on
    // mount; permission and subscription live outside React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      // Permission is requested only after this explicit user gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const publicKey = pushConfig.data?.publicKey;
      if (!publicKey) throw new Error(t("notifications.pushError"));
      const registration = await navigator.serviceWorker.ready;
      // An expired server-side subscription is replaced by subscribing again;
      // the backend transfers the endpoint globally on account switch.
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const endpoint = subscription.endpoint;
      const p256dh = bufferToBase64Url(
        subscription.getKey("p256dh"),
      );
      const auth = bufferToBase64Url(subscription.getKey("auth"));
      if (!p256dh || !auth) throw new Error(t("notifications.pushError"));
      await subscribe.mutateAsync({ endpoint, p256dh, auth });
      setStatus("granted");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.pushError"));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      if (subscription) await subscription.unsubscribe();
      if (endpoint) {
        await unsubscribe.mutateAsync(endpoint).catch(() => undefined);
      }
      setStatus("prompt");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.pushError"));
    } finally {
      setBusy(false);
    }
  }

  const configured = pushConfig.data?.enabled !== false;
  const disabled =
    busy ||
    pushConfig.isPending ||
    status === "loading" ||
    status === "unsupported" ||
    status === "denied" ||
    !configured;

  let description = t("notifications.pushBody");
  if (!configured) description = t("notifications.pushUnavailable");
  else if (status === "unsupported") description = t("notifications.pushUnsupported");
  else if (status === "denied") description = t("notifications.pushDenied");
  else if (status === "loading" || busy) description = t("notifications.loading");
  else if (isIosDevice() && status !== "granted") description = t("notifications.pushIosHint");
  if (error) description = error;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("notifications.pushTitle")}</p>
      <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2">
        <div className="min-w-0">
          <p
            aria-live="polite"
            className={status === "denied" || error ? "text-sm text-destructive" : "text-sm"}
          >
            {description}
          </p>
        </div>
        <Switch
          aria-label={t("notifications.pushTitle")}
          checked={status === "granted"}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (checked) void enable();
            else void disable();
          }}
        />
      </div>
    </div>
  );
}
