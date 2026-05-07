import { SectionHeading } from "./SectionHeading";
import { useReveal } from "@/hooks/useReveal";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useEditableList } from "./Editable";

type Item = { q: string; n: string; r: string; c: string; rating: number; initial: string };
const DEFAULT_ITEMS: Item[] = [
  { q: "Une équipe rigoureuse, à l'écoute, et qui livre dans les délais. PIHAM a coordonné notre extension de A à Z.", n: "Koffi A.", r: "Directeur Général", c: "Groupe industriel — Lomé", rating: 5, initial: "K" },
  { q: "PIHAM a piloté notre chantier ET notre déploiement réseau dans nos agences. Une coordination sans faille.", n: "Awa M.", r: "Responsable Projet", c: "Établissement bancaire", rating: 5, initial: "A" },
  { q: "Sérieux, professionnel et toujours disponible. La qualité finale est au rendez-vous, le suivi après livraison aussi.", n: "Mensah D.", r: "Maître d'ouvrage", c: "Programme immobilier", rating: 5, initial: "M" },
];

export const Testimonials = () => {
  const { content } = useSiteContent();
  const items = useEditableList<Item>("testimonials.items_json", DEFAULT_ITEMS);
  return (
    <section id="testimonials" className="relative py-24 md:py-32 bg-background-elevated overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute top-1/3 -left-24 h-[300px] w-[300px] rounded-full bg-[hsl(var(--accent))]/5 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[300px] w-[300px] rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />
      </div>

      <div className="container relative">
        <SectionHeading
          align="center"
          eyebrow={content["testimonials.eyebrow"]}
          title={
            <>
              {content["testimonials.title_line1"]} <br />
              <span className="text-gradient-accent">{content["testimonials.title_accent"]}</span>
            </>
          }
          description={content["testimonials.description"]}
        />

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (<Star key={i} filled />))}
          </div>
          <div className="text-sm text-foreground/80">
            <span className="font-display text-lg font-semibold text-primary">
              {content["testimonials.rating"] ?? "4.9/5"}
            </span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {content["testimonials.rating_label"] ?? "basé sur 47 retours clients vérifiés"}
            </span>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (<Card key={i} item={it} index={i} />))}
        </div>
      </div>
    </section>
  );
};

const Card = ({ item, index }: { item: Item; index: number }) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <article
      ref={ref}
      className="reveal-up group relative rounded-2xl bg-card border border-border p-7 md:p-8 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-500 flex flex-col"
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      {/* Top: stars + quote mark */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {[...Array(item.rating)].map((_, i) => (
            <Star key={i} filled />
          ))}
        </div>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-[hsl(var(--accent))]/15">
          <path d="M3 21V13c0-4.4 2.4-7.6 7-9l1 2c-3.4.9-5 2.7-5 5h4v10H3zm12 0V13c0-4.4 2.4-7.6 7-9l1 2c-3.4.9-5 2.7-5 5h4v10h-7z" />
        </svg>
      </div>

      <p className="mt-5 text-base text-foreground leading-relaxed flex-1">
        "{item.q}"
      </p>

      <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center text-white font-display font-semibold shrink-0">
          {item.initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary flex items-center gap-1.5">
            {item.n}
            <span className="inline-flex items-center text-[hsl(var(--accent))]" title="Client vérifié">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3l-4.8 2.6.9-5.4L4.2 7.7l5.4-.8z" />
              </svg>
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{item.r} · {item.c}</div>
        </div>
      </div>
    </article>
  );
};

const Star = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-[hsl(var(--gold))]">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
