// Helpers WhatsApp — génère des liens wa.me intelligents
// Gère les numéros internationaux (avec ou sans "+"), espaces, parenthèses, etc.
// Si aucun indicatif n'est détecté, applique l'indicatif par défaut (Togo +228).

const DEFAULT_COUNTRY_CODE = "228"; // Togo

// Liste indicative des principaux indicatifs (1–4 chiffres) pour détection
const KNOWN_DIAL_CODES = [
  "1","7","20","27","30","31","32","33","34","36","39","40","41","43","44","45","46","47","48","49",
  "51","52","53","54","55","56","57","58","60","61","62","63","64","65","66","81","82","84","86","90","91","92","93","94","95","98",
  "211","212","213","216","218","220","221","222","223","224","225","226","227","228","229","230","231","232","233","234","235","236","237","238","239",
  "240","241","242","243","244","245","246","248","249","250","251","252","253","254","255","256","257","258","260","261","262","263","264","265","266","267","268","269",
  "290","291","297","298","299","350","351","352","353","354","355","356","357","358","359","370","371","372","373","374","375","376","377","378","380","381","382","383","385","386","387","389",
  "420","421","423","500","501","502","503","504","505","506","507","508","509","590","591","592","593","594","595","596","597","598","599",
  "670","672","673","674","675","676","677","678","679","680","681","682","683","685","686","687","688","689","690","691","692",
  "850","852","853","855","856","880","886","960","961","962","963","964","965","966","967","968","970","971","972","973","974","975","976","977","992","993","994","995","996","998",
];

const hasKnownPrefix = (digits: string): boolean =>
  KNOWN_DIAL_CODES.some((c) => digits.startsWith(c));

/**
 * Indique si le mode debug WhatsApp est actif.
 * Actif en dev, ou si l'URL contient `?wa-debug=1`. Permet de diagnostiquer en production
 * sans bruit pour les utilisateurs finaux.
 */
const isWaDebugEnabled = (): boolean => {
  try {
    if (import.meta.env?.DEV) return true;
    if (typeof window === "undefined") return false;
    if (window.location?.search?.includes("wa-debug=1")) return true;
  } catch {
    /* noop */
  }
  return false;
};

const waDebug = (label: string, data: Record<string, unknown>): void => {
  if (!isWaDebugEnabled()) return;
  try {
    // eslint-disable-next-line no-console
    console.debug(`[wa:${label}]`, data);
  } catch {
    /* noop */
  }
};

/**
 * Détection robuste mobile vs desktop.
 * Combine plusieurs signaux pour réduire les faux positifs :
 *  1. `navigator.userAgentData.mobile` (Client Hints, Chromium moderne) — le plus fiable.
 *  2. UA classique (iOS, Android, Windows Phone, etc.) avec gestion iPadOS qui se fait passer pour Mac.
 *  3. Capacités tactiles + taille d'écran comme garde-fous (utile pour Firefox/Safari sans UA-CH).
 * Les tablettes (iPad, Android tablets) sont considérées comme "mobile" car WhatsApp y est natif.
 */
export const isMobileDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & {
    userAgentData?: { mobile?: boolean; platform?: string };
  }).userAgentData;
  const ua = navigator.userAgent ?? "";
  const maxTouchPoints =
    typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
  const isIPadOS =
    /Macintosh/i.test(ua) && maxTouchPoints > 1;
  const mobileUARegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook|BB10|Windows Phone/i;
  const uaMobileMatch = mobileUARegex.test(ua);
  const coarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(any-pointer: coarse)").matches;
  const hasTouch = maxTouchPoints > 0;
  const uaStrictMobile = /iPhone|iPad|iPod|Android.*Mobile/i.test(ua);

  // Décision en cascade
  let result = false;
  let reason = "default-desktop";

  if (uaData && uaData.mobile === true) {
    result = true;
    reason = "uaData.mobile=true";
  } else if (isIPadOS) {
    result = true;
    reason = "iPadOS-masqué-en-Mac";
  } else if (uaMobileMatch) {
    if (coarsePointer || hasTouch || uaStrictMobile) {
      result = true;
      reason = "ua-mobile + (coarse|touch|strict)";
    } else {
      reason = "ua-mobile mais pas de signal tactile";
    }
  } else if (uaData && uaData.mobile === false) {
    reason = "uaData.mobile=false";
  }

  waDebug("detect", {
    result,
    reason,
    "uaData.mobile": uaData?.mobile ?? null,
    "uaData.platform": uaData?.platform ?? null,
    isIPadOS,
    coarsePointer,
    maxTouchPoints,
    uaMobileMatch,
    uaStrictMobile,
    ua,
  });

  return result;
};

