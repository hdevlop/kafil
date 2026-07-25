import {
  buildFormFill,
  type FormFillOverrides,
} from "@kafil/seed/fakers";
import type { z } from "zod";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getFormFillSetting } from "@/services/settingApi";

const formFillSettingKey = ["settings", "form-fill"] as const;

function useRuntimeFormFillEnabled() {
  const setting = useEntityQuery({
    queryKey: formFillSettingKey,
    queryFn: getFormFillSetting,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  return setting.data?.enabled === true;
}

export function useDevFormTools<TSchema extends z.ZodType>(
  schema: TSchema,
  overrides: FormFillOverrides = {},
) {
  const enabled = useRuntimeFormFillEnabled();

  return {
    enabled,
    fill: () => buildDevFormFill(schema, overrides),
  };
}

export function useFormFillEnabled() {
  return useRuntimeFormFillEnabled();
}

export function buildDevFormFill<TSchema extends z.ZodType>(
  schema: TSchema,
  overrides: FormFillOverrides = {},
) {
  return buildFormFill(schema, overrides) as Partial<z.infer<TSchema>>;
}
