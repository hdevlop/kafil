"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { NAlert, NButton, Card, CardContent } from "najm-kit";
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

  if (pushConfig.data && !pushConfig.data.enabled) return null;
  if (status === "unsupported") {
    return (
      <NAlert tone="info" title={t("notifications.pushTitle")} description={t("notifications.pushUnsupported")} />
    );
  }
  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={16} />
          {t("notifications.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 text-muted-foreground">
            {status === "granted" ? <BellRing size={18} /> : <BellOff size={18} />}
          </span>
          <div>
            <p className="text-sm font-semibold">{t("notifications.pushTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("notifications.pushBody")}</p>
            {status === "denied" ? (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {t("notifications.pushDenied")}
              </p>
            ) : null}
            {status === "granted" ? (
              <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
                {t("notifications.pushGranted")}
              </p>
            ) : null}
            {isIosDevice() && status !== "granted" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("notifications.pushIosHint")}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {status === "granted" ? (
            <NButton
              disabled={busy}
              onClick={() => void disable()}
              size="sm"
              type="button"
              variant="outline"
            >
              {busy ? t("notifications.pushDisabling") : t("notifications.pushDisable")}
            </NButton>
          ) : status !== "denied" ? (
            <NButton
              disabled={busy || pushConfig.isPending}
              onClick={() => void enable()}
              size="sm"
              type="button"
            >
              {busy ? t("notifications.pushEnabling") : t("notifications.pushEnable")}
            </NButton>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