/**
 * Normalise un numéro pour stockage : format E.164 (`+<indicatifpays><numéro>`).
 * - Supprime espaces, tirets, parenthèses, points.
 * - Préserve le `+` initial.
 * - Convertit `00xxx` → `+xxx`.
 * - Si pas d'indicatif détecté, ajoute l'indicatif par défaut (Togo +228).
 * Retourne `""` si l'entrée est vide/invalide.
 */
export const normalizePhoneForStorage = (
  raw: string | null | undefined,
  defaultCode = DEFAULT_COUNTRY_CODE,
): string => {
  const wa = toWaNumber(raw, defaultCode);
  return wa ? `+${wa}` : "";
};

/**
 * Normalise un numéro brut en numéro international (sans "+") prêt pour wa.me.
 * - Conserve les chiffres uniquement.
 * - Si l'entrée commence par "+" ou "00" → numéro international.
 * - Sinon → préfixe avec l'indicatif par défaut.
 * Retourne null si le numéro est invalide (trop court).
 */
export const toWaNumber = (raw: string | null | undefined, defaultCode = DEFAULT_COUNTRY_CODE): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const startsWithPlus = trimmed.startsWith("+");
  const startsWith00 = trimmed.replace(/\s/g, "").startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (startsWith00) digits = digits.slice(2);
  if (digits.length < 6) return null;

  // Numéro déjà international (préfixe + ou 00)
  if (startsWithPlus || startsWith00) return digits;

  // Numéro local commençant par 0 (ex. 0612345678 en France)
  // → on retire le 0 de tête et on ajoute l'indicatif par défaut
  if (digits.startsWith("0")) {
    return `${defaultCode}${digits.replace(/^0+/, "")}`;
  }

  // Détection d'un indicatif connu en tête (numéro déjà international sans +)
  if (hasKnownPrefix(digits) && digits.length >= 9) return digits;

  // Sinon : numéro local → ajout indicatif par défaut
  return `${defaultCode}${digits}`;
};

/**
 * Extrait le 1er numéro plausible d'un message libre.
 * Cherche d'abord un format international (+XXX...), sinon un libellé "Téléphone:".
 */
export const extractPhone = (msg: string | null | undefined): string | null => {
  if (!msg) return null;
  const intl = msg.match(/\+\d[\d\s().-]{6,}/);
  if (intl) return intl[0].trim();
  const labelled = msg.match(/T[ée]l[ée]phone\s*:\s*([+\d][\d\s().-]{5,})/i);
  if (labelled) return labelled[1].trim();
  const loose = msg.match(/(?:^|\s)(\d[\d\s().-]{7,})/);
  return loose ? loose[1].trim() : null;
};

/**
 * Construit une URL WhatsApp courte au format `https://wa.me/<numéro>?text=...`.
 * - Le numéro est normalisé (E.164 sans `+`).
 * - Si aucun numéro valide → fallback `https://wa.me/?text=...`.
 */
export const buildWaUrl = (
  rawPhone: string | null | undefined,
  text?: string,
  defaultCode = DEFAULT_COUNTRY_CODE,
): string | null => {
  const number = rawPhone ? toWaNumber(rawPhone, defaultCode) : null;
  if (rawPhone && !number) return null;
  const message = (text ?? "Bonjour, je souhaite discuter avec vous sur WhatsApp.").trim();
  const encodedText = encodeURIComponent(message);

  const isMobile = isMobileDevice();

  if (isMobile) {
    return number
      ? `https://wa.me/${number}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
  }

  return number
    ? `https://web.whatsapp.com/send?phone=${number}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;
};

/**
 * Tracking d'un clic WhatsApp.
 * Envoie un événement à gtag / dataLayer (Google Analytics / GTM) si disponibles,
 * sinon log silencieux en console (dev).
 */
export const trackWaClick = (
  source: string,
  meta: Record<string, unknown> = {},
): void => {
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: Array<Record<string, unknown>>;
    };
    const payload = { event: "whatsapp_click", source, ...meta };
    if (typeof w.gtag === "function") {
      w.gtag("event", "whatsapp_click", { source, ...meta });
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(payload);
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[wa]", payload);
    }
  } catch {
    /* noop */
  }
};

