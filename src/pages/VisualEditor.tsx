import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { toast } from "sonner";
import {
  Layout, Shield, Info, Briefcase, Image as ImageIcon, GitBranch,
  Building2, MessageSquare, Megaphone, Mail, FileText, RefreshCw,
  Smartphone, Monitor, ExternalLink, ArrowLeft, Sparkles,
} from "lucide-react";

type SectionKey =
  | "brand" | "banner" | "hero" | "trust" | "about" | "services" | "showcase"
  | "process" | "sectors" | "testimonials" | "cta" | "contact" | "footer"
  | "service_btp" | "service_cablage" | "service_cctv" | "service_incendie" | "service_fournitures";

const SECTIONS: { key: SectionKey; label: string; anchor: string; icon: any; group: string }[] = [
  { key: "brand", label: "Marque & Logo", anchor: "hero", icon: Sparkles, group: "Accueil" },
  { key: "banner", label: "Bande défilante", anchor: "banner", icon: Megaphone, group: "Accueil" },
  { key: "hero", label: "Hero", anchor: "hero", icon: Layout, group: "Accueil" },
  { key: "trust", label: "Bandeau confiance", anchor: "trust", icon: Shield, group: "Accueil" },
  { key: "about", label: "À propos", anchor: "about", icon: Info, group: "Accueil" },
  { key: "services", label: "Services", anchor: "services", icon: Briefcase, group: "Accueil" },
  { key: "showcase", label: "Réalisations", anchor: "showcase", icon: ImageIcon, group: "Accueil" },
  { key: "process", label: "Méthode", anchor: "process", icon: GitBranch, group: "Accueil" },
  { key: "sectors", label: "Secteurs", anchor: "sectors", icon: Building2, group: "Accueil" },
  { key: "testimonials", label: "Témoignages", anchor: "testimonials", icon: MessageSquare, group: "Accueil" },
  { key: "cta", label: "Appel à l'action", anchor: "cta", icon: Megaphone, group: "Accueil" },
  { key: "contact", label: "Contact", anchor: "contact", icon: Mail, group: "Accueil" },
  { key: "footer", label: "Footer", anchor: "footer", icon: FileText, group: "Accueil" },
  { key: "service_btp", label: "Page BTP", anchor: "hero", icon: Briefcase, group: "Pages services" },
  { key: "service_cablage", label: "Page Câblage réseau", anchor: "hero", icon: Briefcase, group: "Pages services" },
  { key: "service_cctv", label: "Page CCTV", anchor: "hero", icon: Briefcase, group: "Pages services" },
  { key: "service_incendie", label: "Page Détection incendie", anchor: "hero", icon: Briefcase, group: "Pages services" },
  { key: "service_fournitures", label: "Page Fournitures", anchor: "hero", icon: Briefcase, group: "Pages services" },
];

const SECTION_PREVIEW_PATH: Partial<Record<SectionKey, string>> = {
  service_btp: "/services/btp",
  service_cablage: "/services/cablage-reseau",
  service_cctv: "/services/cctv",
  service_incendie: "/services/detection-incendie",
  service_fournitures: "/services/fournitures",
};

