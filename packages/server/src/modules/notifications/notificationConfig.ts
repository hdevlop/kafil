function flag(name: string, defaultOn: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export const notificationFlags = {
  get dispatchEnabled() {
    return flag("NOTIFICATIONS_DISPATCH_ENABLED", false);
  },
  get emailEnabled() {
    return flag("NOTIFICATIONS_EMAIL_ENABLED", false);
  },
  get pushEnabled() {
    return flag("NOTIFICATIONS_PUSH_ENABLED", false);
  },
} as const;

/** Uncompressed P-256 points are 65 bytes: 0x04 || X || Y. */
export const VAPID_PUBLIC_KEY_BYTES = 65;

const MAX_VAPID_SUBJECT_LENGTH = 320;
const MAX_VAPID_KEY_LENGTH = 200;

/**
 * Normalize the VAPID contact into the `https:`/`mailto:` subject form that
 * `web-push` accepts. A bare address becomes `mailto:<address>`; anything
 * that is neither a bare address nor an https:/mailto: URL is rejected so a
 * misconfigured contact can never report push as enabled.
 */
export function normalizeVapidSubject(contact: string | undefined): string | undefined {
  const trimmed = contact?.trim();
  if (!trimmed || trimmed.length > MAX_VAPID_SUBJECT_LENGTH) return undefined;
  if (/^(https:|mailto:)/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol === "https:" || url.protocol === "mailto:") return trimmed;
      return undefined;
    } catch {
      return undefined;
    }
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  return undefined;
}

/**
 * Validate the VAPID public key format before it is ever exposed through
 * `push-config` or handed to `web-push`: unpadded base64url that decodes to
 * an uncompressed P-256 point. `web-push` throws for anything else at send
 * time, which previously surfaced as a misleading `push_not_configured`
 * dead-letter on every delivery.
 */
export function isValidVapidPublicKey(key: string | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_VAPID_KEY_LENGTH) return false;
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) return false;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(trimmed, "base64url");
  } catch {
    return false;
  }
  if (
    bytes.length !== VAPID_PUBLIC_KEY_BYTES ||
    bytes[0] !== 0x04 ||
    bytes.toString("base64url") !== trimmed
  ) {
    return false;
  }
  return true;
}

export const vapidConfig = {
  get publicKey() {
    return process.env.VAPID_PUBLIC_KEY?.trim() || undefined;
  },
  get privateKey() {
    return process.env.VAPID_PRIVATE_KEY?.trim() || undefined;
  },
  get contactEmail() {
    return process.env.VAPID_CONTACT_EMAIL?.trim() || undefined;
  },
  /** Normalized `https:`/`mailto:` subject for `web-push`, or undefined. */
  get subject() {
    return normalizeVapidSubject(this.contactEmail);
  },
  /**
   * Fail-closed: presence alone never enables push. The public key must
   * parse as a VAPID key and the contact must normalize, otherwise
   * `push-config` reports disabled and the sender refuses to run.
   */
  get configured() {
    return Boolean(
      this.publicKey &&
        isValidVapidPublicKey(this.publicKey) &&
        this.privateKey &&
        this.subject,
    );
  },
} as const;

export const NOTIFICATION_RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 360] as const;
export const NOTIFICATION_MAX_ATTEMPTS = 6;
export const NOTIFICATION_LEASE_MINUTES = 5;
export const NOTIFICATION_WORKER_BATCH = 50;
export const NOTIFICATION_WORKER_IDLE_MS = 2_000;
