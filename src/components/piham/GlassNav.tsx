import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MagneticButton } from "./MagneticButton";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContent } from "@/hooks/useSiteContent";

const links = [
  { hash: "hero", label: "Accueil" },
  { hash: "services", label: "Services" },
  { hash: "showcase", label: "Réalisations" },
  { hash: "about", label: "À propos" },
];

export const GlassNav = () => {
  const [open, setOpen] = useState(false);
  const [navHsl, setNavHsl] = useState("0 0% 6%");
  const [activeHash, setActiveHash] = useState<string>("hero");
  const [hovered, setHovered] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const linksRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { content, getImage } = useSiteContent();
  const logoUrl = (content["brand.logo_url"] ?? "").trim() ? getImage("brand.logo_url") : "";
  const brandName = (content["brand.name"] ?? "PIHAM").trim();
  const brandTag = (content["brand.tagline"] ?? "Info Services").trim();
  

  const goToSection = (hash: string) => {
    setOpen(false);
    if (location.pathname === "/") {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${hash}`);
      }
    } else {
      navigate(`/#${hash}`);
    }
  };

  // Lit le token --nav-bg-hsl pour suivre le thème (clair/sombre)
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--nav-bg-hsl")
        .trim();
      if (v) setNavHsl(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (location.pathname !== "/") return;
    const ids = links.map((l) => l.hash);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveHash(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [location.pathname]);

  // Position the underline indicator under hovered or active link
  useEffect(() => {
    const target = hovered ?? activeHash;
    const btn = linksRef.current[target];
    const container = linksContainerRef.current;
    if (!btn || !container) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - cr.left, width: br.width });
  }, [hovered, activeHash, location.pathname]);

  const blurPx = useTransform(scrollY, [0, 200], [6, 16]);
  const backdropFilter = useMotionTemplate`blur(${blurPx}px) saturate(160%)`;
  const bgAlpha = useTransform(scrollY, [0, 200], [0.25, 0.7]);
  const backgroundColor = useMotionTemplate`hsl(${navHsl} / ${bgAlpha})`;
  const borderAlpha = useTransform(scrollY, [0, 200], [0.04, 0.1]);
  const borderColor = useMotionTemplate`hsl(0 0% 50% / ${borderAlpha})`;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ backdropFilter, WebkitBackdropFilter: backdropFilter, backgroundColor, borderColor, top: "var(--banner-h, 0px)" }}
      className="fixed left-0 right-0 z-50 border-b transition-[top] duration-200"
    >
      <div className="container">
        <nav className="flex items-center justify-between py-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-3 group"
            aria-label="Retour à l'accueil"
          >
            <motion.span
              whileHover={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 0.6 }}
              className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-[0_0_24px_hsl(var(--accent)/0.35)] overflow-hidden p-0.5 ring-1 ring-white/70"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-full w-full object-contain" />
              ) : (
                <span className="text-primary font-display font-bold text-lg">{brandName.charAt(0) || "P"}</span>
              )}
            </motion.span>
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight text-base text-foreground">{brandName}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{brandTag}</div>
            </div>
          </Link>
          </motion.div>

          <div ref={linksContainerRef} className="hidden md:flex items-center gap-1 relative">
            {indicator && (
              <motion.span
                aria-hidden
                className="absolute bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--gold))]"
                animate={{ left: indicator.left, width: indicator.width }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {indicator && (
              <motion.span
                aria-hidden
                className="absolute inset-y-1 rounded-full bg-foreground/5 -z-0"
                animate={{ left: indicator.left, width: indicator.width }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {links.map((l, i) => (
              <motion.button
                ref={(el) => (linksRef.current[l.hash] = el)}
                key={l.hash}
                type="button"
                onClick={() => goToSection(l.hash)}
                onMouseEnter={() => setHovered(l.hash)}
                onMouseLeave={() => setHovered(null)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`relative px-5 py-2.5 text-[15px] font-semibold tracking-tight transition-colors duration-200 rounded-full z-10 ${
                  activeHash === l.hash ? "text-foreground" : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {l.label}
              </motion.button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-full hover:bg-white/5">
                  Mon espace
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-full hover:bg-white/5">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <Link to="/auth" className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-full hover:bg-white/5">
                Connexion
              </Link>
            )}
            <MagneticButton
              href={location.pathname === "/" ? "#contact" : "/#contact"}
              onClick={(e) => {
                if (location.pathname === "/") {
                  e.preventDefault();
                  goToSection("contact");
                }
              }}
              className="btn-primary !px-6 !py-3 text-[15px] font-semibold shadow-[0_8px_30px_hsl(var(--accent)/0.45)] hover:shadow-[0_12px_40px_hsl(var(--accent)/0.6)] ring-1 ring-[hsl(var(--accent))]/40"
            >
              Contact
              <span>→</span>
            </MagneticButton>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setOpen((v) => !v)}
              className="h-10 w-10 rounded-full glass flex items-center justify-center"
              aria-label="Menu"
            >
              <span className="relative w-5 h-3 block">
                <span className={`absolute left-0 top-0 w-full h-0.5 bg-foreground transition-transform duration-300 ${open ? "translate-y-1.5 rotate-45" : ""}`} />
                <span className={`absolute left-0 bottom-0 w-full h-0.5 bg-foreground transition-transform duration-300 ${open ? "-translate-y-1 -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden pb-4 overflow-hidden"
          >
            <div className="rounded-2xl glass-strong p-2">
              {links.map((l, i) => (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  key={l.hash}
                  type="button"
                  onClick={() => goToSection(l.hash)}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-foreground/85 hover:bg-white/5 rounded-xl"
                >
                  {l.label}
                </motion.button>
              ))}
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-foreground/85 hover:bg-white/5 rounded-xl">
                    Mon espace
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-foreground/85 hover:bg-white/5 rounded-xl">
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-foreground/85 hover:bg-white/5 rounded-xl">
                  Connexion
                </Link>
              )}
              <button
                type="button"
                onClick={() => goToSection("contact")}
                className="mt-2 block text-center btn-primary w-full"
              >
                Contact
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};
