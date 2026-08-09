"use client";

import {
  Building2,
  Calendar,
  CircleUserRound,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { NCard, NCardSection, NDetailList, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { StaffRecord } from "../types";

export function StaffDetails({
  staff,
}: Readonly<{ staff: StaffRecord }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();

  const labels = {
    delivery: t("operator.staff.functionDelivery"),
    operator: t("operator.staff.functionOperator"),
  };

  const functionList = staff.functions.length === 0
    ? t("operator.staff.noFunctions")
    : staff.functions
        .map((fn) => (fn === "operator" ? labels.operator : labels.delivery))
        .join(", ");

  const affiliationLabel =
    staff.affiliation === "external"
      ? `${t("operator.staff.external")}${staff.companyName ? ` · ${staff.companyName}` : ""}`
      : t("operator.staff.internal");

  const accessLabel = staff.hasOperatorAccess
    ? staff.email || t("operator.staff.active")
    : t("operator.staff.noApplicationAccount");

  return (
    <div className="space-y-5">
      <NCard embedded>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <ManagedAvatar
              src={getPersonImage({ image: staff.image, role: "adult", gender: staff.gender })}
              alt={staff.name}
              size="xl"
            />
            <div>
              <p className="text-lg font-semibold">{staff.name}</p>
              <p className="text-sm text-muted-foreground">
                {staff.jobTitle || t("operator.staff.notProvided")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {affiliationLabel}
              </p>
            </div>
          </div>
          <StatusBadge status={staff.status} />
        </div>
      </NCard>

      <NCard
        title={t("operator.staff.detailsContact")}
        description={t("operator.staff.subtitle")}
      >
        <NCardSection density="responsive" surface="responsive">
          <NDetailList
            items={[
              {
                icon: Phone,
                label: t("operator.staff.phone"),
                value: staff.phone || t("operator.staff.notProvided"),
              },
              {
                icon: Mail,
                label: t("operator.staff.email"),
                value: staff.email || t("operator.staff.noApplicationAccount"),
              },
              {
                icon: ShieldCheck,
                label: t("operator.staff.detailsAccount"),
                value: accessLabel,
              },
            ]}
          />
        </NCardSection>
      </NCard>

      <NCard title={t("operator.staff.detailsFunctions")}>
        <NCardSection density="responsive" surface="responsive">
          <NDetailList
            items={[
              {
                icon: CircleUserRound,
                label: t("operator.staff.functions"),
                value: functionList,
              },
              {
                icon: Building2,
                label: t("operator.staff.detailsAffiliation"),
                value: affiliationLabel,
              },
              {
                icon: Building2,
                label: t("operator.staff.detailsCompany"),
                value:
                  staff.affiliation === "external"
                    ? staff.companyName || t("operator.staff.notProvided")
                    : t("operator.staff.internal"),
              },
            ]}
          />
        </NCardSection>
      </NCard>

      <NCard title={t("operator.staff.detailsPrivateProfile")}>
        <NCardSection density="responsive" surface="responsive">
          <NDetailList
            items={[
              {
                icon: IdCard,
                label: t("operator.staff.cin"),
                value: staff.cin || t("operator.staff.notProvided"),
              },
              {
                icon: CircleUserRound,
                label: t("operator.staff.gender"),
                value:
                  staff.gender === "F"
                    ? t("operator.staff.female")
                    : staff.gender === "M"
                      ? t("operator.staff.male")
                      : t("operator.staff.notProvided"),
              },
              {
                icon: MapPin,
                label: t("operator.staff.address"),
                value: staff.address || t("operator.staff.notProvided"),
              },
              {
                icon: Calendar,
                label: t("operator.staff.dateOfBirth"),
                value: fmt.date(staff.dateOfBirth),
              },
            ]}
          />
        </NCardSection>
      </NCard>

      <NCard title={t("operator.staff.detailsLifecycle")}>
        <NCardSection density="responsive" surface="responsive">
          <NDetailList
            items={[
              {
                icon: Calendar,
                label: t("operator.staff.created"),
                value: fmt.date(staff.createdAt),
              },
              {
                icon: Calendar,
                label: t("operator.staff.created"),
                value: fmt.date(staff.updatedAt),
              },
            ]}
          />
        </NCardSection>
      </NCard>
    </div>
  );
}