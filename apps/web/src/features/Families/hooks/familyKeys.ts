import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "najm-kit/pagination";
import type {
  ListFamiliesFilters,
  SponsorFamilyCatalogFilters,
} from "@/services/familyApi";

export const familyKeys = {
  all: entityKeys.all("families"),
  list(
    pagination: OffsetPagination,
    filters: ListFamiliesFilters = {},
  ) {
    return entityKeys.list("families", {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });
  },
  sponsorCatalog(filters: SponsorFamilyCatalogFilters = {}) {
    return ["families", "sponsor-catalog", filters] as const;
  },
  detail(id: string) {
    return entityKeys.detail("families", id);
  },
};
