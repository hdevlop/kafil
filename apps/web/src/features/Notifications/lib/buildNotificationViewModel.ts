import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  HandCoins,
  House,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { NotificationLocale } from "../types";

export interface NotificationViewModel {
  title: string;
  body: string;
  icon: LucideIcon;
  token: "success" | "warning" | "destructive" | "default";
  href: string;
}

interface TopicCopy {
  title: Record<NotificationLocale, string>;
  body: Record<NotificationLocale, string>;
}

function entry(
  titleEn: string,
  titleFr: string,
  titleAr: string,
  titleEs: string,
  bodyEn: string,
  bodyFr: string,
  bodyAr: string,
  bodyEs: string,
): TopicCopy {
  return {
    title: { en: titleEn, fr: titleFr, ar: titleAr, es: titleEs },
    body: { en: bodyEn, fr: bodyFr, ar: bodyAr, es: bodyEs },
  };
}

const COPIES: Record<string, TopicCopy> = {
  "contribution.submitted": entry(
    "Contribution submitted", "Contribution soumise", "تم إرسال المساهمة", "Contribución enviada",
    "A contribution was submitted and awaits review.", "Une contribution a été soumise et attend examen.", "تم إرسال مساهمة وهي بانتظار المراجعة.", "Se envió una contribución pendiente de revisión.",
  ),
  "contribution.recorded": entry(
    "Contribution recorded", "Contribution enregistrée", "تم تسجيل المساهمة", "Contribución registrada",
    "An offline contribution was recorded and awaits validation.", "Une contribution hors ligne a été enregistrée.", "تم تسجيل مساهمة خارج الإنترنت وهي بانتظار التحقق.", "Se registró una contribución pendiente de validación.",
  ),
  "contribution.validated": entry(
    "Contribution validated", "Contribution validée", "تم التحقق من المساهمة", "Contribución validada",
    "A contribution was validated and credited to the budget.", "Une contribution a été validée et créditée au budget.", "تم التحقق من مساهمة وإضافتها إلى الميزانية.", "Se validó una contribución y se acreditó al presupuesto.",
  ),
  "contribution.rejected": entry(
    "Contribution rejected", "Contribution rejetée", "تم رفض المساهمة", "Contribución rechazada",
    "A contribution was rejected without changing the budget.", "Une contribution a été rejetée sans modifier le budget.", "تم رفض مساهمة دون تغيير الميزانية.", "Se rechazó una contribución sin cambiar el presupuesto.",
  ),
  "contribution.refunded": entry(
    "Contribution refunded", "Contribution remboursée", "تم استرداد المساهمة", "Contribución reembolsada",
    "A validated contribution was reversed.", "Une contribution validée a été annulée.", "تم عكس مساهمة تم التحقق منها.", "Se revirtió una contribución validada.",
  ),
  "contribution.expired": entry(
    "Contribution expired", "Contribution expirée", "انتهت صلاحية المساهمة", "Contribución vencida",
    "A pending contribution expired without validation.", "Une contribution en attente a expiré.", "انتهت صلاحية مساهمة معلقة دون تحقق.", "Una contribución pendiente venció sin validación.",
  ),
  "order.submitted": entry(
    "Order submitted", "Commande soumise", "تم إرسال الطلب", "Pedido enviado",
    "A household order was submitted.", "Une commande du ménage a été soumise.", "تم إرسال طلب أسرة.", "Se envió un pedido familiar.",
  ),
  "order.assisted_submitted": entry(
    "Assisted order created", "Commande assistée créée", "تم إنشاء طلب بمساعدة", "Pedido asistido creado",
    "An operator created an order for the household.", "Un opérateur a créé une commande pour le ménage.", "أنشأ موظف طلبا للأسرة.", "Un operador creó un pedido para la familia.",
  ),
  "order.approved": entry(
    "Order approved", "Commande approuvée", "تمت الموافقة على الطلب", "Pedido aprobado",
    "An order was approved.", "Une commande a été approuvée.", "تمت الموافقة على طلب.", "Se aprobó un pedido.",
  ),
  "order.rejected": entry(
    "Order rejected", "Commande rejetée", "تم رفض الطلب", "Pedido rechazado",
    "A pending order was rejected.", "Une commande en attente a été rejetée.", "تم رفض طلب معلق.", "Se rechazó un pedido pendiente.",
  ),
  "order.purchase_recorded": entry(
    "Purchase recorded", "Achat enregistré", "تم تسجيل الشراء", "Compra registrada",
    "A purchase receipt was recorded.", "Un reçu d'achat a été enregistré.", "تم تسجيل إيصال شراء.", "Se registró un recibo de compra.",
  ),
  "order.purchase_replaced": entry(
    "Purchase replaced", "Achat remplacé", "تم استبدال الشراء", "Compra reemplazada",
    "A purchase record was replaced.", "Un enregistrement d'achat a été remplacé.", "تم استبدال سجل الشراء.", "Se reemplazó un registro de compra.",
  ),
  "order.delivery_assigned": entry(
    "Delivery assigned", "Livraison assignée", "تم تعيين التوصيل", "Entrega asignada",
    "Delivery staff was assigned.", "Un livreur a été assigné.", "تم تعيين موظف توصيل.", "Se asignó personal de entrega.",
  ),
  "order.delivery_reassigned": entry(
    "Delivery reassigned", "Livraison réassignée", "تمت إعادة تعيين التوصيل", "Entrega reasignada",
    "Delivery was reassigned.", "La livraison a été réassignée.", "تمت إعادة تعيين التوصيل.", "La entrega se reasignó.",
  ),
  "order.delivery_started": entry(
    "Delivery started", "Livraison commencée", "بدأ التوصيل", "Entrega iniciada",
    "The order is out for delivery.", "La commande est en livraison.", "الطلب قيد التوصيل.", "El pedido está en reparto.",
  ),
  "order.delivery_failed": entry(
    "Delivery failed", "Échec de livraison", "فشل التوصيل", "Entrega fallida",
    "A delivery attempt failed.", "Une tentative de livraison a échoué.", "فشلت محاولة توصيل.", "Falló un intento de entrega.",
  ),
  "order.delivered": entry(
    "Order delivered", "Commande livrée", "تم توصيل الطلب", "Pedido entregado",
    "The order was delivered.", "La commande a été livrée.", "تم توصيل الطلب.", "El pedido fue entregado.",
  ),
  "order.cancelled": entry(
    "Order cancelled", "Commande annulée", "تم إلغاء الطلب", "Pedido cancelado",
    "The order was cancelled.", "La commande a été annulée.", "تم إلغاء الطلب.", "Se canceló el pedido.",
  ),
  "family.fundingActivated": entry(
    "Ordering enabled", "Commandes activées", "تم تفعيل الطلبات", "Pedidos activados",
    "The funding target was reached.", "L'objectif de financement est atteint.", "تم بلوغ هدف التمويل.", "Se alcanzó el objetivo de financiación.",
  ),
  "applicant.approved": entry(
    "Application approved", "Candidature approuvée", "تمت الموافقة على الطلب", "Solicitud aprobada",
    "The sponsor account is active.", "Le compte parrain est actif.", "حساب الراعي نشط.", "La cuenta está activa.",
  ),
  "applicant.rejected": entry(
    "Application update", "Mise à jour de candidature", "تحديث الطلب", "Actualización de solicitud",
    "The sponsor application was not approved.", "La candidature n'a pas été approuvée.", "لم تتم الموافقة على الطلب.", "La solicitud no fue aprobada.",
  ),
};

