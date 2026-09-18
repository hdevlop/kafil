import { entityKeys } from "najm-kit/query/keys";

export const deliveryOrderKeys = {
  all: entityKeys.all("delivery-orders"),
  detail(id: string) {
    return entityKeys.detail("delivery-orders", id);
  },
};
