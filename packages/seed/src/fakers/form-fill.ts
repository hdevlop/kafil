import { faker } from "@faker-js/faker";

import { moroccanFullName } from "./moroccan-names";

export type FormFillOverride =
  | unknown
  | readonly unknown[]
  | ((fieldName: string) => unknown);

export type FormFillOverrides = Record<string, FormFillOverride>;

type ZodLike = {
  _def?: object;
  def?: object;
  element?: unknown;
  options?: readonly unknown[];
  shape?: Record<string, unknown> | (() => Record<string, unknown>);
};

const SCHOOL_LEVELS = ["Primary", "Middle school", "Secondary school"] as const;
const CLOTHING_SIZES = ["6 years", "8 years", "10 years", "12 years"] as const;
const CITIES = [
  "Agadir",
  "Casablanca",
  "Fes",
  "Marrakech",
  "Rabat",
  "Tangier",
] as const;
const STREETS = [
  "Avenue Hassan II",
  "Avenue Mohammed V",
  "Boulevard Anfa",
  "Boulevard Zerktouni",
  "Rue Ibn Sina",
] as const;
const ACTIVATION_TARGETS_MAD = ["7000", "7500", "8000", "8500", "9000"] as const;

function asZodLike(schema: unknown): ZodLike | undefined {
  return schema && typeof schema === "object" ? (schema as ZodLike) : undefined;
}

function definition(schema: unknown): Record<string, unknown> {
  const current = asZodLike(schema);
  return (current?._def ?? current?.def ?? {}) as Record<string, unknown>;
}

function schemaKind(schema: unknown) {
  return String(definition(schema).type ?? "");
}

function unwrap(schema: unknown): ZodLike | undefined {
  const seen = new Set<ZodLike>();
  let current = asZodLike(schema);

  while (current && !seen.has(current)) {
    seen.add(current);
    const kind = schemaKind(current);
    const currentDefinition = definition(current);
    const inner =
      currentDefinition.innerType ??
      currentDefinition.schema ??
      (kind === "pipe"
        ? currentDefinition.out ?? currentDefinition.in
        : undefined);

    if (!inner || typeof inner !== "object") break;
    current = inner as ZodLike;
  }

  return current;
}

function objectShape(schema: unknown): Record<string, unknown> | null {
  const current = unwrap(schema);
  if (schemaKind(current) !== "object") return null;
  const shape = current?.shape ?? definition(current).shape;
  return typeof shape === "function"
    ? shape()
    : ((shape ?? null) as Record<string, unknown> | null);
}

function arrayElement(schema: unknown) {
  const current = unwrap(schema);
  if (schemaKind(current) !== "array") return null;
  const currentDefinition = definition(current);
  const element = current?.element ?? currentDefinition.element;
  return element && typeof element === "object" ? (element as ZodLike) : null;
}

function enumValues(schema: unknown): unknown[] {
  const current = unwrap(schema);
  if (schemaKind(current) === "literal") {
    const values = definition(current).values;
    return Array.isArray(values) ? values : [];
  }
  if (schemaKind(current) !== "enum") return [];

  const entries = definition(current).entries;
  if (entries && typeof entries === "object") return Object.values(entries);
  return Array.isArray(current?.options) ? [...current.options] : [];
}

function pick<T>(values: readonly T[]): T | undefined {
  return values.length ? faker.helpers.arrayElement([...values]) : undefined;
}

