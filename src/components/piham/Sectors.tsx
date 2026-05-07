import { SectionHeading } from "./SectionHeading";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useEditableList } from "./Editable";
import { CinematicGrid, CinematicCard } from "./CinematicGrid";

type Sector = { name: string; icon: string };
const DEFAULT_SECTORS: Sector[] = [
  { name: "Administrations publiques", icon: "🏛" },
  { name: "Banques & assurances", icon: "🏦" },
  { name: "Télécom & opérateurs", icon: "📡" },
  { name: "Hôtellerie & immobilier", icon: "🏨" },
  { name: "Industrie & énergie", icon: "⚡" },
  { name: "Santé & éducation", icon: "🏥" },
  { name: "ONG & coopération", icon: "🌍" },
  { name: "Commerce & retail", icon: "🛍" },
];

export const Sectors = () => {
  const { content } = useSiteContent();
  const sectors = useEditableList<Sector>("sectors.list_json", DEFAULT_SECTORS);
  return (
    <section id="sectors" className="relative py-24 md:py-28 bg-background">
      <div className="container">
        <SectionHeading
          align="center"
          eyebrow={content["sectors.eyebrow"]}
          title={
            <>
              {content["sectors.title_line1"]} <br />
              <span className="text-gradient-accent">{content["sectors.title_accent"]}</span>
            </>
          }
          description={content["sectors.description"]}
        />

        <CinematicGrid className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {sectors.map((s, i) => (
            <CinematicCard
              key={i}
              index={i}
              intensity={0.6}
              proximityRadius={260}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="text-3xl" style={{ transform: "translateZ(30px)" }}>{s.icon}</div>
              <div className="mt-3 text-sm font-medium text-foreground" style={{ transform: "translateZ(20px)" }}>{s.name}</div>
            </CinematicCard>
          ))}
        </CinematicGrid>
      </div>
    </section>
  );
};
