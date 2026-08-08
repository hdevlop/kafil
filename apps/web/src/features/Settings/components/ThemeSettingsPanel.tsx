"use client";

import { NThemeCustomizer, type NajmDesignConfig } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import themeJson from "../../../../../../theme.json";

// Read straight from theme.json: `@/lib/appearanceLoader` pulls in `@kafil/server`.
const factoryDesign = themeJson as NajmDesignConfig;

export function ThemeSettingsPanel({
  value,
  onChange,
  disabled,
}: Readonly<{
  value: NajmDesignConfig;
  onChange: (value: NajmDesignConfig) => void;
  disabled?: boolean;
}>) {
  const { t } = useKafilLanguage();

  return (
    <NThemeCustomizer
      tabs={["theme"]}
      showTabs={false}
      showFileActions={false}
      showResetAction={false}
      value={value}
      factoryValue={structuredClone(factoryDesign)}
      onChange={onChange}
      disabled={disabled}
      labels={{
        themeTab: t("operator.settings.themeTab"),
        resetField: t("operator.settings.resetField"),
        resetSection: t("operator.settings.resetSection"),
        themeSection: t("operator.settings.themeSection"),
        layoutSubsection: t("operator.settings.layoutSection"),
        pageHeaderSubsection: t("operator.settings.pageHeaderSection"),
        sidebarSubsection: t("operator.settings.sidebarSection"),
        tableSubsection: t("operator.settings.tableSection"),
        inputSubsection: t("operator.settings.inputSection"),
      }}
    />
  );
}
