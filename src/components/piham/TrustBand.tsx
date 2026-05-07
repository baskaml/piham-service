import { useReveal } from "@/hooks/useReveal";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useEditableList } from "./Editable";

type Metric = { v: string; suffix: string; l: string };
type TrustItem = { icon: string; t: string };

const DEFAULT_METRICS: Metric[] = [
  { v: "120", suffix: "+", l: "Projets livrés" },
  { v: "98", suffix: "%", l: "Clients satisfaits" },
  { v: "15", suffix: "ans", l: "D'expertise terrain" },
  { v: "24", suffix: "h", l: "Réponse devis" },
];
const DEFAULT_TRUST: TrustItem[] = [
  { icon: "✓", t: "Devis gratuit" },
  { icon: "★", t: "Équipe certifiée" },
  { icon: "⏱", t: "Délais maîtrisés" },
  { icon: "♺", t: "Support après-vente" },
];

export const TrustBand = () => {
  const ref = useReveal<HTMLDivElement>();
  const { content } = useSiteContent();
  const metrics = useEditableList<Metric>("trust.metrics_json", DEFAULT_METRICS);
  const trustItems = useEditableList<TrustItem>("trust.items_json", DEFAULT_TRUST);
  return (
    <section id="trust" className="relative mt-12 md:mt-16 z-10">
      <div className="container">
        <div
          ref={ref}
          className="reveal-up rounded-3xl bg-card border border-border shadow-elevated overflow-hidden"
        >
          {/* Top metrics */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {metrics.map((m, i) => (
              <div key={i} className="relative p-6 md:p-8 group">
                <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
                  0{i + 1}
                </div>
                <div className="font-display text-4xl md:text-5xl font-semibold tracking-tight flex items-baseline gap-1">
                  <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {m.v}
                  </span>
                  <span className="text-xl md:text-2xl text-[hsl(var(--accent))]">{m.suffix}</span>
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  {m.l}
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--gold))] transition-all duration-700 group-hover:w-full" />
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="border-t border-border bg-background-elevated/50 px-6 md:px-8 py-5 flex flex-wrap items-center justify-center md:justify-between gap-4">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              {content["trust.eyebrow"] ?? "Pourquoi PIHAM"}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {trustItems.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground/85">
                  <span className="h-6 w-6 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center text-[hsl(var(--accent))] text-xs font-bold">
                    {t.icon}
                  </span>
                  {t.t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
