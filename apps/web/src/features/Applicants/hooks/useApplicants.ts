"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";

import { listApplicants } from "../services/api";
import { applicantKeys } from "./applicantKeys";

export function useApplicants() {
  return useEntityQuery({
    queryKey: applicantKeys.list(),
    queryFn: listApplicants,
  });
}
