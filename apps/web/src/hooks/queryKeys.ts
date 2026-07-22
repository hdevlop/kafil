import type { QueryKey } from "@tanstack/react-query";

export const entityKeys = {
  all(entity: string): QueryKey {
    return [entity];
  },
  list(entity: string, filters?: Record<string, unknown>): QueryKey {
    return filters ? [entity, "list", filters] : [entity, "list"];
  },
  detail(entity: string, id: string): QueryKey {
    return [entity, "detail", id];
  },
};
