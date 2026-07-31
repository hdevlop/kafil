import { z } from "zod";

import { STAFF_IMAGE_SERVE_ROUTE } from "@/services/staffApi";

import type {
  CreateStaffInput,
  StaffFunctionKey,
  StaffProfileInput,
  UpdateStaffInput,
} from "../types";

export const STAFF_FUNCTION_VALUES = ["operator", "delivery"] as const;

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const trimmedRequired = (maximum: number) =>
  z.string().trim().min(1).max(maximum);

export const createStaffFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name").max(120),
  phone: trimmedRequired(40),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  image: z
    .union([
      z.file(),
      z.url().max(2_000),
      z.literal(""),
      z.string().startsWith(STAFF_IMAGE_SERVE_ROUTE).max(2_000),
    ])
    .optional(),
  affiliation: z.enum(["internal", "external"]),
  companyName: optionalText(160),
  role: z.enum(STAFF_FUNCTION_VALUES),
  jobTitle: optionalText(120),
  notes: optionalText(2_000),
  cin: optionalText(20),
  gender: z.enum(["M", "F"]).optional(),
  address: optionalText(500),
  dateOfBirth: z.union([z.literal(""), z.iso.date("Enter a valid date")]).optional(),
}).superRefine((data, context) => {
  if (data.affiliation === "external" && !data.companyName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Company name is required for external staff records.",
      path: ["companyName"],
    });
  }

  for (const [field, valid, message] of [
    ["contactEmail", Boolean(data.contactEmail), "Email is required for staff records."],
    ["cin", Boolean(data.cin && data.cin.trim().length >= 8), "CIN is required for staff records."],
    ["gender", Boolean(data.gender), "Gender is required for staff records."],
    ["address", Boolean(data.address?.trim()), "Address is required for staff records."],
    ["dateOfBirth", Boolean(data.dateOfBirth), "Date of birth is required for staff records."],
  ] as const) {
    if (!valid) {
      context.addIssue({ code: "custom", message, path: [field] });
    }
  }
});

export const updateStaffFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name").max(120),
  phone: trimmedRequired(40),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  image: z
    .union([
      z.file(),
      z.url().max(2_000),
      z.literal(""),
      z.string().startsWith(STAFF_IMAGE_SERVE_ROUTE).max(2_000),
      z.null(),
    ])
    .nullish(),
  affiliation: z.enum(["internal", "external"]),
  companyName: optionalText(160),
  role: z.enum(STAFF_FUNCTION_VALUES),
  jobTitle: optionalText(120),
  notes: optionalText(2_000),
  cin: optionalText(20),
  gender: z.enum(["M", "F"]).optional(),
  address: optionalText(500),
  dateOfBirth: z.union([z.literal(""), z.iso.date("Enter a valid date")]).optional(),
}).superRefine((data, context) => {
  if (data.affiliation === "external" && !data.companyName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Company name is required for external staff records.",
      path: ["companyName"],
    });
  }
  for (const [field, valid, message] of [
    ["contactEmail", Boolean(data.contactEmail), "Email is required for staff records."],
    ["cin", Boolean(data.cin && data.cin.trim().length >= 8), "CIN is required for staff records."],
    ["gender", Boolean(data.gender), "Gender is required for staff records."],
    ["address", Boolean(data.address?.trim()), "Address is required for staff records."],
    ["dateOfBirth", Boolean(data.dateOfBirth), "Date of birth is required for staff records."],
  ] as const) {
    if (!valid) {
      context.addIssue({ code: "custom", message, path: [field] });
    }
  }
});

export const staffStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export const provisionStaffAccessSchema = z.object({
  email: z.email("Enter a valid email"),
});

export type CreateStaffFormValues = z.infer<typeof createStaffFormSchema>;
export type UpdateStaffFormValues = z.infer<typeof updateStaffFormSchema>;
export type StaffStatusFormValues = z.infer<typeof staffStatusFormSchema>;
export type ProvisionStaffAccessValues = z.infer<
  typeof provisionStaffAccessSchema
>;

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeFunctions(values: readonly StaffFunctionKey[]): StaffFunctionKey[] {
  const seen = new Set<StaffFunctionKey>();
  const list: StaffFunctionKey[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      list.push(value);
    }
  }
  return list;
}

interface FormLikeValues {
  address?: string | null | undefined;
  affiliation: "internal" | "external";
  cin?: string | null | undefined;
  companyName?: string | null | undefined;
  contactEmail?: string | null | undefined;
  dateOfBirth?: string | null | undefined;
  role: "operator" | "delivery";
  gender?: "M" | "F" | null | undefined;
  image?: string | File | null | undefined;
  jobTitle?: string | null | undefined;
  name: string;
  notes?: string | null | undefined;
  phone: string;
}

function toStaffProfileInput(
  values: FormLikeValues,
): Omit<StaffProfileInput, "createOperatorAccess" | "createOperatorAccessEmail"> {
  const affiliation = "internal";
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    contactEmail: nullable(values.contactEmail),
    image: normalizeImage(values.image),
    affiliation,
    companyName: null,
    functions: normalizeFunctions([values.role]),
    jobTitle: optional(values.jobTitle) ?? null,
    notes: optional(values.notes) ?? null,
    cin: optional(values.cin)?.toUpperCase() ?? null,
    gender: values.gender ?? null,
    address: optional(values.address) ?? null,
    dateOfBirth: optional(values.dateOfBirth) ?? null,
  };
}

function normalizeImage(value: string | File | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toCreateStaffInput(
  values: FormLikeValues,
): CreateStaffInput {
  const profile = toStaffProfileInput(values);
  return {
    ...profile,
    createOperatorAccess: values.role === "operator",
    createOperatorAccessEmail:
      values.role === "operator"
        ? nullable(values.contactEmail) ?? undefined
        : undefined,
  };
}

export function toUpdateStaffInput(
  values: UpdateStaffFormValues,
): UpdateStaffInput {
  const profile = toStaffProfileInput({
    ...values,
  });
  return {
    ...profile,
    image: profile.image ?? undefined,
  };
}
