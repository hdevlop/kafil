"use client";

import { useState } from "react";

import { ApplicantForm } from "./ApplicantForm";
import { OtpStep } from "./OtpStep";
import { PendingReview } from "./PendingReview";
import type { ApplicantSubmissionResponse, ApplicantStep } from "../types";

export function ApplicantPage() {
  const [step, setStep] = useState<ApplicantStep>({ kind: "form" });

  if (step.kind === "otp") {
    return (
      <OtpStep
        setup={step.setup}
        onVerified={(destination) =>
          setStep({ kind: "pending_review", destination })
        }
      />
    );
  }

  if (step.kind === "pending_review") {
    return <PendingReview destination={step.destination} />;
  }

  return (
    <ApplicantForm
      onSubmitted={(result: ApplicantSubmissionResponse) =>
        result.nextStep === "applicant_email_otp"
          ? setStep({
              kind: "otp",
              setup: result,
            })
          : result.nextStep === "applicant_pending_review"
            ? setStep({ kind: "pending_review", destination: "" })
            : undefined
      }
    />
  );
}
