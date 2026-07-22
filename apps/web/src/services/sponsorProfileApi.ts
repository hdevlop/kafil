import type {
  CreateOwnSponsorProfileInput,
  OwnSponsorProfile,
  UpdateOwnSponsorProfileInput,
} from "@/features/SponsorProfile/types";
import { api } from "@/services/http";

export function getOwnSponsorProfile() {
  return api.get<OwnSponsorProfile>("/sponsors/me/profile");
}

export function createOwnSponsorProfile(input: CreateOwnSponsorProfileInput) {
  return api.post<OwnSponsorProfile>("/sponsors/me/profile", input);
}

export function updateOwnSponsorProfile(input: UpdateOwnSponsorProfileInput) {
  return api.put<OwnSponsorProfile>("/sponsors/me/profile", input);
}
