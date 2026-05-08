import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { GripVertical, X, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  section: string;
  content: Record<string, string>;
  updateKey: (key: string, value: string) => Promise<void>;
  deleteKey: (key: string) => Promise<void>;
  uploadForKey: (key: string, file: File) => Promise<void>;
  uploadingFor: string | null;
};

const isImageKey = (k: string) =>
  /image|logo|photo|picture|avatar|cover|background|bg_url|_url$/i.test(k) &&
  !k.endsWith("_alt") &&
  !k.endsWith("_json");

const isLong = (v: string) => v.length > 80 || v.includes("\n");

const prettyLabel = (key: string) => {
  const part = key.split(".").slice(1).join(".") || key;
  return part.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export const SectionEditor = ({
  section,
  content,
  updateKey,
  deleteKey,
  uploadForKey,
  uploadingFor,
}: Props) => {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = Object.entries(content)
    .filter(([k]) => k.startsWith(section + "."))
    .sort(([a], [b]) => a.localeCompare(b));

  const images = entries.filter(([k]) => isImageKey(k));
  // Détecte les groupes de galerie : gallery1_url..galleryN_url ou image1_url..imageN_url
  const galleryKeys = images
    .map(([k]) => k)
    .filter((k) => /\.(gallery|image)\d+_url$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)_url$/)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/(\d+)_url$/)?.[1] ?? "0", 10);
      return na - nb;
    });
  const jsons = entries.filter(([k]) => k.endsWith("_json"));
  const texts = entries.filter(
    ([k]) => !isImageKey(k) && !k.endsWith("_json"),
  );

  const handleDelete = async (k: string) => {
    if (!confirm(`Supprimer la clé "${k}" ?`)) return;
    await deleteKey(k);
    toast.success("Supprimé");
  };

  const handleAdd = async () => {
    const k = newKey.trim();
    if (!k) return toast.error("Clé vide");
    const fullKey = k.startsWith(section + ".") ? k : `${section}.${k}`;
    await updateKey(fullKey, newValue);
    setNewKey("");
    setNewValue("");
    toast.success("Ajouté");
  };

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Section <Badge variant="outline">{section}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucun contenu personnalisé pour cette section. Ajoute une clé ci-dessous pour commencer.
            </p>
          </CardContent>
        </Card>
        <AddBlock
          section={section}
          newKey={newKey}
          newValue={newValue}
          setNewKey={setNewKey}
          setNewValue={setNewValue}
          onAdd={handleAdd}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Section <Badge variant="outline">{section}</Badge>
            <span className="text-xs text-muted-foreground font-normal">{entries.length} champs</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {texts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Textes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {texts.map(([k, v]) => (
              <div key={k} data-edit-key={k} className="space-y-1 p-1 -m-1 transition-shadow">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">
                    {prettyLabel(k)}
                    <code className="ml-2 text-[10px] font-mono text-muted-foreground">{k}</code>
                  </Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(k)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isLong(v) ? (
                  <Textarea
                    defaultValue={v}
                    rows={3}
                    onBlur={(e) => e.target.value !== v && updateKey(k, e.target.value)}
                  />
                ) : (
                  <Input
                    defaultValue={v}
                    onBlur={(e) => e.target.value !== v && updateKey(k, e.target.value)}
                  />
                )}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Sauvegarde automatique à la perte de focus.</p>
          </CardContent>
        </Card>
      )}

      {images.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Images</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {galleryKeys.length >= 2 && (
              <BulkUploader key={galleryKeys.join("|")} galleryKeys={galleryKeys} uploadForKey={uploadForKey} />
            )}
            {images.map(([k, v]) => (
              <div key={k} data-edit-key={k} className="space-y-2 p-1 -m-1 transition-shadow">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    {prettyLabel(k)}
                    <code className="ml-2 text-[10px] font-mono text-muted-foreground">{k}</code>
                  </Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(k)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  {v ? (
                    <img src={v} alt="" className="h-24 w-24 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-24 w-24 rounded-lg border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
                      Aucune
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingFor === k}
                      onChange={(e) => e.target.files?.[0] && uploadForKey(k, e.target.files[0])}
                    />
                    <Input
                      defaultValue={v}
                      placeholder="ou URL directe"
                      onBlur={(e) => e.target.value !== v && updateKey(k, e.target.value)}
                    />
                    {v && (
                      <Button size="sm" variant="outline" onClick={() => updateKey(k, "")}>
                        Vider
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {jsons.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Listes (JSON)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jsons.map(([k, v]) => (
              <div key={k} data-edit-key={k} className="space-y-1 p-1 -m-1 transition-shadow">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    {prettyLabel(k)}
                    <code className="ml-2 text-[10px] font-mono text-muted-foreground">{k}</code>
                  </Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(k)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  defaultValue={v}
                  rows={6}
                  className="font-mono text-xs"
                  onBlur={(e) => {
                    if (e.target.value === v) return;
                    try {
                      JSON.parse(e.target.value);
                      updateKey(k, e.target.value);
                    } catch {
                      toast.error(`JSON invalide pour ${k}`);
                    }
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AddBlock
        section={section}
        newKey={newKey}
        newValue={newValue}
        setNewKey={setNewKey}
        setNewValue={setNewValue}
        onAdd={handleAdd}
      />
    </div>
  );
};

const AddBlock = ({
  section, newKey, newValue, setNewKey, setNewValue, onAdd,
}: {
  section: string;
  newKey: string;
  newValue: string;
  setNewKey: (s: string) => void;
  setNewValue: (s: string) => void;
  onAdd: () => void;
}) => (
  <Card>
    <CardHeader><CardTitle className="text-sm">Ajouter un champ</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">{section}.</span>
        <Input
          placeholder="nouvelle_cle"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1"
        />
      </div>
      <Textarea
        placeholder="Valeur"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        rows={2}
      />
      <Button size="sm" onClick={onAdd}><Plus className="h-3 w-3 mr-1" />Ajouter</Button>
    </CardContent>
  </Card>
);

type FileItem = {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

const BulkUploader = ({
  galleryKeys,
  uploadForKey,
}: {
  galleryKeys: string[];
  uploadForKey: (key: string, file: File) => Promise<void>;
}) => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const max = galleryKeys.length;

  const onSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, max);
    const next: FileItem[] = arr.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: "pending",
    }));
    setItems(next);
    setProgress(0);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const updateItem = (id: string, patch: Partial<FileItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const uploadOne = async (item: FileItem, slot: number) => {
    updateItem(item.id, { status: "uploading", error: undefined });
    try {
      await uploadForKey(galleryKeys[slot], item.file);
      updateItem(item.id, { status: "success" });
      return true;
    } catch (e: any) {
      updateItem(item.id, { status: "error", error: e?.message ?? "Erreur" });
      return false;
    }
  };

  const startUpload = async () => {
    if (items.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    let done = 0;
    const total = items.length;
    // Snapshot order for slot mapping
    const snapshot = [...items];
    const keySnapshot = [...galleryKeys];
    let failed = 0;
    for (let i = 0; i < snapshot.length; i++) {
      updateItem(snapshot[i].id, { status: "uploading", error: undefined });
      try {
        await uploadForKey(keySnapshot[i], snapshot[i].file);
        updateItem(snapshot[i].id, { status: "success" });
      } catch (e: any) {
        failed++;
        updateItem(snapshot[i].id, { status: "error", error: e?.message ?? "Erreur" });
      }
      done++;
      setProgress(Math.round((done / total) * 100));
    }
    setIsUploading(false);
    if (failed === 0) toast.success(`${total} image(s) mises à jour`);
    else toast.warning(`${total - failed}/${total} réussies — ${failed} échec(s)`);
  };

  const retry = async (id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    if (idx < 0) return;
    await uploadOne(items[idx], idx);
  };

  const reset = () => {
    items.forEach((it) => URL.revokeObjectURL(it.preview));
    setItems([]);
    setProgress(0);
  };

  return (
    <div className="rounded-lg border border-dashed border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-[hsl(var(--accent))]" />
        <Label className="text-xs font-semibold">
          Upload groupé — {max} images en une fois
        </Label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Sélectionne jusqu'à {max} images, puis glisse-dépose pour réordonner avant l'upload. L'ordre correspond à gallery1 → gallery{max}.
      </p>

      <Input
        type="file"
        accept="image/*"
        multiple
        disabled={isUploading}
        onChange={(e) => {
          onSelect(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div
                key={it.id}
                draggable={!isUploading}
                onDragStart={() => onDragStart(i)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(i)}
                className={`flex items-center gap-2 rounded-md border border-border bg-background p-2 ${
                  dragIndex === i ? "opacity-50" : ""
                } ${!isUploading ? "cursor-move" : ""}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-mono w-14 shrink-0 text-muted-foreground">
                  gallery{i + 1}
                </span>
                <img src={it.preview} alt="" className="h-10 w-10 rounded object-cover border border-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{it.file.name}</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {it.status === "pending" && <span className="text-muted-foreground">En attente</span>}
                    {it.status === "uploading" && (
                      <><Loader2 className="h-3 w-3 animate-spin" /><span>Upload…</span></>
                    )}
                    {it.status === "success" && (
                      <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600">Réussi</span></>
                    )}
                    {it.status === "error" && (
                      <><AlertCircle className="h-3 w-3 text-destructive" /><span className="text-destructive truncate">{it.error ?? "Échec"}</span></>
                    )}
                  </div>
                </div>
                {it.status === "error" && !isUploading && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => retry(it.id)} title="Réessayer">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                {!isUploading && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(it.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {(isUploading || progress > 0) && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <div className="text-[10px] text-muted-foreground text-right">{progress}%</div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={startUpload} disabled={isUploading || items.every((it) => it.status === "success")}>
              <Upload className="h-3 w-3 mr-1" />
              {isUploading ? "Upload en cours…" : `Lancer l'upload (${items.length})`}
            </Button>
            <Button size="sm" variant="outline" onClick={reset} disabled={isUploading}>
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
