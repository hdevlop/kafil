import type { NotificationLocale } from "./localeResolver";
import type { NotificationTopic } from "./notificationTopics";

export interface NotificationViewModel {
  title: string;
  body: string;
}

type Copy = Record<NotificationLocale, NotificationViewModel & { subject: string }>;

function copy(en: string, fr: string, ar: string, es: string, bodyEn: string, bodyFr: string, bodyAr: string, bodyEs: string): Copy {
  return {
    en: { subject: en, title: en, body: bodyEn },
    fr: { subject: fr, title: fr, body: bodyFr },
    ar: { subject: ar, title: ar, body: bodyAr },
    es: { subject: es, title: es, body: bodyEs },
  };
}

const COPIES: Record<NotificationTopic, Copy> = {
  "contribution.submitted": copy(
    "Contribution submitted", "Contribution soumise", "تم إرسال المساهمة", "Contribución enviada",
    "A contribution was submitted and awaits review.", "Une contribution a été soumise et attend examen.", "تم إرسال مساهمة وهي بانتظار المراجعة.", "Se envió una contribución y está pendiente de revisión.",
  ),
  "contribution.recorded": copy(
    "Contribution recorded", "Contribution enregistrée", "تم تسجيل المساهمة", "Contribución registrada",
    "An offline contribution was recorded and awaits validation.", "Une contribution hors ligne a été enregistrée et attend validation.", "تم تسجيل مساهمة خارج الإنترنت وهي بانتظار التحقق.", "Se registró una contribución sin conexión pendiente de validación.",
  ),
  "contribution.validated": copy(
    "Contribution validated", "Contribution validée", "تم التحقق من المساهمة", "Contribución validada",
    "A contribution was validated and credited to the household budget.", "Une contribution a été validée et créditée au budget du ménage.", "تم التحقق من مساهمة وإضافتها إلى ميزانية الأسرة.", "Se validó una contribución y se acreditó al presupuesto familiar.",
  ),
  "contribution.rejected": copy(
    "Contribution rejected", "Contribution rejetée", "تم رفض المساهمة", "Contribución rechazada",
    "A contribution was rejected without changing the budget.", "Une contribution a été rejetée sans modifier le budget.", "تم رفض مساهمة دون تغيير الميزانية.", "Se rechazó una contribución sin cambiar el presupuesto.",
  ),
  "contribution.refunded": copy(
    "Contribution refunded", "Contribution remboursée", "تم استرداد المساهمة", "Contribución reembolsada",
    "A validated contribution was reversed with a linked ledger entry.", "Une contribution validée a été annulée avec une écriture liée.", "تم عكس مساهمة تم التحقق منها مع قيد مرتبط.", "Se revirtió una contribución validada con un asiento vinculado.",
  ),
  "contribution.expired": copy(
    "Contribution expired", "Contribution expirée", "انتهت صلاحية المساهمة", "Contribución vencida",
    "A pending contribution expired without validation.", "Une contribution en attente a expiré sans validation.", "انتهت صلاحية مساهمة معلقة دون تحقق.", "Una contribución pendiente venció sin validación.",
  ),
  "order.submitted": copy(
    "Order submitted", "Commande soumise", "تم إرسال الطلب", "Pedido enviado",
    "A household order was submitted and awaits approval.", "Une commande du ménage a été soumise et attend approbation.", "تم إرسال طلب أسرة وهو بانتظار الموافقة.", "Se envió un pedido familiar pendiente de aprobación.",
  ),
  "order.assisted_submitted": copy(
    "Assisted order created", "Commande assistée créée", "تم إنشاء طلب بمساعدة", "Pedido asistido creado",
    "An operator created a pending order for the household.", "Un opérateur a créé une commande en attente pour le ménage.", "أنشأ موظف طلبا معلقا للأسرة.", "Un operador creó un pedido pendiente para la familia.",
  ),
  "order.approved": copy(
    "Order approved", "Commande approuvée", "تمت الموافقة على الطلب", "Pedido aprobado",
    "An order was approved and moves to purchasing.", "Une commande a été approuvée et passe aux achats.", "تمت الموافقة على طلب وانتقل إلى الشراء.", "Se aprobó un pedido y pasa a compra.",
  ),
  "order.rejected": copy(
    "Order rejected", "Commande rejetée", "تم رفض الطلب", "Pedido rechazado",
    "A pending order was rejected and its reservation released.", "Une commande en attente a été rejetée et sa réservation libérée.", "تم رفض طلب معلق وتحرير حجزه.", "Se rechazó un pedido pendiente y se liberó su reserva.",
  ),
  "order.purchase_recorded": copy(
    "Purchase recorded", "Achat enregistré", "تم تسجيل الشراء", "Compra registrada",
    "A purchase receipt was recorded for the order.", "Un reçu d'achat a été enregistré pour la commande.", "تم تسجيل إيصال شراء للطلب.", "Se registró un recibo de compra para el pedido.",
  ),
  "order.purchase_replaced": copy(
    "Purchase replaced", "Achat remplacé", "تم استبدال الشراء", "Compra reemplazada",
    "A purchase record was replaced with corrected evidence.", "Un enregistrement d'achat a été remplacé avec preuve corrigée.", "تم استبدال سجل الشراء بدليل مصحح.", "Se reemplazó un registro de compra con evidencia corregida.",
  ),
  "order.delivery_assigned": copy(
    "Delivery assigned", "Livraison assignée", "تم تعيين التوصيل", "Entrega asignada",
    "Delivery staff was assigned to the order.", "Un livreur a été assigné à la commande.", "تم تعيين موظف توصيل للطلب.", "Se asignó personal de entrega al pedido.",
  ),
  "order.delivery_reassigned": copy(
    "Delivery reassigned", "Livraison réassignée", "تمت إعادة تعيين التوصيل", "Entrega reasignada",
    "Delivery was reassigned to different staff.", "La livraison a été réassignée à un autre agent.", "تمت إعادة تعيين التوصيل لموظف آخر.", "La entrega se reasignó a otro agente.",
  ),
  "order.delivery_started": copy(
    "Delivery started", "Livraison commencée", "بدأ التوصيل", "Entrega iniciada",
    "The order is out for delivery.", "La commande est en cours de livraison.", "الطلب قيد التوصيل.", "El pedido está en reparto.",
  ),
  "order.delivery_failed": copy(
    "Delivery failed", "Échec de livraison", "فشل التوصيل", "Entrega fallida",
    "A delivery attempt failed and the order returned to preparation.", "Une tentative de livraison a échoué et la commande est revenue en préparation.", "فشلت محاولة توصيل وعاد الطلب إلى التحضير.", "Falló un intento de entrega y el pedido volvió a preparación.",
  ),
  "order.delivered": copy(
    "Order delivered", "Commande livrée", "تم توصيل الطلب", "Pedido entregado",
    "The order was delivered and confirmed.", "La commande a été livrée et confirmée.", "تم توصيل الطلب وتأكيده.", "El pedido fue entregado y confirmado.",
  ),
  "order.cancelled": copy(
    "Order cancelled", "Commande annulée", "تم إلغاء الطلب", "Pedido cancelado",
    "The order was cancelled and its financial effects reversed.", "La commande a été annulée et ses effets financiers annulés.", "تم إلغاء الطلب وعكس آثاره المالية.", "Se canceló el pedido y se revirtieron sus efectos.",
  ),
  "family.fundingActivated": copy(
    "Household ordering enabled", "Commandes du ménage activées", "تم تفعيل طلبات الأسرة", "Pedidos familiares activados",
    "The funding target was reached and household ordering is enabled.", "L'objectif de financement est atteint et les commandes sont activées.", "تم بلوغ هدف التمويل وتم تفعيل الطلبات.", "Se alcanzó el objetivo y se activaron los pedidos.",
  ),
  "applicant.approved": copy(
    "Sponsor application approved", "Candidature approuvée", "تمت الموافقة على طلب الرعاية", "Solicitud aprobada",
    "Your sponsor account is active. You can now sign in.", "Votre compte parrain est actif. Vous pouvez vous connecter.", "حساب الراعي نشط. يمكنك تسجيل الدخول الآن.", "Tu cuenta está activa. Ya puedes iniciar sesión.",
  ),
  "applicant.rejected": copy(
    "Update on your sponsor application", "Mise à jour de votre candidature", "تحديث بشأن طلب الرعاية", "Actualización de tu solicitud",
    "Your sponsor application was not approved. Contact support for details.", "Votre candidature n'a pas été approuvée. Contactez l'assistance.", "لم تتم الموافقة على طلبك. تواصل مع الدعم.", "Tu solicitud no fue aprobada. Contacta con soporte.",
  ),
};

