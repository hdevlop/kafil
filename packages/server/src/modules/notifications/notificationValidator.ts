import { HttpError, Service } from "najm-core";

import { notificationLocaleDto } from "./notificationDto";

@Service()
export class NotificationValidator {
  ensureLocale(value: unknown): "en" | "fr" | "ar" | "es" {
    const parsed = notificationLocaleDto.safeParse(value);
    if (!parsed.success) HttpError.badRequest("Unsupported locale");
    return parsed.data;
  }

  ensureTopicBounded(topic: string) {
    if (!topic || topic.length > 120) HttpError.badRequest("Invalid topic");
  }
}