const VisualEditor = () => {
  const { user, isAdmin, loading } = useAuth();
  const { content, refresh } = useSiteContent();
  const [section, setSection] = useState<SectionKey>("brand");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string; key: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // Scroll the preview iframe to the selected section ONLY when the user
  // explicitly picks a section from the sidebar — not when the section
  // changes because the user clicked an element inside the preview.
  const scrollPreviewToSection = (key: SectionKey) => {
    const f = iframeRef.current;
    if (!f) return;
    const target = SECTIONS.find((s) => s.key === key)?.anchor;
    if (!target) return;
    try {
      f.contentWindow?.postMessage({ type: "lovable-scroll", id: target }, "*");
    } catch { /* noop */ }
  };

  // Listen for section/element clicks from the preview iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "lovable-section-click" && typeof data.section === "string") {
        const found = SECTIONS.find((s) => s.key === data.section || s.anchor === data.section);
        if (found) setSection(found.key);
      }
      if (data.type === "lovable-element-click" && typeof data.key === "string") {
        const sectionKey = (data.section as string) ?? data.key.split(".")[0];
        const found = SECTIONS.find((s) => s.key === sectionKey || s.anchor === sectionKey);
        if (found) setSection(found.key);
        setFocusKey(data.key);
        if (typeof data.imageUrl === "string" && data.imageUrl) {
          setLightbox({ url: data.imageUrl, alt: data.imageAlt ?? "", key: data.key });
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // After section change & DOM render, scroll the focused field into view & highlight.
  useEffect(() => {
    if (!focusKey) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-edit-key="${CSS.escape(focusKey)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-[hsl(var(--accent))]", "rounded-md");
        const input = el.querySelector<HTMLElement>("input,textarea");
        input?.focus();
        setTimeout(() => el.classList.remove("ring-2", "ring-[hsl(var(--accent))]", "rounded-md"), 1600);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [focusKey, section]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const broadcastUpdate = (key: string) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "lovable-content-updated", key }, "*");
      window.postMessage({ type: "lovable-content-updated", key }, "*");
    } catch { /* noop */ }
  };

  const updateContentByKey = async (key: string, value: string) => {
    const { data: existing } = await supabase.from("site_content").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("site_content").update({ value, updated_by: user.id }).eq("id", existing.id);
    } else {
      await supabase.from("site_content").insert({ key, type: key.endsWith("_json") ? "json" : "text", value, updated_by: user.id });
    }
    await supabase.from("admin_logs").insert({ admin_id: user.id, action: "update_content", target_type: "content", target_id: key });
    await refresh();
    broadcastUpdate(key);
    toast.success("Mise à jour réussie", { description: key, duration: 1500 });
  };

  const deleteContentByKey = async (key: string) => {
    await supabase.from("site_content").delete().eq("key", key);
    await supabase.from("admin_logs").insert({ admin_id: user.id, action: "delete_content", target_type: "content", target_id: key });
    await refresh();
    broadcastUpdate(key);
  };

  const uploadForKey = async (key: string, file: File) => {
    setUploadingFor(key);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Image > 5 MB");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `content/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      await updateContentByKey(key, data.publicUrl);
      toast.success("Image mise à jour");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingFor(null);
    }
  };

  const reloadPreview = () => {
    const f = iframeRef.current;
    if (f) f.src = f.src;
  };

  const previewPath = SECTION_PREVIEW_PATH[section] ?? "/";
  const sep = previewPath.includes("?") ? "&" : "?";
  const previewSrc = `${previewPath}${sep}admin-preview=1`;

  return (
    <main className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card/70 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-display text-sm font-semibold">Éditeur visuel</h1>
          <Badge variant="outline" className="text-[10px]">Édition manuelle</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-0.5">
            <button onClick={() => setDevice("desktop")} className={`h-7 px-2 rounded-full text-xs flex items-center gap-1 ${device === "desktop" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              <Monitor className="h-3.5 w-3.5" />Desktop
            </button>
            <button onClick={() => setDevice("mobile")} className={`h-7 px-2 rounded-full text-xs flex items-center gap-1 ${device === "mobile" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              <Smartphone className="h-3.5 w-3.5" />Mobile
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={reloadPreview}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Recharger
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Voir le site</a>
          </Button>
        </div>
      </header>

      {/* 3 columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left: sections */}
        <aside className="w-56 border-r border-border bg-card/40 shrink-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-3">
              {Array.from(new Set(SECTIONS.map((s) => s.group))).map((groupName) => (
                <div key={groupName}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-2">{groupName}</div>
                  <div className="space-y-0.5">
                    {SECTIONS.filter((s) => s.group === groupName).map((s) => {
                      const Icon = s.icon;
                      const active = section === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => { setSection(s.key); scrollPreviewToSection(s.key); }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors ${
                            active ? "bg-[hsl(var(--accent))]/15 text-foreground border border-[hsl(var(--accent))]/30" : "text-foreground/70 hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Center: live preview */}
        <div className="flex-1 min-w-0 bg-muted/20 flex items-center justify-center p-4 overflow-auto">
          <div
            className="bg-background rounded-2xl shadow-elevated border border-border overflow-hidden transition-all duration-300"
            style={{
              width: device === "desktop" ? "100%" : "390px",
              height: "100%",
              maxWidth: device === "desktop" ? "1440px" : "390px",
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="Aperçu live"
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* Right: manual editor */}
        <aside className="w-[440px] border-l border-border bg-card/40 shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Édition</span>
            <Badge variant="outline" className="text-[10px]">{section}</Badge>
            <span className="ml-auto text-[10px] text-muted-foreground">Clique sur l'aperçu pour cibler</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <SectionEditor
                section={section}
                content={content}
                updateKey={updateContentByKey}
                deleteKey={deleteContentByKey}
                uploadForKey={uploadForKey}
                uploadingFor={uploadingFor}
              />
            </div>
          </ScrollArea>
        </aside>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Fermer"
            className="absolute top-6 right-6 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-2xl flex items-center justify-center transition-colors"
          >
            ×
          </button>
          <div
            className="max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.alt}
              className="max-h-[78vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
            />
            <div className="text-center text-white/90 space-y-2">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60 font-mono">{lightbox.key}</div>
              {lightbox.alt && <div className="text-sm">{lightbox.alt}</div>}
              <div className="flex items-center justify-center gap-2 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-full bg-white text-background px-4 py-2 text-xs font-semibold hover:bg-white/90 transition-colors">
                  Remplacer l'image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await uploadForKey(lightbox.key, file);
                      setLightbox(null);
                    }}
                  />
                </label>
                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />Ouvrir
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default VisualEditor;
