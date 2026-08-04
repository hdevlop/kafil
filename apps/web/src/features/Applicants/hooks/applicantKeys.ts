export const applicantKeys = {
  all: ["applicants"] as const,
  list: () => [...applicantKeys.all, "list"] as const,
  detail: (id: string) => [...applicantKeys.all, "detail", id] as const,
  count: (status: string) => [...applicantKeys.all, "count", status] as const,
};
