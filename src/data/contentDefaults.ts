// Central registry of all editable content defaults.
// Keys here surface automatically in the admin editor, even before any DB override.
// Use the same keys in components via <Editable contentKey="..." fallback={DEFAULTS["..."]} />.

import construction from "@/assets/service-construction.jpg";
import cabling from "@/assets/service-cabling.jpg";
import cctv from "@/assets/service-cctv.jpg";
import fire from "@/assets/service-fire.jpg";
import supply from "@/assets/service-supply.jpg";
import showcase1 from "@/assets/showcase-rehab-1.jpg";
import showcase2 from "@/assets/showcase-rehab-2.jpg";
import showcase3 from "@/assets/showcase-rehab-3.jpg";
import showcase4 from "@/assets/showcase-rehab-4.jpg";
import showcase5 from "@/assets/showcase-rehab-5.jpg";
import showcase6 from "@/assets/showcase-rehab-6.jpg";

export const CONTENT_DEFAULTS: Record<string, string> = {
  // ---------- BRAND ----------
  "brand.name": "PIHAM Info Services",
  "brand.tagline": "BTP · Réseaux · Sûreté",
  "brand.logo_url": "/logo.png",
  "brand.logo_alt": "Logo PIHAM Info Services",

  // ---------- HERO ----------
  "hero.eyebrow": "BTP · Réseaux · Sûreté",
  "hero.title_line1": "Bâtir l'infrastructure",
  "hero.title_line2_prefix": "des entreprises",
  "hero.title_line2_accent": "qui durent.",
  "hero.title_line3": "",
  "hero.subtitle":
    "Partenaire de référence en Afrique de l'Ouest pour le BTP, les réseaux, la vidéosurveillance et la sécurité incendie.",
  "hero.cta_primary": "Demander un devis",
  "hero.cta_secondary": "Découvrir nos services",
  "hero.image_url": "",
  "hero.image_alt": "Chantier moderne PIHAM",
  "hero.card_eyebrow": "Chantier · Lomé",
  "hero.card_title": "Pôle BTP — 2026",
  "hero.stats_json": JSON.stringify([
    { value: "10+", label: "Projets livrés" },
    { value: "5 ans", label: "d'expérience terrain" },
    { value: "95%", label: "Clients satisfaits" },
    { value: "24/7", label: "Support & maintenance" },
  ]),
  "hero.marquee1": "Génie civil",
  "hero.marquee2": "Réhabilitation patrimoine",
  "hero.marquee3": "Fibre optique",
  "hero.marquee4": "Datacenter",
  "hero.marquee5": "Routes & VRD",
  "hero.marquee6": "Bâtiments industriels",
  "hero.marquee7": "Réseau télécom",
  "hero.marquee8": "Fourniture matériaux",
  "hero.marquee9": "Maîtrise d'œuvre",

  // ---------- BANNER ----------
  "banner.enabled": "true",
  "banner.message": "PIHAM Info Services — BTP · Réseaux · Sûreté · Fourniture · Maîtrise d'œuvre",

  // ---------- TRUST ----------
  "trust.eyebrow": "Ils nous font confiance",
  "trust.title": "Banques · Institutions · Entreprises · ONG",

  // ---------- ABOUT ----------
  "about.eyebrow": "À propos",
  "about.title_line1": "Une force pluridisciplinaire,",
  "about.title_accent": "pensée pour la durée.",
  "about.description":
    "PIHAM Info Services réunit le génie civil et l'infrastructure numérique. De la première fondation à la mise en service d'un réseau, nous livrons des projets complets avec la même exigence de qualité, de sécurité et de fiabilité.",
  "about.image_url": construction,
  "about.image_alt": "Équipe PIHAM sur chantier",
  "about.promise_label": "Notre promesse",
  "about.promise_quote":
    "Nous ne construisons pas seulement des bâtiments — nous bâtissons les fondations sur lesquelles nos clients construisent leur avenir.",
  "about.values_json": JSON.stringify([
    { k: "Qualité", d: "Une exécution rigoureuse, des standards internationaux à chaque étape." },
    { k: "Fiabilité", d: "Des engagements tenus — délais, budget, sécurité." },
    { k: "Innovation", d: "Des solutions techniques modernes, pensées pour durer." },
    { k: "Polyvalence", d: "BTP, IT, télécom et fourniture — sous une seule coordination." },
  ]),

  // ---------- SERVICES ----------
  "services.eyebrow": "Nos services",
  "services.title_line1": "Cinq expertises.",
  "services.title_accent": "Une seule exigence.",
  "services.description":
    "Du bâtiment à la sûreté électronique, nous couvrons toute la chaîne de valeur — avec la même précision sur chaque chantier et chaque équipement.",

  // ---------- SHOWCASE ----------
  "showcase.eyebrow": "Nos réalisations",
  "showcase.title_line1": "Des projets concrets,",
  "showcase.title_accent": "livrés à temps.",
  "showcase.description": "Quelques chantiers et installations récentes, en images.",

  // ---------- PROCESS ----------
  "process.eyebrow": "Notre méthode",
  "process.title_line1": "Quatre étapes claires.",
  "process.title_accent": "Une exécution sans faille.",
  "process.description":
    "De la première discussion à la livraison finale, chaque projet suit la même rigueur.",
  "process.steps_json": JSON.stringify([
    { n: "01", t: "Analyse du besoin", d: "Nous écoutons votre projet, étudions le terrain et les contraintes." },
    { n: "02", t: "Devis rapide", d: "Proposition détaillée et planning clairs — sous 24 heures ouvrées." },
    { n: "03", t: "Réalisation", d: "Mise en œuvre par nos équipes BTP, IT et télécom — sous une seule direction." },
    { n: "04", t: "Livraison & suivi", d: "Réception, mise en service, formation et maintenance." },
  ]),

  // ---------- SECTORS ----------
  "sectors.eyebrow": "Secteurs servis",
  "sectors.title_line1": "Des standards adaptés",
  "sectors.title_accent": "à chaque environnement.",
  "sectors.description":
    "Nous intervenons pour les institutions, les entreprises et les organisations exigeantes.",

  // ---------- TESTIMONIALS ----------
  "testimonials.eyebrow": "Témoignages",
  "testimonials.title_line1": "Ce que disent",
  "testimonials.title_accent": "nos clients.",
  "testimonials.description": "Des partenaires qui nous renouvellent leur confiance.",

  // ---------- CTA ----------
  "cta.eyebrow": "Prêt à démarrer ?",
  "cta.title": "Parlons de votre projet.",
  "cta.description":
    "Devis sous 24 h ouvrées. Conseil technique gratuit. Équipe disponible à Lomé et dans toute la sous-région.",
  "cta.button_primary": "Demander un devis",
  "cta.button_secondary": "Nous contacter",

  // ---------- CONTACT ----------
  "contact.eyebrow": "Contact",
  "contact.title_line1": "Discutons",
  "contact.title_accent": "de votre projet.",
  "contact.description":
    "Un besoin précis ? Une étude à valider ? Notre équipe vous répond sous 24 heures ouvrées.",
  "contact.email": "contact@pihaminfoservices.com",
  "contact.phone": "+228 99 50 00 54",
  "contact.address": "Lomé, Togo",

  // ---------- FOOTER ----------
  "footer.tagline": "Infrastructures critiques pour entreprises et institutions.",
  "footer.copyright": "© PIHAM Info Services. Tous droits réservés.",

  // ---------- SHOWCASE — images éditables ----------
  "showcase.image1_url": showcase1,
  "showcase.image1_title": "Façade coloniale — avant intervention",
  "showcase.image2_url": showcase2,
  "showcase.image2_title": "Façade restaurée — livraison finale",
  "showcase.image3_url": showcase3,
  "showcase.image3_title": "Chantier de réhabilitation",
  "showcase.image4_url": showcase4,
  "showcase.image4_title": "Salle de classe — préparation",
  "showcase.image5_url": showcase5,
  "showcase.image5_title": "Salle de classe — après livraison",
  "showcase.image6_url": showcase6,
  "showcase.image6_title": "Bâtiment municipal — réhabilitation complète",

  // ---------- SERVICES — images éditables ----------
  "services.image_btp_url": construction,
  "services.image_cablage_url": cabling,
  "services.image_cctv_url": cctv,
  "services.image_incendie_url": fire,
  "services.image_fournitures_url": supply,

  // ---------- SERVICE DETAIL — galleries éditables (5 images par service) ----------
  "service_btp.gallery1_url": construction,
  "service_btp.gallery2_url": showcase1,
  "service_btp.gallery3_url": showcase2,
  "service_btp.gallery4_url": showcase3,
  "service_btp.gallery5_url": showcase4,
  "service_cablage.gallery1_url": cabling,
  "service_cablage.gallery2_url": showcase3,
  "service_cablage.gallery3_url": showcase1,
  "service_cablage.gallery4_url": showcase4,
  "service_cablage.gallery5_url": showcase2,
  "service_cctv.gallery1_url": cctv,
  "service_cctv.gallery2_url": showcase2,
  "service_cctv.gallery3_url": showcase4,
  "service_cctv.gallery4_url": showcase5,
  "service_cctv.gallery5_url": showcase1,
  "service_incendie.gallery1_url": fire,
  "service_incendie.gallery2_url": showcase1,
  "service_incendie.gallery3_url": showcase3,
  "service_incendie.gallery4_url": showcase5,
  "service_incendie.gallery5_url": showcase4,
  "service_fournitures.gallery1_url": supply,
  "service_fournitures.gallery2_url": showcase4,
  "service_fournitures.gallery3_url": showcase2,
  "service_fournitures.gallery4_url": showcase1,
  "service_fournitures.gallery5_url": showcase3,
};