function iconForTopic(topic: string): LucideIcon {
  if (topic.startsWith("contribution.")) return HandCoins;
  if (topic.startsWith("order.")) return ClipboardCheck;
  if (topic.startsWith("family.")) return House;
  if (topic.startsWith("applicant.")) return UserRound;
  return Bell;
}

function tokenForTopic(topic: string): NotificationViewModel["token"] {
  if (
    topic.endsWith(".validated") ||
    topic.endsWith(".delivered") ||
    topic.endsWith(".approved") ||
    topic === "family.fundingActivated"
  ) {
    return "success";
  }
  if (
    topic.endsWith(".rejected") ||
    topic.endsWith(".failed") ||
    topic.endsWith(".cancelled") ||
    topic.endsWith(".expired")
  ) {
    return "destructive";
  }
  if (topic.endsWith(".refunded") || topic.endsWith(".purchase_replaced")) {
    return "warning";
  }
  return "default";
}

function hrefForTopic(topic: string): string {
  if (topic.startsWith("contribution.")) return "/contribution";
  if (topic.startsWith("order.")) return "/orders";
  return "/dashboard";
}

export function normalizeLocale(value: string | null | undefined): NotificationLocale {
  if (value === "fr" || value === "ar" || value === "es") return value;
  return "en";
}

export function buildNotificationViewModel(
  topic: string,
  locale: string | null | undefined,
  fallback: { unknownTitle: string; unknownBody: string },
): NotificationViewModel {
  const normalized = normalizeLocale(locale);
  const copy = COPIES[topic];
  if (!copy) {
    // Unknown topics render a generic safe row; raw payload values are never
    // interpolated into user-visible copy.
    return {
      title: fallback.unknownTitle,
      body: fallback.unknownBody,
      icon: Bell,
      token: "default",
      href: "/dashboard",
    };
  }
  return {
    title: copy.title[normalized],
    body: copy.body[normalized],
    icon: iconForTopic(topic),
    token: tokenForTopic(topic),
    href: hrefForTopic(topic),
  };
}

export function formatBadgeCount(count: number, locale: string): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  try {
    return new Intl.NumberFormat(locale).format(count);
  } catch {
    return String(count);
  }
}

export { CheckCircle2, XCircle };
