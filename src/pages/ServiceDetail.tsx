import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GlassNav } from "@/components/piham/GlassNav";
import { Footer } from "@/components/piham/Footer";
import { WhatsAppFab } from "@/components/piham/WhatsAppFab";
import { Lightbox, type MediaItem } from "@/components/piham/Lightbox";
import { getServiceBySlug } from "@/data/services";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildWaUrl, trackWaClick } from "@/lib/whatsapp";

const SLUG_TO_SECTION: Record<string, string> = {
  "btp": "service_btp",
  "cablage-reseau": "service_cablage",
  "cctv": "service_cctv",
  "detection-incendie": "service_incendie",
  "fournitures": "service_fournitures",
};

const ServiceDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = getServiceBySlug(slug);
  const { content, getImage } = useSiteContent();
  const { user } = useAuth();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSavedState = async () => {
      if (!slug || !user) {
        setSaved(false);
        return;
      }
      const { data } = await supabase
        .from("saved_services")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_slug", slug)
        .maybeSingle();
      if (!cancelled) setSaved(Boolean(data));
    };
    loadSavedState();
    return () => {
      cancelled = true;
    };
  }, [slug, user]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = service ? `${service.title} — PIHAM Info Services` : "PIHAM Info Services";
  const shareText = service
    ? `Découvrez ${service.title} par PIHAM Info Services : ${service.description}`
    : "Découvrez les services et réalisations de PIHAM Info Services.";

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return true;
      }
    } catch (err: unknown) {
      if ((err as DOMException)?.name === "AbortError") return true;
    }
    return false;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié", { description: "Vous pouvez maintenant le partager." });
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareTitle} — ${shareText}`);
  const encodedTitle = encodeURIComponent(shareTitle);

  const handleSave = async () => {
    if (!slug) return;
    if (!user) {
      toast.error("Connexion requise", { description: "Connectez-vous pour enregistrer ce service." });
      navigate("/auth");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("saved_services")
          .delete()
          .eq("user_id", user.id)
          .eq("service_slug", slug);
        if (error) throw error;
        setSaved(false);
        toast.success("Service retiré");
      } else {
        const { error } = await supabase
          .from("saved_services")
          .insert({ user_id: user.id, service_slug: slug });
        if (error) throw error;
        setSaved(true);
        toast.success("Service enregistré");
      }
    } catch (error: any) {
      toast.error(error.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("admin-preview") !== "1") return;
    if (window.parent === window) return;
    const editableSection = slug ? SLUG_TO_SECTION[slug] : null;
    if (!editableSection) return;

    const clearHover = () => {
      document.querySelectorAll<HTMLElement>("[data-admin-hover]").forEach((el) => {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.cursor = "";
        el.removeAttribute("data-admin-hover");
      });
    };

    const findEditable = (target: HTMLElement | null) => target?.closest<HTMLElement>("[data-editable-key]") ?? null;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      e.preventDefault();
      e.stopPropagation();
      const editable = findEditable(target);
      if (editable) {
        const img = editable.tagName === "IMG"
          ? (editable as HTMLImageElement)
          : editable.querySelector<HTMLImageElement>("img");
        window.parent.postMessage(
          {
            type: "lovable-element-click",
            key: editable.getAttribute("data-editable-key"),
            section: editableSection,
            imageUrl: img ? (img.currentSrc || img.src) : undefined,
            imageAlt: img?.alt,
          },
          "*",
        );
        return;
      }
      window.parent.postMessage({ type: "lovable-section-click", section: editableSection }, "*");
    };

    const onOver = (e: MouseEvent) => {
      clearHover();
      const editable = findEditable(e.target as HTMLElement) ?? document.querySelector<HTMLElement>("[data-service-detail]");
      if (!editable) return;
      editable.style.outline = "2px solid hsl(var(--accent))";
      editable.style.outlineOffset = editable.hasAttribute("data-editable-key") ? "2px" : "-4px";
      editable.style.cursor = "pointer";
      editable.setAttribute("data-admin-hover", "1");
    };

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "lovable-scroll") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("mouseover", onOver);
    window.addEventListener("message", onMessage);
    return () => {
      clearHover();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("message", onMessage);
    };
  }, [location.search, slug]);

  if (!service) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-semibold">Service introuvable</h1>
          <button onClick={() => navigate("/")} className="btn-primary mt-6">
            Retour à l'accueil
          </button>
        </div>
      </main>
    );
  }

  const sectionKey = slug ? SLUG_TO_SECTION[slug] : null;
  const gallery = sectionKey
    ? Array.from({ length: 5 }, (_, i) => {
        const key = `${sectionKey}.gallery${i + 1}_url`;
        const value = (content[key] ?? "").trim();
        return { key, src: value ? getImage(key) : service.gallery[i] };
      })
    : service.gallery.map((src, i) => ({ key: `service.gallery${i + 1}_url`, src }));

  const galleryItems: MediaItem[] = gallery.map((src, i) => ({
    type: "image",
    src: src.src,
    title: `${service.title} — image ${i + 1}`,
    tag: service.tag,
  }));

  return (
    <main className="relative bg-background text-foreground min-h-screen overflow-x-hidden">
      <GlassNav />

      <div className="container pt-28 md:pt-32 pb-20">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
          <Link to="/" className="hover:text-[hsl(var(--accent))] transition-colors">Accueil</Link>
          <span>›</span>
          <Link to="/#services" className="hover:text-[hsl(var(--accent))] transition-colors">Services</Link>
          <span>›</span>
          <span className="text-foreground">{service.title}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--accent))] font-semibold">
              {service.tag}
            </div>
            <h1 className="mt-2 font-display text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              {service.shortTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 hover:text-[hsl(var(--accent))] transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Partager
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[60]">
                <DropdownMenuItem
                  onClick={async () => {
                    const ok = await handleNativeShare();
                    if (!ok) await handleCopyLink();
                  }}
                >
                  📤 Partage rapide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openShare(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
                >
                  💬 WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
                >
                  📘 Facebook
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
                >
                  🐦 X (Twitter)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
                >
                  💼 LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openShare(`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`)}
                >
                  ✈️ Telegram
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`;
                  }}
                >
                  ✉️ Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyLink}>
                  🔗 Copier le lien
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 hover:text-[hsl(var(--accent))] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              {saved ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Gallery — Airbnb style */}
        <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[280px] md:h-[480px]">
          <button
            onClick={() => setLightbox(0)}
            className="col-span-4 md:col-span-2 row-span-2 relative group overflow-hidden"
          >
            <img src={gallery[0].src} alt={service.title} data-editable-key={gallery[0].key} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </button>
          {gallery.slice(1, 5).map((img, i) => (
            <button
              key={img.key}
              onClick={() => setLightbox(i + 1)}
              className="hidden md:block relative group overflow-hidden"
            >
              <img src={img.src} alt={`${service.title} ${i + 2}`} loading="lazy" data-editable-key={img.key} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              {i === 3 && (
                <div className="absolute bottom-3 right-3 bg-white text-neutral-900 text-xs font-semibold px-3 py-2 rounded-lg shadow-card flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  Afficher toutes les photos
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Two-column content */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">{service.title} · {service.location.split("·")[0].trim()}</h2>
              <div className="mt-2 text-sm text-muted-foreground">
                {service.items.length} prestations · Équipes certifiées · Devis gratuit
              </div>
            </div>

            {/* Coup de cœur card */}
            <div className="rounded-2xl border border-border p-5 flex items-center gap-5 bg-card shadow-soft">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-display font-semibold text-sm">{service.badge}</div>
                  <div className="text-xs text-muted-foreground">Service plébiscité par les clients PIHAM</div>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xl font-display font-semibold">{service.rating.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">{service.reviews} avis</div>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="font-display text-xl font-semibold">À propos de ce service</h3>
              <p className="mt-3 text-foreground/80 leading-relaxed">{service.longDescription}</p>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="font-display text-xl font-semibold mb-5">Ce que nous offrons</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.highlights.map((h) => (
                  <div key={h.title} className="flex gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="text-2xl">{h.icon}</div>
                    <div>
                      <div className="font-semibold text-sm">{h.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{h.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="font-display text-xl font-semibold mb-4">Prestations incluses</h3>
              <ul className="space-y-3">
                {service.items.map((it) => (
                  <li key={it} className="flex items-center gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center text-[hsl(var(--accent))]">✓</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sticky booking card */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 rounded-2xl border border-border bg-card p-6 shadow-elevated">
              <div className="text-2xl font-display font-semibold">
                Devis gratuit <span className="text-base font-normal text-muted-foreground">sous 24h</span>
              </div>

              <div className="mt-5 grid grid-cols-2 rounded-xl border border-border overflow-hidden">
                <div className="p-3 border-r border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</div>
                  <div className="text-sm mt-1 truncate">{service.title}</div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Localisation</div>
                  <div className="text-sm mt-1 truncate">{service.location.split("·")[0]}</div>
                </div>
                <div className="col-span-2 p-3 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Délai souhaité</div>
                  <div className="text-sm mt-1">À discuter avec notre équipe</div>
                </div>
              </div>

              <Link
                to="/#contact"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white py-4 text-sm font-semibold hover:opacity-95 transition-opacity"
              >
                Demander un devis
              </Link>
              <div className="text-center text-xs text-muted-foreground mt-3">
                Aucun engagement · Réponse sous 24h
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Étude technique</span>
                  <span>Incluse</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visite sur site</span>
                  <span>Incluse</span>
                </div>
                <div className="flex justify-between font-semibold pt-3 border-t border-border">
                  <span>Estimation</span>
                  <span className="text-[hsl(var(--accent))]">Sur mesure</span>
                </div>
              </div>
            </div>

            <a
              href={buildWaUrl("22899500054", `Bonjour, je souhaite discuter du service ${service?.title ?? "PIHAM"}.`) ?? "https://wa.me/?text=Bonjour"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWaClick("service_detail", { service: service?.slug })}
              className="mt-4 block text-center text-sm text-muted-foreground hover:text-[hsl(var(--accent))] transition-colors"
            >
              🚩 Discuter sur WhatsApp
            </a>
          </aside>
        </div>
      </div>

      {lightbox !== null && (
        <Lightbox
          index={lightbox}
          items={galleryItems}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
      )}

      <Footer />
      <WhatsAppFab />
    </main>
  );
};

export default ServiceDetail;
