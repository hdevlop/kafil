import { createHash } from "node:crypto";
import { EncryptionService } from "najm-auth";
import { Service } from "najm-core";

export function hashEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint, "utf8").digest("hex");
}

export function fingerprintForEndpoint(endpoint: string) {
  return hashEndpoint(endpoint).slice(0, 16);
}

/** Pure helpers above stay free functions. Encryption uses the installed DI service. */
@Service()
export class PushCryptoService {
  constructor(private readonly encryption: EncryptionService) {}

  encryptField(plaintext: string) {
    return this.encryption.encrypt(plaintext);
  }

  decryptField(ciphertext: string) {
    return this.encryption.decrypt(ciphertext);
  }
}

export function normalizeUserAgentFamily(userAgent: string | undefined) {
  if (!userAgent) return null;
  const lower = userAgent.toLowerCase();
  if (lower.includes("firefox")) return "firefox";
  if (lower.includes("edg")) return "edge";
  if (lower.includes("chrome")) return "chrome";
  if (lower.includes("safari")) return "safari";
  if (lower.includes("opera") || lower.includes("opr/")) return "opera";
  return "other";
}
