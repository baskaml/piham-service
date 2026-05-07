import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { GlassNav } from "@/components/piham/GlassNav";
import { Footer } from "@/components/piham/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <GlassNav />
      <section className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="text-center max-w-xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] font-semibold">
            Erreur 404
          </div>
          <h1 className="mt-4 font-display text-5xl md:text-7xl font-semibold tracking-tight">
            Page introuvable
          </h1>
          <p className="mt-5 text-muted-foreground text-base md:text-lg leading-relaxed">
            Le lien <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-sm">{location.pathname}</code> n'existe pas ou a été déplacé.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white px-7 py-4 text-sm font-semibold shadow-[0_12px_40px_hsl(var(--accent)/0.45)] hover:shadow-[0_16px_50px_hsl(var(--accent)/0.6)] transition-shadow"
            >
              Retour à l'accueil
              <span>→</span>
            </Link>
            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 rounded-full glass text-foreground px-7 py-4 text-sm font-semibold hover:bg-background-elevated transition-all"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default NotFound;
