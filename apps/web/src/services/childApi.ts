import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  ChildRecord,
  ChildStatusInput,
  CreateChildInput,
  FamilyOption,
  UpdateChildInput,
} from "@/features/Children/types";

export function listChildren(pagination: OffsetPagination) {
  return api.get<ChildRecord[]>("/children", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function getChild(id: string) {
  return api.get<ChildRecord>(`/children/${id}`);
}

export function createChild(input: CreateChildInput) {
  return api.post<ChildRecord>("/children", input);
}

export function updateChild({
  id,
  input,
}: {
  id: string;
  input: UpdateChildInput;
}) {
  return api.put<ChildRecord>(`/children/${id}`, input);
}

export function deleteChild(id: string) {
  return api.delete<ChildRecord>(`/children/${id}`);
}

export function deactivateChild({ id, reason }: ChildStatusInput) {
  return api.post<ChildRecord>(`/children/${id}/deactivate`, { reason });
}

export function reactivateChild({ id, reason }: ChildStatusInput) {
  return api.post<ChildRecord>(`/children/${id}/reactivate`, { reason });
}

export function listChildFamilies() {
  return api.get<FamilyOption[]>("/families", {
    query: { limit: 100, offset: 0 },
  });
}
