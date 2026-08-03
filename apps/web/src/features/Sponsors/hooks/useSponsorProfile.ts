"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  createOwnSponsorProfile,
  getOwnSponsorProfile,
  updateOwnSponsorProfile,
} from "@/services/sponsorProfileApi";

import { sponsorProfileKeys } from "./sponsorProfileKeys";

export function useOwnSponsorProfile() {
  return useEntityQuery({
    queryKey: sponsorProfileKeys.profile,
    queryFn: getOwnSponsorProfile,
  });
}

export function useOwnSponsorProfileCommands() {
  const invalidate = [sponsorProfileKeys.all];

  const create = useEntityCommand({
    mutationFn: createOwnSponsorProfile,
    invalidate,
    successMessage: "Sponsor profile completed.",
    errorMessage: "Could not complete your sponsor profile.",
  });

  const update = useEntityCommand({
    mutationFn: updateOwnSponsorProfile,
    invalidate,
    successMessage: "Sponsor profile updated.",
    errorMessage: "Could not update your sponsor profile.",
  });

  return { create, update };
}
