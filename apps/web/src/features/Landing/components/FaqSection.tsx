"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { NButton } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { LANDING_FAQ_ITEMS } from "../config/landingSectionContent";

export function FaqSection() {
  const { t } = useTranslation();
  const [openItemId, setOpenItemId] = useState<string | null>(
    LANDING_FAQ_ITEMS[0]?.id ?? null,
  );
  const questionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusQuestion(index: number) {
    questionRefs.current[index]?.focus();
  }

  function handleQuestionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const lastIndex = LANDING_FAQ_ITEMS.length - 1;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusQuestion(index === lastIndex ? 0 : index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusQuestion(index === 0 ? lastIndex : index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusQuestion(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusQuestion(lastIndex);
    }
  }

  return (
    <section
      aria-labelledby="landing-faq-title"
      className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14 lg:py-16"
      id={LANDING_ANCHORS.faq}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {t("landing.faq.eyebrow")}
      </p>
      <h2
        className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        id="landing-faq-title"
      >
        {t("landing.faq.title")}
      </h2>
      <div aria-hidden className="mt-3 h-1 w-12 rounded-full bg-primary" />

      <div className="mt-6 space-y-2">
        {LANDING_FAQ_ITEMS.map((item, index) => {
          const isOpen = openItemId === item.id;
          const questionId = `landing-faq-question-${item.id}`;
          const panelId = `landing-faq-panel-${item.id}`;

          return (
            <div
              className={`overflow-hidden rounded-xl border border-border ${isOpen ? "bg-primary/5" : "bg-card"}`}
              key={item.id}
            >
              <h3>
                <NButton
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  className="h-auto w-full justify-between gap-4 whitespace-normal px-4 py-4 text-start text-sm font-semibold"
                  id={questionId}
                  onClick={() => setOpenItemId(isOpen ? null : item.id)}
                  onKeyDown={(event) => handleQuestionKeyDown(event, index)}
                  ref={(element) => {
                    questionRefs.current[index] = element;
                  }}
                  rounded="none"
                  type="button"
                  variant="ghost"
                >
                  <span className={isOpen ? "text-primary" : undefined}>
                    {t(item.questionKey)}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={`size-4 shrink-0 motion-safe:transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </NButton>
              </h3>
              <div
                aria-labelledby={questionId}
                className="px-4 pb-4 text-sm leading-6 text-muted-foreground"
                hidden={!isOpen}
                id={panelId}
                role="region"
              >
                {t(item.answerKey)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
