import { useReveal } from "@/hooks/useReveal";
import { MagneticButton } from "./MagneticButton";
import { useSiteContent } from "@/hooks/useSiteContent";

export const CTA = () => {
  const ref = useReveal<HTMLDivElement>();
  const { content } = useSiteContent();
  const eyebrow = (content["cta.eyebrow"] ?? "Disponible pour de nouveaux projets").trim();
  const title = (content["cta.title"] ?? "Un projet en tête ?").trim();
  const subtitle = (content["cta.subtitle"] ?? "Parlons-en aujourd'hui.").trim();
  const description = (content["cta.description"] ?? "Devis gratuit, réponse sous 24h. BTP, IT, télécom ou fourniture — nous sommes prêts.").trim();
  const ctaLabel = (content["cta.button_label"] ?? "Demander un devis").trim();
  const phone = (content["contact.phone"] ?? "+228 99 50 00 54").trim();
  return (
    <section id="cta" className="relative py-20 md:py-24 bg-background">
      <div className="container">
        <div
          ref={ref}
          className="reveal-up relative overflow-hidden rounded-3xl p-10 md:p-16 shadow-elevated border border-border"
          style={{ background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(330 90% 50%) 55%, hsl(var(--gold)) 110%)" }}
        >
          {/* deco */}
          <div className="absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-[hsl(var(--gold))]/30 blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {eyebrow}
              </div>
              <h2 className="mt-5 font-display font-semibold text-3xl md:text-5xl tracking-tight leading-[1.1] text-white">
                {title} <br />
                <span className="text-white/95">{subtitle}</span>
              </h2>
              <p className="mt-4 text-white/90 max-w-xl text-base md:text-lg">
                {description}
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <MagneticButton
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[hsl(var(--accent))] px-7 py-4 text-sm font-semibold hover:bg-white/95 transition-all duration-300 shadow-card-soft"
              >
                {ctaLabel} <span>→</span>
              </MagneticButton>
              <MagneticButton
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/30 text-white px-7 py-4 text-sm font-semibold hover:bg-white/25 transition-all duration-300"
              >
                {phone}
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
