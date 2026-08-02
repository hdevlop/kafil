import type {
  SponsorOrderQuery,
  SponsorSupportedOrder,
} from "@/features/Orders/sponsorTypes";
import { api } from "@/services/http";

export function listSponsorOrders(query: SponsorOrderQuery) {
  return api.get<SponsorSupportedOrder[]>("/orders/supported", {
    query: { limit: query.limit, offset: query.offset },
  });
}
