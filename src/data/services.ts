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

export type ServiceDetail = {
  slug: string;
  tag: string;
  title: string;
  shortTitle: string;
  location: string;
  image: string;
  gallery: string[];
  description: string;
  longDescription: string;
  items: string[];
  highlights: { icon: string; title: string; text: string }[];
  rating: number;
  reviews: number;
  badge: string;
};

export const services: ServiceDetail[] = [
  {
    slug: "btp",
    tag: "01 — BTP",
    title: "Bâtiment & Travaux Publics",
    shortTitle: "BTP — Bâtiment et travaux publics",
    location: "Lomé, Togo · Toute l'Afrique de l'Ouest",
    image: construction,
    gallery: [construction, showcase1, showcase2, showcase3, showcase4],
    description:
      "Du gros œuvre à la finition — génie civil, infrastructures et bâtiments industriels livrés avec rigueur.",
    longDescription:
      "Notre pôle BTP intervient sur l'ensemble du cycle de construction : études, terrassement, gros œuvre, second œuvre et finitions. Nous mobilisons des équipes certifiées et un parc matériel récent pour garantir des livraisons dans les délais, en respectant les normes internationales et la sécurité chantier.",
    items: ["Génie civil & structures", "Routes & infrastructures", "Bâtiments industriels", "Maîtrise d'œuvre"],
    highlights: [
      { icon: "🏗️", title: "Équipes certifiées", text: "Chefs de chantier expérimentés et conducteurs travaux qualifiés." },
      { icon: "📐", title: "Études intégrées", text: "Du dimensionnement structurel au plan d'exécution." },
      { icon: "🛡️", title: "Sécurité & qualité", text: "Process HSE rigoureux sur chaque opération." },
    ],
    rating: 4.92,
    reviews: 128,
    badge: "Coup de cœur clients",
  },
  {
    slug: "cablage-reseau",
    tag: "02 — Réseau",
    title: "Câblage réseau",
    shortTitle: "Câblage structuré & réseaux data",
    location: "Lomé, Togo · Multi-sites",
    image: cabling,
    gallery: [cabling, showcase3, showcase1, showcase4, showcase2],
    description:
      "Câblage structuré cuivre et fibre optique — déploiements certifiés pour entreprises et administrations.",
    longDescription:
      "Nous concevons et installons des infrastructures réseau performantes : câblage structuré catégorie 6/6A, fibre optique mono et multimode, baies de brassage, switchs et points d'accès. Chaque déploiement est testé et certifié pour garantir performance et durabilité.",
    items: ["Câblage cuivre Cat 6/6A", "Fibre optique OM3/OS2", "Baies de brassage", "Certification & recette"],
    highlights: [
      { icon: "🛰️", title: "Fibre & cuivre", text: "Câblage structuré certifié aux normes." },
      { icon: "🧪", title: "Tests & recette", text: "Mesures Fluke et rapports détaillés." },
      { icon: "🔧", title: "Maintenance", text: "Contrats SAV et interventions rapides." },
    ],
    rating: 4.95,
    reviews: 64,
    badge: "Expert réseau",
  },
  {
    slug: "cctv",
    tag: "03 — CCTV",
    title: "CCTV — Vidéosurveillance",
    shortTitle: "Vidéosurveillance CCTV professionnelle",
    location: "Lomé, Togo",
    image: cctv,
    gallery: [cctv, showcase2, showcase4, showcase5, showcase1],
    description:
      "Systèmes de vidéosurveillance HD/IP — caméras, NVR et supervision pour sites résidentiels et professionnels.",
    longDescription:
      "Conception, installation et maintenance de systèmes CCTV adaptés à vos enjeux de sécurité : caméras IP haute définition, enregistreurs NVR, vision nocturne, accès distant via mobile. Audit du site, plan de couverture et formation des équipes incluse.",
    items: ["Caméras IP HD/4K", "Enregistreurs NVR", "Vision nocturne & PTZ", "Accès distant sécurisé"],
    highlights: [
      { icon: "📹", title: "Couverture optimale", text: "Étude de zones et angles de vue." },
      { icon: "🌙", title: "Vision 24/7", text: "Caméras infrarouges haute sensibilité." },
      { icon: "📱", title: "Supervision mobile", text: "Visualisation à distance sécurisée." },
    ],
    rating: 4.9,
    reviews: 92,
    badge: "Sécurité premium",
  },
  {
    slug: "detection-incendie",
    tag: "04 — Incendie",
    title: "Détection incendie",
    shortTitle: "Systèmes de détection & sécurité incendie",
    location: "Lomé, Togo",
    image: fire,
    gallery: [fire, showcase1, showcase3, showcase5, showcase4],
    description:
      "Systèmes de détection et d'alarme incendie conformes — protection des personnes et des biens.",
    longDescription:
      "Nous installons des systèmes de détection incendie certifiés (SSI catégories A à E) : centrales, détecteurs de fumée et de chaleur, déclencheurs manuels, sirènes et désenfumage. Études réglementaires, mise en service et maintenance périodique assurées.",
    items: ["Centrales SSI", "Détecteurs fumée & chaleur", "Sirènes & alarmes", "Maintenance réglementaire"],
    highlights: [
      { icon: "🔥", title: "Conformité normes", text: "Conception conforme à la réglementation." },
      { icon: "🚨", title: "Alarme fiable", text: "Centrales et détecteurs certifiés." },
      { icon: "🛠️", title: "Maintenance", text: "Vérifications périodiques obligatoires." },
    ],
    rating: 4.93,
    reviews: 47,
    badge: "Sécurité certifiée",
  },
  {
    slug: "fournitures",
    tag: "05 — Fournitures",
    title: "Fournitures",
    shortTitle: "Fournitures & équipements professionnels",
    location: "Lomé, Togo · Livraison Afrique de l'Ouest",
    image: supply,
    gallery: [supply, showcase4, showcase2, showcase1, showcase3],
    description:
      "Approvisionnement d'équipements premium et de matériaux certifiés, livrés dans les délais.",
    longDescription:
      "Centrale d'achats pour le BTP, le réseau, la sécurité et la sûreté : matériaux de construction, équipements électriques, câbles, caméras, centrales incendie. Sourcing international, stock local et logistique maîtrisée pour livrer rapidement vos chantiers.",
    items: ["Matériaux BTP", "Équipements électriques & réseau", "Matériel de sécurité", "Logistique & livraison"],
    highlights: [
      { icon: "📦", title: "Stock local", text: "Disponibilité immédiate à Lomé." },
      { icon: "🌍", title: "Sourcing international", text: "Partenariats avec marques reconnues." },
      { icon: "🚚", title: "Livraison rapide", text: "Logistique maîtrisée sur toute la sous-région." },
    ],
    rating: 4.87,
    reviews: 73,
    badge: "Approvisionnement fiable",
  },
];

export const getServiceBySlug = (slug?: string) =>
  services.find((s) => s.slug === slug);
