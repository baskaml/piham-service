import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Check, X, AlertTriangle, Loader2 } from "lucide-react";

type Change = { key: string; value: string; note?: string };
type Proposal = {
  action: "update" | "create" | "delete" | "reorder";
  target: "section" | "page" | "element";
  section: string;
  summary: string;
  changes: Change[];
  seo?: { title?: string; description?: string };
  images?: { field: string; alt: string; name?: string }[];
  warnings?: string[];
};

const SUGGESTIONS = [
  "Améliore le hero pour le rendre plus impactant pour les institutions",
  "Réécris le sous-titre en mettant l'accent sur la fiabilité et les délais",
  "Propose 4 statistiques crédibles pour une entreprise BTP au Togo",
  "Optimise le SEO de cette section",
];

type Props = {
  section: string;
  currentContent: Record<string, string>;
  onApply: (changes: Change[]) => Promise<void>;
};

export const AIAssistant = ({ section, currentContent, onApply }: Props) => {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [applying, setApplying] = useState(false);

  const filteredContent = Object.fromEntries(
    Object.entries(currentContent).filter(([k]) => k.startsWith(section + ".") || k.startsWith("brand.")),
  );

  const ask = async (text?: string) => {
    const q = (text ?? instruction).trim();
    if (!q) return toast.error("Décris ce que tu veux modifier");
    setLoading(true);
    setProposal(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-content-ai", {
        body: { instruction: q, section, currentContent: filteredContent },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setProposal((data as any).proposal as Proposal);
      setInstruction(q);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur IA");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!proposal) return;
    if (proposal.action === "delete" && !confirm("Confirmer la SUPPRESSION des clés listées ?")) return;
    setApplying(true);
    try {
      await onApply(proposal.changes);
      toast.success("Modifications appliquées");
      setProposal(null);
      setInstruction("");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'application");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--accent))]" />
        <h3 className="font-display text-sm font-semibold">Assistant IA — section <span className="text-[hsl(var(--accent))]">{section}</span></h3>
      </div>

      <Textarea
        placeholder='Ex : "améliore le titre", "ajoute une statistique sur la sécurité incendie", "propose un SEO pour cette page"…'
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        disabled={loading}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => ask()} disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Réflexion…</> : <>Proposer une modification</>}
        </Button>
        {!proposal && SUGGESTIONS.map((s) => (
          <Button key={s} size="sm" variant="outline" className="rounded-full text-xs" disabled={loading} onClick={() => ask(s)}>
            {s.length > 50 ? s.slice(0, 50) + "…" : s}
          </Button>
        ))}
      </div>

      {proposal && (
        <Card className="border-[hsl(var(--accent))]/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={proposal.action === "delete" ? "destructive" : "default"}>{proposal.action}</Badge>
                  <Badge variant="outline">{proposal.target}</Badge>
                  <Badge variant="outline">{proposal.section}</Badge>
                </div>
                <p className="text-sm text-foreground/85">{proposal.summary}</p>
              </div>
            </div>

            {proposal.warnings && proposal.warnings.length > 0 && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-2 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <ul className="space-y-0.5">
                  {proposal.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Diff proposé</div>
              {proposal.changes.map((c, i) => {
                const before = currentContent[c.key] ?? "";
                const isJson = c.key.endsWith("_json");
                return (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-[hsl(var(--accent))]">{c.key}</code>
                      {c.note && <span className="text-[10px] text-muted-foreground italic">{c.note}</span>}
                    </div>
                    {before && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Avant :</span>{" "}
                        <span className="line-through opacity-60 break-words">{isJson ? before.slice(0, 140) : before}</span>
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="text-muted-foreground">Après :</span>{" "}
                      <span className="text-foreground font-medium break-words whitespace-pre-wrap">{c.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {proposal.seo && (proposal.seo.title || proposal.seo.description) && (
              <div className="rounded-lg border border-border p-2 text-xs">
                <div className="uppercase tracking-wider text-muted-foreground mb-1">SEO suggéré</div>
                {proposal.seo.title && <div><b>Title :</b> {proposal.seo.title}</div>}
                {proposal.seo.description && <div><b>Description :</b> {proposal.seo.description}</div>}
              </div>
            )}

            {proposal.images && proposal.images.length > 0 && (
              <div className="rounded-lg border border-border p-2 text-xs space-y-1">
                <div className="uppercase tracking-wider text-muted-foreground">Suggestions images (ALT / nom)</div>
                {proposal.images.map((im, i) => (
                  <div key={i}><code className="text-[hsl(var(--accent))]">{im.field}</code> — alt: « {im.alt} »{im.name && <> · nom: {im.name}</>}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={apply} disabled={applying} className="btn-primary">
                {applying ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Application…</> : <><Check className="h-3 w-3 mr-1" />Appliquer</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setProposal(null)}>
                <X className="h-3 w-3 mr-1" />Rejeter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => ask(instruction + " (autre proposition)")}>
                Régénérer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
