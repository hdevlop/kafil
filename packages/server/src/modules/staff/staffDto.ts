import { z } from "zod";

import { phoneDto } from "../../phone";
import {
  STAFF_FUNCTION_KEYS,
  isStaffFunctionKey,
} from "./staffFunctions";
import { STAFF_IMAGE_SERVE_PREFIX } from "./staffImageController";

const baseStaffIdentity = z.object({
  name: z.string().trim().min(1).max(120),
  contactEmail: z.string().email().max(254).nullish(),
  phone: phoneDto,
  image: z
    .union([
      z.url().max(2_000),
      z.string().startsWith(STAFF_IMAGE_SERVE_PREFIX).max(2_000),
    ])
    .nullish(),
  affiliation: z.enum(["internal", "external"]),
  companyName: z.string().trim().max(160).nullish(),
  functions: z
    .array(z.string().min(1).max(32))
    .min(1)
    .max(STAFF_FUNCTION_KEYS.length)
    .superRefine((values, context) => {
      const seen = new Set<string>();
      for (const [index, value] of values.entries()) {
        if (!isStaffFunctionKey(value)) {
          context.addIssue({
            code: "custom",
            message: `Unknown staff function '${value}'`,
            path: [index],
          });
          continue;
        }
        if (seen.has(value)) {
          context.addIssue({
            code: "custom",
            message: `Staff function '${value}' is duplicated`,
            path: [index],
          });
        }
        seen.add(value);
      }
    }),
  jobTitle: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(2_000).nullish(),
});

const privateStaffFields = z.object({
  cin: z.string().trim().min(8).max(20).toUpperCase().nullish(),
  gender: z.enum(["M", "F"]).nullish(),
  address: z.string().trim().min(1).max(500).nullish(),
  dateOfBirth: z.iso.date().nullish(),
});

export const createStaffDto = baseStaffIdentity
  .extend({
    id: z.string().uuid().optional(),
    createOperatorAccess: z.boolean().default(false),
    createOperatorAccessEmail: z
      .string()
      .email()
      .max(254)
      .optional(),
  })
  .extend(privateStaffFields.shape)
  .superRefine((data, context) => {
    const wantsOperator = data.functions.includes("operator");
    if (data.createOperatorAccess && !wantsOperator) {
      context.addIssue({
        code: "custom",
        message:
          "Operator access can only be created when the operator function is selected.",
        path: ["createOperatorAccess"],
      });
    }
    if (data.affiliation === "external") {
      if (!data.companyName || !data.companyName.trim()) {
        context.addIssue({
          code: "custom",
          message: "External staff records require a company name.",
          path: ["companyName"],
        });
      }
      if (data.createOperatorAccess) {
        context.addIssue({
          code: "custom",
          message:
            "External staff records cannot receive a Kafil operator application account.",
          path: ["createOperatorAccess"],
        });
      }
    }
    if (wantsOperator) {
      if (data.affiliation !== "internal") {
        context.addIssue({
          code: "custom",
          message: "Operator staff records must use the internal affiliation.",
          path: ["affiliation"],
        });
      }
      if (!data.contactEmail || !data.contactEmail.trim()) {
        context.addIssue({
          code: "custom",
          message: "Operator staff records require an email.",
          path: ["contactEmail"],
        });
      }
      if (data.createOperatorAccess && !data.createOperatorAccessEmail) {
        context.addIssue({
          code: "custom",
          message:
            "Operator login email is required when operator access is requested.",
          path: ["createOperatorAccessEmail"],
        });
      }
      if (!data.cin) {
        context.addIssue({
          code: "custom",
          message: "Operator staff records require a CIN.",
          path: ["cin"],
        });
      }
      if (!data.gender) {
        context.addIssue({
          code: "custom",
          message: "Operator staff records require a gender.",
          path: ["gender"],
        });
      }
      if (!data.address) {
        context.addIssue({
          code: "custom",
          message: "Operator staff records require an address.",
          path: ["address"],
        });
      }
      if (!data.dateOfBirth) {
        context.addIssue({
          code: "custom",
          message: "Operator staff records require a date of birth.",
          path: ["dateOfBirth"],
        });
      }
    }
  });

export const updateStaffDto = baseStaffIdentity
  .extend({
    contactEmail: z.string().email().max(254).nullish(),
    companyName: z.string().trim().max(160).nullish(),
  })
  .extend(privateStaffFields.shape)
  .partial({ jobTitle: true, notes: true, contactEmail: true, companyName: true })
  .superRefine((data, context) => {
    if (data.affiliation === "external") {
      if (
        data.companyName !== undefined &&
        data.companyName !== null &&
        !data.companyName.trim()
      ) {
        context.addIssue({
          code: "custom",
          message: "External staff records require a company name.",
          path: ["companyName"],
        });
      }
    }
    if (data.functions.includes("operator")) {
      if (data.affiliation !== "internal") {
        context.addIssue({
          code: "custom",
          message: "Operator staff records must use the internal affiliation.",
          path: ["affiliation"],
        });
      }
      for (const [field, valid, message] of [
        ["contactEmail", Boolean(data.contactEmail), "Operator staff records require an email."],
        ["cin", Boolean(data.cin), "Operator staff records require a CIN."],
        ["gender", Boolean(data.gender), "Operator staff records require a gender."],
        ["address", Boolean(data.address), "Operator staff records require an address."],
        ["dateOfBirth", Boolean(data.dateOfBirth), "Operator staff records require a date of birth."],
      ] as const) {
        if (!valid) {
          context.addIssue({ code: "custom", message, path: [field] });
        }
      }
    }
  });

export const provisionOperatorAccessDto = z.object({
  email: z.string().email().max(254),
});

export const staffStatusDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const staffDeleteDto = z.object({
  confirmation: z.literal("DELETE"),
});

export const bulkDeleteStaffDto = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const staffIdParams = z.object({
  id: z.string().uuid(),
});

export const staffListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  affiliation: z.enum(["internal", "external"]).optional(),
  functionKey: z.enum(STAFF_FUNCTION_KEYS).optional(),
  hasAccess: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional(),
  sortBy: z
    .enum(["name", "affiliation", "phone", "status", "createdAt"])
    .default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateStaffDto = z.input<typeof createStaffDto>;
export type UpdateStaffDto = z.input<typeof updateStaffDto>;
export type ProvisionOperatorAccessDto = z.input<
  typeof provisionOperatorAccessDto
>;
export type StaffStatusDto = z.input<typeof staffStatusDto>;
export type StaffDeleteDto = z.input<typeof staffDeleteDto>;
export type BulkDeleteStaffDto = z.input<typeof bulkDeleteStaffDto>;
export type StaffListQuery = z.input<typeof staffListQuery>;
export type StaffIdParams = z.input<typeof staffIdParams>;
