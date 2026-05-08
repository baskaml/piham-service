import { Link } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Footer = () => {
  const { content, getImage } = useSiteContent();
  const brandName = (content["brand.name"] ?? "PIHAM").trim();
  const brandTag = (content["brand.tagline"] ?? "Info Services").trim();
  const logoUrl = (content["brand.logo_url"] ?? "").trim() ? getImage("brand.logo_url") : "";
  const tagline = (content["footer.tagline"] ?? "Construire. Innover. Connecter. Solutions BTP, Télécom, Informatique et Fourniture — sous une seule exigence.").trim();
  const email = (content["contact.email"] ?? "pihaminfoservices@gmail.com").trim();
  const phone = (content["contact.phone"] ?? "+228 99 50 00 54").trim();
  const address = (content["contact.address"] ?? "Lomé, Agoè 2 Lions").trim();
  const credit = (content["footer.credit"] ?? "Conçu avec précision.").trim();

  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);
  useEffect(() => {
    supabase.from("pages").select("slug,title").eq("published", true).order("title").then(({ data }) => {
      if (data) setPages(data as any);
    });
  }, []);

  return (
  <footer id="footer" className="relative bg-primary text-white py-14">
    <div className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <span className="h-12 w-12 rounded-xl bg-white flex items-center justify-center overflow-hidden p-0.5 ring-1 ring-white/70">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-full w-full object-contain" />
              ) : (
                <span className="text-primary font-display font-bold">{brandName.charAt(0) || "P"}</span>
              )}
            </span>
            <div>
              <div className="font-display font-semibold text-white">{brandName}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">{brandTag}</div>
            </div>
          </Link>
          <p className="mt-5 max-w-md text-sm text-white/70 leading-relaxed">
            {tagline}
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/60 font-semibold">Navigation</div>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/#services" className="hover:text-[hsl(var(--accent-glow))] transition-colors">Services</Link></li>
            <li><Link to="/#showcase" className="hover:text-[hsl(var(--accent-glow))] transition-colors">Réalisations</Link></li>
            <li><Link to="/#about" className="hover:text-[hsl(var(--accent-glow))] transition-colors">À propos</Link></li>
            <li><Link to="/#contact" className="hover:text-[hsl(var(--accent-glow))] transition-colors">Contact</Link></li>
            {pages.map((p) => (
              <li key={p.slug}><Link to={`/p/${p.slug}`} className="hover:text-[hsl(var(--accent-glow))] transition-colors">{p.title}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/60 font-semibold">Nous joindre</div>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><a href={`mailto:${email}`} className="hover:text-[hsl(var(--accent-glow))]">{email}</a></li>
            <li><a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-[hsl(var(--accent-glow))]">{phone}</a></li>
            <li>{address}</li>
          </ul>
        </div>
      </div>
      <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
        <div>© {new Date().getFullYear()} {brandName} {brandTag}. Tous droits réservés.</div>
        <div>{credit}</div>
      </div>
    </div>
  </footer>
  );
};
