import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassNav } from "@/components/piham/GlassNav";
import { BannerTicker } from "@/components/piham/BannerTicker";
import { Footer } from "@/components/piham/Footer";

type Page = { id: string; slug: string; title: string; content: string; image_url: string | null; published: boolean };

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("pages").select("*").eq("slug", slug ?? "").maybeSingle();
      if (!active) return;
      setPage((data as Page) ?? null);
      if (data?.title) document.title = `${data.title} — PIHAM`;
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <BannerTicker />
      <GlassNav />
      <article className="container max-w-3xl pt-32 pb-20">
        {loading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : !page ? (
          <div className="text-center py-20">
            <h1 className="font-display text-4xl mb-4">Page introuvable</h1>
            <Link to="/" className="text-[hsl(var(--accent))] underline">Retour à l'accueil</Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mb-6">{page.title}</h1>
            {page.image_url && (
              <img src={page.image_url} alt={page.title} className="w-full rounded-3xl shadow-elevated mb-10 object-cover max-h-[480px]" />
            )}
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-base md:text-lg leading-relaxed text-foreground/85">
              {page.content}
            </div>
          </>
        )}
      </article>
      <Footer />
    </main>
  );
};

export default DynamicPage;