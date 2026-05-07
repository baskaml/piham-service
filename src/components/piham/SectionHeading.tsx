import { useReveal } from "@/hooks/useReveal";

interface Props {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
}

export const SectionHeading = ({ eyebrow, title, description, align = "left" }: Props) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal-up max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <div className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-[hsl(var(--accent))]" />
        <span className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--accent))] font-semibold">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-4 font-display font-semibold text-3xl md:text-5xl tracking-tight leading-[1.1] text-primary">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
