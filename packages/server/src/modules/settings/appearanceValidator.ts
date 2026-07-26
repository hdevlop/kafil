import type { NajmDesignConfig } from "najm-kit";
import { Service } from "najm-core";
import { z } from "zod";

export const MAX_APPEARANCE_CONFIG_BYTES = 32_768;

export const APPEARANCE_THEME_TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "tertiary",
  "tertiary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

const radiusValues = [
  "0",
  "2px",
  "4px",
  "6px",
  "8px",
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "0.5rem",
] as const;
const borderWidthValues = ["0", "1px", "2px"] as const;
const layoutSizeValues = [
  "8px",
  "10px",
  "12px",
  "16px",
  "20px",
  "24px",
  "32px",
  "40px",
  "48px",
] as const;
const fontSizeValues = ["14px", "15px", "16px", "17px", "18px"] as const;
const lineHeightValues = ["1.2", "1.4", "1.5", "1.6", "1.75"] as const;
const letterSpacingValues = [
  "-0.02em",
  "-0.01em",
  "0",
  "0.01em",
  "0.02em",
] as const;
const modes = ["light", "dark"] as const;
const accents = [
  "neutral",
  "emerald",
  "green",
  "slate",
  "blue",
  "violet",
] as const;
const presets = [
  "light",
  "dark",
  "dark-emerald",
  "dark-green",
  "dark-slate",
  "dark-blue",
  "dark-violet",
] as const;

const hexColorPattern = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const colorFunctionPattern = /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([\d.eE+\-,%/\sdegturnrad]+\)$/i;
const colorKeywordPattern = /^(?:black|white|transparent|currentcolor)$/i;
const colorVariablePattern = /^var\(--[a-z][a-z0-9-]*\)$/i;
const unsafeCssPattern = /(?:url\s*\(|data:|https?:|@import|[;{}<>])/i;

const colorDto = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      !unsafeCssPattern.test(value) &&
      (hexColorPattern.test(value) ||
        colorFunctionPattern.test(value) ||
        colorKeywordPattern.test(value)),
    "Unsupported theme color",
  );

const componentColorDto = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      !unsafeCssPattern.test(value) &&
      (hexColorPattern.test(value) ||
        colorFunctionPattern.test(value) ||
        colorKeywordPattern.test(value) ||
        colorVariablePattern.test(value)),
    "Unsupported component color",
  );

const fontFamilyDto = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((value) => !unsafeCssPattern.test(value), "Unsafe font family");

const themeTokensDto = z
  .object({
    background: colorDto.optional(),
    foreground: colorDto.optional(),
    card: colorDto.optional(),
    "card-foreground": colorDto.optional(),
    popover: colorDto.optional(),
    "popover-foreground": colorDto.optional(),
    primary: colorDto.optional(),
    "primary-foreground": colorDto.optional(),
    secondary: colorDto.optional(),
    "secondary-foreground": colorDto.optional(),
    tertiary: colorDto.optional(),
    "tertiary-foreground": colorDto.optional(),
    muted: colorDto.optional(),
    "muted-foreground": colorDto.optional(),
    accent: colorDto.optional(),
    "accent-foreground": colorDto.optional(),
    destructive: colorDto.optional(),
    "destructive-foreground": colorDto.optional(),
    border: colorDto.optional(),
    input: colorDto.optional(),
    ring: colorDto.optional(),
    sidebar: colorDto.optional(),
    "sidebar-foreground": colorDto.optional(),
    "sidebar-primary": colorDto.optional(),
    "sidebar-primary-foreground": colorDto.optional(),
    "sidebar-accent": colorDto.optional(),
    "sidebar-accent-foreground": colorDto.optional(),
    "sidebar-border": colorDto.optional(),
    "sidebar-ring": colorDto.optional(),
    "chart-1": colorDto.optional(),
    "chart-2": colorDto.optional(),
    "chart-3": colorDto.optional(),
    "chart-4": colorDto.optional(),
    "chart-5": colorDto.optional(),
  })
  .strict();

