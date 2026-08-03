import { buildDevFormFill } from "@/lib/devFormFill";
import { localDateInput } from "@/lib/date";
import { createFamilyFormSchema } from "../../config/familySchemas";
import type { CreateFamilyFormValues } from "../../config/familySchemas";

export const MAX_FAMILY_IMAGE_SIZE = 5_000_000;
export const FAMILY_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function createFamilyDefaultValues(): CreateFamilyFormValues {
  return {
    name: "",
    email: "",
    guardianCin: "",
    guardianDateOfBirth: "",
    relationshipToChildren: "",
    phone: "",
    housingSituation: "" as CreateFamilyFormValues["housingSituation"],
    registrationDate: localDateInput(),
    supportPriority: "normal",
    activationTargetMad: "",
    notes: "",
    exactAddress: "",
    initialChildren: [],
  };
}

export function createFamilyDevFillValues(): CreateFamilyFormValues {
  const generatedFamily = buildDevFormFill(createFamilyFormSchema);
  const firstChild = generatedFamily.initialChildren?.[0];

  if (!firstChild) {
    return createFamilyFormSchema.parse({
      ...createFamilyDefaultValues(),
      ...generatedFamily,
      initialChildren: [],
    });
  }

  const childCount = Math.floor(Math.random() * 4) + 1;
  const initialChildren = Array.from({ length: childCount }, () =>
    buildDevFormFill(createFamilyFormSchema).initialChildren?.[0] ?? firstChild,
  );

  return createFamilyFormSchema.parse({
    ...createFamilyDefaultValues(),
    ...generatedFamily,
    initialChildren,
  });
}

export function familyImageError(file: File) {
  if (!FAMILY_IMAGE_TYPES.has(file.type)) {
    return "Select a PNG, JPEG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_FAMILY_IMAGE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}
