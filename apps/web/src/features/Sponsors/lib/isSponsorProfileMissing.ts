import { getApiErrorStatus } from "@/services/apiError";

export function isSponsorProfileMissing(error: unknown) {
  return getApiErrorStatus(error) === 404;
}