const responsiveWidthDto = z.union([
  z.number().int().min(48).max(512),
  z
    .object({
      base: z.number().int().min(48).max(512).optional(),
      sm: z.number().int().min(48).max(512).optional(),
      md: z.number().int().min(48).max(512).optional(),
      lg: z.number().int().min(48).max(512).optional(),
      xl: z.number().int().min(48).max(512).optional(),
      "2xl": z.number().int().min(48).max(512).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "Width cannot be empty"),
]);

const typographyDto = z
  .object({
    fontSans: fontFamilyDto.optional(),
    fontHeading: fontFamilyDto.optional(),
    fontMono: fontFamilyDto.optional(),
    baseSize: z.enum(fontSizeValues).optional(),
    scale: z.enum(["compact", "default", "comfortable"]).optional(),
    lineHeight: z.enum(lineHeightValues).optional(),
    letterSpacing: z.enum(letterSpacingValues).optional(),
  })
  .strict();

const themeDto = z
  .object({
    preset: z.enum(presets).optional(),
    mode: z.enum(modes).optional(),
    accent: z.enum(accents).optional(),
    tokens: themeTokensDto.optional(),
    overrides: z
      .object({
        light: themeTokensDto.optional(),
        dark: themeTokensDto.optional(),
      })
      .strict()
      .optional(),
    accentOnly: z.boolean().optional(),
    appearance: z
      .object({ borderWidth: z.enum(borderWidthValues).optional() })
      .strict()
      .optional(),
    radius: z.enum(radiusValues).optional(),
  })
  .strict();

const componentsDto = z
  .object({
    pageHeader: z.object({ card: z.boolean().optional() }).strict().optional(),
    sidebar: z
      .object({
        showSectionLabels: z.boolean().optional(),
        showSectionSeparators: z.boolean().optional(),
        expandedWidth: responsiveWidthDto.optional(),
        collapsedWidth: responsiveWidthDto.optional(),
        mobileWidth: responsiveWidthDto.optional(),
      })
      .strict()
      .optional(),
    table: z
      .object({
        headerColor: componentColorDto.optional(),
        headerTextColor: componentColorDto.optional(),
        borderColor: componentColorDto.optional(),
      })
      .strict()
      .optional(),
    input: z
      .object({ borderWidth: z.enum(borderWidthValues).optional() })
      .strict()
      .optional(),
  })
  .strict();

const designConfigDto = z
  .object({
    version: z.literal(1),
    theme: themeDto,
    typography: typographyDto.optional(),
    components: componentsDto.optional(),
    layout: z
      .object({
        pageGutter: z.enum(layoutSizeValues).optional(),
        sectionGap: z.enum(layoutSizeValues).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const appearanceDesignConfigDto = z
  .unknown()
  .superRefine((value, context) => {
    try {
      const serialized = JSON.stringify(value);
      if (
        serialized === undefined ||
        Buffer.byteLength(serialized, "utf8") > MAX_APPEARANCE_CONFIG_BYTES
      ) {
        context.addIssue({
          code: "custom",
          message: "Appearance design exceeds the size limit",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Appearance design must be JSON-serializable",
      });
    }
  })
  .pipe(designConfigDto)
  .transform((value) => value as NajmDesignConfig);

export function parseAppearanceDesignConfig(input: unknown): NajmDesignConfig {
  return appearanceDesignConfigDto.parse(input);
}

@Service()
export class AppearanceValidator {
  parse(input: unknown) {
    return parseAppearanceDesignConfig(input);
  }

  safeParse(input: unknown) {
    return appearanceDesignConfigDto.safeParse(input);
  }

  mergeEditable(
    current: NajmDesignConfig,
    submitted: NajmDesignConfig,
  ): NajmDesignConfig {
    const next = structuredClone(current) as unknown as Record<string, unknown>;
    const candidate = submitted as unknown as Record<string, unknown>;
    const nextTheme = asRecord(next.theme);
    const candidateTheme = asRecord(candidate.theme);

    for (const field of ["tokens", "overrides", "radius", "appearance"]) {
      replaceOptional(nextTheme, candidateTheme, field);
    }
    next.theme = nextTheme;

    const nextComponents = asRecord(next.components);
    const candidateComponents = asRecord(candidate.components);
    replaceComponentFields(nextComponents, candidateComponents, "pageHeader", [
      "card",
    ]);
    replaceComponentFields(nextComponents, candidateComponents, "sidebar", [
      "showSectionLabels",
      "showSectionSeparators",
    ]);
    replaceComponentFields(nextComponents, candidateComponents, "table", [
      "headerColor",
      "headerTextColor",
      "borderColor",
    ]);
    replaceComponentFields(nextComponents, candidateComponents, "input", [
      "borderWidth",
    ]);

    if (Object.keys(nextComponents).length > 0) {
      next.components = nextComponents;
    } else {
      delete next.components;
    }
    replaceOptional(next, candidate, "layout");

    return parseAppearanceDesignConfig(next);
  }

  changedGroups(
    previous: NajmDesignConfig,
    next: NajmDesignConfig,
  ): string[] {
    const groups = [
      ["surface", () => tokenSnapshot(previous, next, tokenGroups.surface)],
      ["brand", () => tokenSnapshot(previous, next, tokenGroups.brand)],
      ["feedback", () => tokenSnapshot(previous, next, tokenGroups.feedback)],
      [
        "borderFocus",
        () => tokenSnapshot(previous, next, tokenGroups.borderFocus),
      ],
      ["sidebar", () => sidebarSnapshot(previous, next)],
      ["charts", () => tokenSnapshot(previous, next, tokenGroups.charts)],
      ["appearance", () => appearanceSnapshot(previous, next)],
      ["table", () => componentSnapshot(previous, next, "table")],
      ["layout", () => pair(previous.layout, next.layout)],
      [
        "pageHeader",
        () => componentSnapshot(previous, next, "pageHeader"),
      ],
      ["input", () => componentSnapshot(previous, next, "input")],
    ] as const;

    return groups
      .filter(([, snapshot]) => snapshot())
      .map(([name]) => name);
  }
}

const tokenGroups = {
  surface: [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
  ],
  brand: [
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "tertiary",
    "tertiary-foreground",
    "accent",
    "accent-foreground",
  ],
  feedback: [
    "muted",
    "muted-foreground",
    "destructive",
    "destructive-foreground",
  ],
  borderFocus: ["border", "input", "ring"],
  sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
  charts: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
} as const;

function replaceOptional(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  field: string,
) {
  if (Object.hasOwn(source, field)) {
    target[field] = structuredClone(source[field]);
  } else {
    delete target[field];
  }
}

function replaceComponentFields(
  components: Record<string, unknown>,
  submittedComponents: Record<string, unknown>,
  name: string,
  fields: readonly string[],
) {
  const component = asRecord(components[name]);
  const submitted = asRecord(submittedComponents[name]);
  for (const field of fields) replaceOptional(component, submitted, field);

  if (Object.keys(component).length > 0) {
    components[name] = component;
  } else {
    delete components[name];
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function tokenSnapshot(
  previous: NajmDesignConfig,
  next: NajmDesignConfig,
  keys: readonly string[],
) {
  return pair(themeTokenSnapshot(previous, keys), themeTokenSnapshot(next, keys));
}

function themeTokenSnapshot(
  design: NajmDesignConfig,
  keys: readonly string[],
) {
  return {
    tokens: pick(asRecord(design.theme.tokens), keys),
    light: pick(asRecord(design.theme.overrides?.light), keys),
    dark: pick(asRecord(design.theme.overrides?.dark), keys),
  };
}

function sidebarSnapshot(previous: NajmDesignConfig, next: NajmDesignConfig) {
  const previousSidebar = asRecord(previous.components?.sidebar);
  const nextSidebar = asRecord(next.components?.sidebar);
  return pair(
    {
      colors: themeTokenSnapshot(previous, tokenGroups.sidebar),
      showSectionLabels: previousSidebar.showSectionLabels,
      showSectionSeparators: previousSidebar.showSectionSeparators,
    },
    {
      colors: themeTokenSnapshot(next, tokenGroups.sidebar),
      showSectionLabels: nextSidebar.showSectionLabels,
      showSectionSeparators: nextSidebar.showSectionSeparators,
    },
  );
}

function appearanceSnapshot(previous: NajmDesignConfig, next: NajmDesignConfig) {
  return pair(
    {
      radius: previous.theme.radius,
      borderWidth: previous.theme.appearance?.borderWidth,
    },
    {
      radius: next.theme.radius,
      borderWidth: next.theme.appearance?.borderWidth,
    },
  );
}

function componentSnapshot(
  previous: NajmDesignConfig,
  next: NajmDesignConfig,
  name: "input" | "pageHeader" | "table",
) {
  return pair(previous.components?.[name], next.components?.[name]);
}

function pair(previous: unknown, next: unknown) {
  return JSON.stringify(previous) !== JSON.stringify(next);
}

function pick(source: Record<string, unknown>, keys: readonly string[]) {
  const selected: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.hasOwn(source, key)) selected[key] = source[key];
  }
  return selected;
}
