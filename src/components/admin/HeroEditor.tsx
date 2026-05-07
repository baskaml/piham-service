import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Stat = { value: string; label: string };

type Props = {
  content: Record<string, string>;
  updateKey: (key: string, value: string) => Promise<void>;
  uploadForKey: (key: string, file: File) => Promise<void>;
  uploadingFor: string | null;
};

const FIELDS: { key: string; label: string; multi?: boolean; placeholder?: string }[] = [
  { key: "hero.eyebrow", label: "Bandeau (eyebrow)" },
  { key: "hero.title_line1", label: "Titre — ligne 1" },
  { key: "hero.title_line2_prefix", label: "Titre — ligne 2 (préfixe italique)" },
  { key: "hero.title_line2_accent", label: "Titre — ligne 2 (mot accentué)" },
  { key: "hero.title_line3", label: "Titre — ligne 3" },
  { key: "hero.subtitle", label: "Sous-titre", multi: true },
  { key: "hero.cta_primary", label: "CTA principal — texte" },
  { key: "hero.cta_secondary", label: "CTA secondaire — texte" },
];

const DEFAULT_STATS: Stat[] = [
  { value: "150+", label: "Projets livrés" },
  { value: "12 ans", label: "d'expertise terrain" },
  { value: "98%", label: "Clients fidélisés" },
  { value: "24/7", label: "Support & maintenance" },
];

function parseStats(content: Record<string, string>): Stat[] {
  try {
    const raw = content["hero.stats_json"];
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        return p.map((s: any) => ({ value: String(s?.value ?? s?.v ?? ""), label: String(s?.label ?? s?.l ?? "") }));
      }
    }
  } catch { /* ignore */ }
  // fallback to legacy individual keys
  const fallback: Stat[] = [];
  for (let i = 1; i <= 4; i++) {
    const v = content[`hero.stat${i}_value`];
    const l = content[`hero.stat${i}_label`];
    if (v || l) fallback.push({ value: v ?? "", label: l ?? "" });
  }
  return fallback.length ? fallback : DEFAULT_STATS;
}

export const HeroEditor = ({ content, updateKey, uploadForKey, uploadingFor }: Props) => {
  const [stats, setStats] = useState<Stat[]>(() => parseStats(content));
  const [savingStats, setSavingStats] = useState(false);
  const heroImage = content["hero.image_url"] ?? "";
  const heroAlt = content["hero.image_alt"] ?? "";

  // resync if remote changes
  useEffect(() => { setStats(parseStats(content)); /* eslint-disable-next-line */ }, [content["hero.stats_json"]]);

  const saveStats = async () => {
    setSavingStats(true);
    try {
      await updateKey("hero.stats_json", JSON.stringify(stats));
      toast.success("Statistiques enregistrées");
    } finally { setSavingStats(false); }
  };

  const updateStat = (i: number, patch: Partial<Stat>) =>
    setStats(stats.map((s, j) => (i === j ? { ...s, ...patch } : s)));
  const addStat = () => setStats([...stats, { value: "", label: "" }]);
  const removeStat = (i: number) => setStats(stats.filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Section Hero
            <Badge variant="outline">éditeur visuel</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              {f.multi ? (
                <Textarea
                  defaultValue={content[f.key] ?? ""}
                  rows={3}
                  onBlur={(e) => updateKey(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : (
                <Input
                  defaultValue={content[f.key] ?? ""}
                  onBlur={(e) => updateKey(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Enregistré automatiquement à la perte de focus.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Statistiques</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addStat}>+ Ajouter</Button>
            <Button size="sm" onClick={saveStats} disabled={savingStats}>
              {savingStats ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.length === 0 && <p className="text-sm text-muted-foreground">Aucune statistique.</p>}
          {stats.map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
              <Input value={s.value} placeholder="Valeur (ex: 150+)" onChange={(e) => updateStat(i, { value: e.target.value })} />
              <Input value={s.label} placeholder="Libellé (ex: Projets livrés)" onChange={(e) => updateStat(i, { label: e.target.value })} />
              <Button size="sm" variant="ghost" onClick={() => removeStat(i)}>🗑️</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Image de la section</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            {heroImage ? (
              <img src={heroImage} alt={heroAlt || "preview"} className="h-40 w-32 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="h-40 w-32 rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">Aucune</div>
            )}
            <div className="flex-1 space-y-2">
              <Label>Changer l'image (max 5 MB)</Label>
              <Input type="file" accept="image/*" disabled={uploadingFor === "hero.image_url"}
                onChange={(e) => e.target.files?.[0] && uploadForKey("hero.image_url", e.target.files[0])} />
              {heroImage && (
                <Button variant="outline" size="sm" onClick={() => updateKey("hero.image_url", "")}>Supprimer l'image</Button>
              )}
            </div>
          </div>
          <div>
            <Label>Texte alternatif (ALT — SEO & accessibilité)</Label>
            <Input defaultValue={heroAlt} onBlur={(e) => updateKey("hero.image_alt", e.target.value)}
              placeholder="Ex : Chantier moderne à Lomé" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
