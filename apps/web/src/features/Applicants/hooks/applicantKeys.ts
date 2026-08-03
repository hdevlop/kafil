export const applicantKeys = {
  all: ["applicants"] as const,
  list: () => [...applicantKeys.all, "list"] as const,
};