function resolveOverride(override: FormFillOverride, fieldName: string) {
  if (typeof override === "function") return override(fieldName);
  if (Array.isArray(override)) {
    const value = pick(override);
    if (value && typeof value === "object" && "value" in value) {
      return (value as { value: unknown }).value;
    }
    return value;
  }
  return override;
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function moroccanName(gender?: unknown) {
  return moroccanFullName(gender === "F" || gender === "M" ? gender : undefined);
}

function moroccanAddress() {
  return `${faker.number.int({ min: 1, max: 300 })} ${pick(STREETS)}, ${pick(CITIES)}`;
}

function fieldValue(
  fieldName: string,
  schema: unknown,
  siblingFields: ReadonlySet<string>,
): unknown {
  const key = fieldName.toLowerCase();
  const current = unwrap(schema);
  const kind = schemaKind(current);
  const format = String(definition(current).format ?? "");
  const values = enumValues(schema);

  if (values.length) return pick(values);
  if (kind === "boolean") return true;
  if (kind === "number") {
    if (key.includes("sortorder")) return faker.number.int({ min: 1, max: 50 });
    if (key.includes("quantity")) return faker.number.int({ min: 2, max: 40 });
    return faker.number.int({ min: 1, max: 100 });
  }
  if (format === "uuid") return faker.string.uuid();
  if (format === "email" || key.includes("email")) return faker.internet.email().toLowerCase();
  if (
    format === "url" ||
    key === "image" ||
    key.includes("imageurl") ||
    key.endsWith("url")
  ) {
    return `https://picsum.photos/seed/${faker.string.alphanumeric(10)}/800/600`;
  }
  if (key === "month") return `${new Date().toISOString().slice(0, 7)}-01`;
  if (format === "date" || key.includes("dateofbirth")) {
    const child =
      siblingFields.has("schoolLevel") || siblingFields.has("clothingSize");
    return dateInput(
      faker.date.birthdate({
        min: child ? 4 : 25,
        max: child ? 17 : 70,
        mode: "age",
      }),
    );
  }
  if (key.endsWith("id") || key.endsWith("by")) return "";
  if (key === "name") {
    if (siblingFields.has("sku")) return faker.commerce.productName();
    if (siblingFields.has("slug")) return faker.commerce.department();
    return moroccanName();
  }
  if (key.includes("legalname")) return moroccanName();
  if (key.includes("phone")) return `+2126${faker.string.numeric(8)}`;
  if (key.endsWith("cin")) {
    return `${faker.string.alpha({ length: 2, casing: "upper" })}${faker.string.numeric(6)}`;
  }
  if (key.includes("address")) return moroccanAddress();
  if (key.includes("schoollevel")) return pick(SCHOOL_LEVELS);
  if (key.includes("clothingsize")) return pick(CLOTHING_SIZES);
  if (key.includes("shoesize")) return String(faker.number.int({ min: 28, max: 42 }));
  if (key.includes("relationship")) return pick(["Mother", "Father", "Legal guardian"]);
  if (key.includes("activationtargetmad")) return pick(ACTIVATION_TARGETS_MAD);
  if (key === "slug") return faker.helpers.slugify(faker.commerce.department()).toLowerCase();
  if (key === "sku") return `KAF-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`;
  if (key.includes("amountmad") || key.includes("pricemad") || key.includes("limitmad")) {
    return faker.commerce.price({ min: 50, max: 2_500, dec: 2 });
  }
  if (key.includes("reason")) return "Generated locally for development form testing.";
  if (key.includes("notes")) return faker.lorem.sentence();
  if (key.includes("description")) return faker.commerce.productDescription();
  if (key.includes("code")) return faker.string.alphanumeric({ length: 8, casing: "upper" });

  return faker.lorem.words({ min: 2, max: 5 });
}

/**
 * Produces form-shaped development data from a Zod object schema. Callers
 * should override relation fields with options loaded by the live form.
 */
export function buildFormFill(
  schema: unknown,
  overrides: FormFillOverrides = {},
): Record<string, unknown> {
  const shape = objectShape(schema) ?? {};
  const siblingFields = new Set(Object.keys(shape));
  const output: Record<string, unknown> = {};

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if (Object.prototype.hasOwnProperty.call(overrides, fieldName)) {
      output[fieldName] = resolveOverride(overrides[fieldName], fieldName);
      continue;
    }

    const nestedShape = objectShape(fieldSchema);
    if (nestedShape) {
      output[fieldName] = buildFormFill(fieldSchema);
      continue;
    }

    const element = arrayElement(fieldSchema);
    if (element) {
      output[fieldName] = objectShape(element)
        ? [buildFormFill(element)]
        : [fieldValue(fieldName, element, siblingFields)];
      continue;
    }

    output[fieldName] = fieldValue(fieldName, fieldSchema, siblingFields);
  }

  const generatedGender = output.gender;
  if (generatedGender === "F" || generatedGender === "M") {
    if (Object.prototype.hasOwnProperty.call(shape, "legalName") &&
        !Object.prototype.hasOwnProperty.call(overrides, "legalName")) {
      output.legalName = moroccanName(generatedGender);
    }
    if (Object.prototype.hasOwnProperty.call(shape, "name") &&
        !Object.prototype.hasOwnProperty.call(overrides, "name")) {
      output.name = moroccanName(generatedGender);
    }
  }

  return output;
}

export { pick };
