import { useReveal } from "@/hooks/useReveal";
import { SectionHeading } from "./SectionHeading";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useEditableList } from "./Editable";
import { CONTENT_DEFAULTS } from "@/data/contentDefaults";

type StepItem = { n: string; t: string; d: string };

export const Process = () => {
  const { content } = useSiteContent();
  const steps = useEditableList<StepItem>("process.steps_json", JSON.parse(CONTENT_DEFAULTS["process.steps_json"]));

  return (
    <section id="process" className="relative py-24 md:py-32 bg-background-elevated overflow-hidden">
      <div className="container relative">
        <SectionHeading
          align="center"
          eyebrow={content["process.eyebrow"]}
          title={
            <>
              {content["process.title_line1"]} <br />
              <span className="text-gradient-accent">{content["process.title_accent"]}</span>
            </>
          }
          description={content["process.description"]}
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {steps.map((s, i) => (
            <Step key={i} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Step = ({ step, index }: { step: StepItem; index: number }) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="reveal-up relative bg-card rounded-2xl border border-border p-7 hover:shadow-hover hover:-translate-y-1 transition-all duration-500" style={{ transitionDelay: `${index * 0.1}s` }}>
      <div className="relative inline-flex h-14 w-14 rounded-2xl bg-[hsl(var(--accent))]/10 items-center justify-center text-[hsl(var(--accent))] font-mono font-bold">
        {step.n}
      </div>
      <div className="mt-5">
        <h3 className="font-display text-lg font-semibold text-primary">{step.t}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.d}</p>
    </div>
  );
};