export function buildViewModel(topic: NotificationTopic, locale: NotificationLocale): NotificationViewModel {
  const entry = COPIES[topic][locale] ?? COPIES[topic].en;
  return { title: entry.title, body: entry.body };
}

export function buildSubject(topic: NotificationTopic, locale: NotificationLocale): string {
  return COPIES[topic][locale]?.subject ?? COPIES[topic].en.subject;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#039;";
      default: return c;
    }
  });
}

function formatMinor(amountMinor: number, locale: NotificationLocale) {
  const major = Math.trunc(amountMinor / 100);
  const minor = Math.abs(amountMinor % 100);
  const tags: Record<NotificationLocale, string> = {
    en: "en-MA", fr: "fr-MA", ar: "ar-MA", es: "es-MA",
  };
  try {
    return new Intl.NumberFormat(tags[locale], {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${major}.${String(minor).padStart(2, "0")} MAD`;
  }
}

const DETAIL_LABELS: Record<
  NotificationLocale,
  { order: string; amount: string; total: string; funded: string }
> = {
  en: { order: "Order", amount: "Amount", total: "Total", funded: "Funded" },
  fr: { order: "Commande", amount: "Montant", total: "Total", funded: "Financé" },
  ar: { order: "الطلب", amount: "المبلغ", total: "الإجمالي", funded: "المموّل" },
  es: { order: "Pedido", amount: "Importe", total: "Total", funded: "Financiado" },
};

const SIGN_IN_LABELS: Record<NotificationLocale, string> = {
  en: "Sign in to your workspace",
  fr: "Connectez-vous à votre espace",
  ar: "سجّل الدخول إلى مساحة العمل",
  es: "Inicia sesión en tu espacio",
};

export function buildEmail(
  topic: NotificationTopic,
  locale: NotificationLocale,
  payload: Record<string, string | number | boolean | null>,
  recipientName: string | null,
  loginUrl?: string | null,
): { subject: string; text: string; html: string } {
  const subject = buildSubject(topic, locale);
  const { title, body } = buildViewModel(topic, locale);
  const direction = locale === "ar" ? "rtl" : "ltr";
  const labels = DETAIL_LABELS[locale] ?? DETAIL_LABELS.en;
  const detailLines: string[] = [];
  if (typeof payload["orderNumber"] === "string") detailLines.push(`${labels.order}: ${payload["orderNumber"]}`);
  if (typeof payload["amountMinor"] === "number") detailLines.push(`${labels.amount}: ${formatMinor(payload["amountMinor"], locale)}`);
  if (typeof payload["actualTotalMinor"] === "number") detailLines.push(`${labels.total}: ${formatMinor(payload["actualTotalMinor"], locale)}`);
  if (typeof payload["totalMinor"] === "number") detailLines.push(`${labels.total}: ${formatMinor(payload["totalMinor"], locale)}`);
  if (typeof payload["fundedMinor"] === "number" && typeof payload["targetMinor"] === "number") {
    detailLines.push(`${labels.funded}: ${formatMinor(payload["fundedMinor"], locale)} / ${formatMinor(payload["targetMinor"], locale)}`);
  }
  const greeting = recipientName ? `${recipientName},` : "";
  // Approval emails restore the legacy direct sender's login link, resolved
  // at delivery time. Rejection emails carry no link.
  const signInUrl =
    topic === "applicant.approved" && typeof loginUrl === "string" && loginUrl.length > 0
      ? loginUrl
      : null;
  const signInLabel = SIGN_IN_LABELS[locale] ?? SIGN_IN_LABELS.en;
  const textParts = [greeting, title, body, ...detailLines];
  if (signInUrl) textParts.push(`${signInLabel}: ${signInUrl}`);
  const text = textParts.filter(Boolean).join("\n");
  const htmlDetails = detailLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const htmlSignIn = signInUrl
    ? `<p><a href="${escapeHtml(signInUrl)}">${escapeHtml(signInLabel)}</a></p>`
    : "";
  const html = `<!doctype html><html dir="${direction}"><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(title)}</h2>${greeting ? `<p>${escapeHtml(greeting)}</p>` : ""}<p>${escapeHtml(body)}</p>${htmlDetails}${htmlSignIn}</body></html>`;
  return { subject, text, html };
}

export function buildPushBody(
  topic: NotificationTopic,
  locale: NotificationLocale,
): NotificationViewModel {
  return buildViewModel(topic, locale);
}
