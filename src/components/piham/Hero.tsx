import { motion, AnimatePresence, type Variants, useMotionValue, useSpring, useTransform, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MagneticButton } from "./MagneticButton";
import { CinematicHeroSlider } from "./CinematicHeroSlider";
import heroEditorial from "@/assets/hero-editorial.jpg";
import heroSlide2 from "@/assets/showcase-rehab-1.jpg";
import heroSlide3 from "@/assets/showcase-rehab-2.jpg";
import heroSlide4 from "@/assets/showcase-rehab-4.jpg";
import heroSlide5 from "@/assets/showcase-rehab-5.jpg";
import heroSlide6 from "@/assets/showcase-rehab-6.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";
import { buildWaUrl, trackWaClick } from "@/lib/whatsapp";

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(14px)", scale: 0.96 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: { duration: 1.1, delay: 0.15 + i * 0.11, ease: EASE },
  }),
};

const reveal: Variants = {
  hidden: { y: "110%", skewY: 6, opacity: 0.4 },
  show: (i: number = 0) => ({
    y: "0%",
    skewY: 0,
    opacity: 1,
    transition: { duration: 1.2, delay: 0.2 + i * 0.14, ease: EASE },
  }),
};

// Glitch + zoom title wrapper
const Glitch = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.span
    initial={{ opacity: 0, scale: 1.18, filter: "blur(18px)" }}
    animate={{
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      x: [0, -3, 3, -1, 0],
    }}
    transition={{
      opacity: { duration: 0.9, delay, ease: EASE },
      scale: { duration: 1.4, delay, ease: EASE },
      filter: { duration: 1.0, delay, ease: EASE },
      x: { duration: 0.45, delay: delay + 0.3, times: [0, 0.25, 0.5, 0.75, 1] },
    }}
    className="inline-block"
  >
    {children}
  </motion.span>
);

// Animated counter that extracts numeric portion of a string ("150+", "12 ans", "98%")
const Counter = ({ value }: { value: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (!inView) return;
    const match = value.match(/^([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const prefix = match[1];
    const target = parseFloat(match[2].replace(",", "."));
    const suffix = match[3];
    const isInt = !match[2].includes(".") && !match[2].includes(",");
    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const n = isInt ? Math.round(v) : v.toFixed(1);
        setDisplay(`${prefix}${n}${suffix}`);
      },
    });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{display}</span>;
};

// 3D tilt card driven by mouse position
const TiltCard = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-12, 12]), { stiffness: 150, damping: 18 });
  const sx = useSpring(useTransform(mx, [0, 1], ["0%", "100%"]), { stiffness: 200, damping: 25 });
  const sy = useSpring(useTransform(my, [0, 1], ["0%", "100%"]), { stiffness: 200, damping: 25 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1200 }}
      className="relative"
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl mix-blend-overlay opacity-70"
        style={{
          background: useTransform(
            [sx, sy] as any,
            ([x, y]: any) => `radial-gradient(circle at ${x} ${y}, hsl(var(--accent) / 0.45), transparent 55%)`
          ),
        }}
      />
    </motion.div>
  );
};

export const Hero = () => {
  const { content, getImage } = useSiteContent();
  const t1 = (content["hero.title_line1"] ?? "Bâtir").trim();
  const t2a = (content["hero.title_line2_prefix"] ?? "des ").trim();
  const t2b = (content["hero.title_line2_accent"] ?? "infrastructures").trim();
  const t3 = (content["hero.title_line3"] ?? "de référence.").trim();
  const eyebrow = (content["hero.eyebrow"] ?? "Partenaire certifié · Entreprises · Banques · Institutions").trim();
  const subtitle = (content["hero.subtitle"] ?? "Conception, construction et sécurisation d'infrastructures critiques pour les entreprises, banques et institutions d'Afrique de l'Ouest. BTP, réseaux, vidéosurveillance et sûreté incendie — livrés dans les délais, aux normes internationales.").trim();
  const ctaPrimary = (content["hero.cta_primary"] ?? "Demander une consultation").trim();
  const ctaSecondary = (content["hero.cta_secondary"] ?? "Découvrir nos références").trim();
  // Stats: try JSON array first, fallback to 4 individual keys
  let stats: { v: string; l: string }[] = [];
  try {
    const raw = content["hero.stats_json"];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        stats = parsed
          .map((s: any) => ({ v: String(s?.value ?? s?.v ?? "").trim(), l: String(s?.label ?? s?.l ?? "").trim() }))
          .filter((s) => s.v || s.l);
      }
    }
  } catch { /* ignore */ }
  if (stats.length === 0) {
    stats = [
      { v: (content["hero.stat1_value"] ?? "10+").trim(), l: (content["hero.stat1_label"] ?? "Projets livrés").trim() },
      { v: (content["hero.stat2_value"] ?? "5 ans").trim(), l: (content["hero.stat2_label"] ?? "d'expérience terrain").trim() },
      { v: (content["hero.stat3_value"] ?? "95%").trim(), l: (content["hero.stat3_label"] ?? "Clients satisfaits").trim() },
      { v: (content["hero.stat4_value"] ?? "24/7").trim(), l: (content["hero.stat4_label"] ?? "Support & maintenance").trim() },
    ];
  }
  const heroImage = (content["hero.image_url"] ?? "").trim() ? getImage("hero.image_url") : heroEditorial;
  const heroImageAlt = (content["hero.image_alt"] ?? "Visuel d'accueil").trim();
  const slideFallbacks = [heroImage, heroSlide2, heroSlide3, heroSlide4, heroSlide5, heroSlide6];
  const heroSlides = slideFallbacks.map((fallback, i) => {
    const key = `hero.image${i + 1}_url`;
    return (content[key] ?? "").trim() ? getImage(key) : fallback;
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const SLIDE_DURATION = 3500;
  // Preload all slides up-front to eliminate flashes on transition
  const [loadedCount, setLoadedCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoadedCount(0);
    let count = 0;
    heroSlides.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      (img as any).fetchPriority = "high";
      const done = () => {
        if (cancelled) return;
        count += 1;
        setLoadedCount(count);
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSlides.join("|")]);
  const allLoaded = loadedCount >= heroSlides.length;
  // Cycle slides; key on slideIndex via a resettable interval (manual clicks restart timing)
  const [cycleTick, setCycleTick] = useState(0);
  useEffect(() => {
    if (heroSlides.length <= 1 || !allLoaded) return;
    const id = setTimeout(() => {
      setSlideIndex((i) => (i + 1) % heroSlides.length);
    }, SLIDE_DURATION);
    return () => clearTimeout(id);
  }, [slideIndex, cycleTick, heroSlides.length, allLoaded]);
  const goToSlide = (i: number) => {
    setSlideIndex(i);
    setCycleTick((t) => t + 1);
  };
  const brandName = (content["brand.name"] ?? "PIHAM Info Services").trim();
  return (
    <HeroSection>
      {/* Atmospheric background */}
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute inset-0 opacity-90" style={{ background: "var(--gradient-mesh)" }} />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55, x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ opacity: { duration: 1.8 }, x: { duration: 22, repeat: Infinity, ease: "easeInOut" }, y: { duration: 26, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[12%] left-[6%] h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.55), transparent 70%)" }}
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45, x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ opacity: { duration: 1.8, delay: 0.4 }, x: { duration: 28, repeat: Infinity, ease: "easeInOut" }, y: { duration: 24, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute bottom-[-5%] right-[-5%] h-[600px] w-[600px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.50), transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="container relative py-12 md:py-20">
        {/* Eyebrow live indicator */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-foreground/85">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--accent))]" />
            </span>
            {eyebrow}
          </div>
          <div className="hidden md:inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            BTP · Réhabilitation · IT · Télécom · Fourniture
          </div>
        </motion.div>

        {/* Massive editorial headline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end">
          <div className="lg:col-span-8">
            <h1 className="font-display font-semibold text-foreground text-[11vw] sm:text-[8.5vw] lg:text-[6.4vw] leading-[1.05] tracking-[-0.035em] [hyphens:none] [word-break:normal] [overflow-wrap:normal]">
              <span className="block overflow-hidden">
                <motion.span variants={reveal} initial="hidden" animate="show" custom={0} className="block text-foreground/90">
                  {t1}
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span variants={reveal} initial="hidden" animate="show" custom={1} className="block">
                  <span className="italic font-light text-foreground/60">{t2a}</span>
                  <Glitch delay={0.55}>
                    <span className="bg-gradient-to-r from-[hsl(var(--accent-glow))] via-[hsl(var(--accent))] to-[hsl(var(--gold))] bg-clip-text text-transparent drop-shadow-[0_0_50px_hsl(var(--accent)/0.4)]">
                      {t2b}
                    </span>
                  </Glitch>
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span variants={reveal} initial="hidden" animate="show" custom={2} className="block text-foreground/85">
                  {t3}
                </motion.span>
              </span>
            </h1>
          </div>

          {/* Editorial image card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="lg:col-span-4 relative"
          >
            <TiltCard>
              <CinematicHeroSlider
                slides={heroSlides}
                alt={heroImageAlt}
                index={slideIndex}
                onChange={goToSlide}
                cycleTick={cycleTick}
                duration={SLIDE_DURATION}
                allLoaded={allLoaded}
                cardEyebrow={(content["hero.card_eyebrow"] ?? "Chantier · Lomé").trim()}
                cardTitle={(content["hero.card_title"] ?? "Pôle BTP — 2026").trim()}
              />
            </TiltCard>

            {/* (Badge ISO retiré) */}
          </motion.div>
        </div>

        {/* Sub copy + CTAs row */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8 border-t border-border"
        >
          <div className="lg:col-span-6">
            <p className="text-base md:text-xl text-foreground/75 leading-relaxed max-w-xl">
              <span className="text-foreground font-medium">{brandName}.</span> {subtitle}
            </p>
          </div>

          <div className="lg:col-span-6 flex flex-wrap items-center gap-3 lg:justify-end">
            <MagneticButton
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white px-7 py-4 text-sm font-semibold shadow-[0_12px_40px_hsl(var(--accent)/0.45)] hover:shadow-[0_16px_50px_hsl(var(--accent)/0.6)] transition-shadow duration-300"
            >
              {ctaPrimary}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </MagneticButton>
            <MagneticButton
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-full glass text-foreground px-7 py-4 text-sm font-semibold hover:bg-background-elevated transition-all duration-300"
            >
              {ctaSecondary}
            </MagneticButton>
            <MagneticButton
              href={buildWaUrl("22899500054", "Bonjour, je souhaite échanger avec PIHAM Info Services.") ?? "https://wa.me/?text=Bonjour"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWaClick("hero")}
              className="relative inline-flex items-center gap-2 rounded-full text-white px-5 py-4 text-sm font-semibold transition-shadow duration-300"
            >
              <span style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }} className="absolute inset-0 -z-10 rounded-full" />
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M20.5 3.5C18.3 1.2 15.3 0 12 0 5.4 0 0 5.4 0 12c0 2.1.5 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.3zM12 21.8c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.6 15.6 2 13.8 2 12 2 6.5 6.5 2 12 2c2.7 0 5.2 1 7 3 1.9 1.9 3 4.4 3 7 0 5.5-4.5 9.8-10 9.8z" />
              </svg>
              WhatsApp
            </MagneticButton>
          </div>
        </motion.div>

        {/* Stats premium — entreprises, banques, institutions */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={6}
          className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((s, i) => (
            <motion.div
              key={`${s.l}-${i}`}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative glass rounded-2xl px-5 py-5 border border-border/60 hover:border-[hsl(var(--accent))]/40 transition-colors overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.15)] to-transparent" />
              <div className="font-display text-3xl md:text-4xl font-semibold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                <Counter value={s.v} />
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {s.l}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Marquee ticker */}
      <div className="relative border-y border-border bg-background-elevated/90 backdrop-blur-md overflow-hidden py-6 mt-8 shadow-sm">
        <div className="flex gap-12 animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
          {[...Array(2)].map((_, k) => {
            const defaults = ["Génie civil", "Réhabilitation patrimoine", "Fibre optique", "Datacenter", "Routes & VRD", "Bâtiments industriels", "Réseau télécom", "Fourniture matériaux", "Maîtrise d'œuvre"];
            const words = defaults.map((d, i) => ({
              key: `hero.marquee${i + 1}`,
              text: (content[`hero.marquee${i + 1}`] ?? d).trim(),
            })).filter((w) => w.text.length > 0);
            return (
              <div key={k} className="flex items-center gap-12 shrink-0">
                {words.map((w) => (
                  <div key={w.key + k} className="flex items-center gap-12 text-foreground">
                    <button
                      type="button"
                      data-editable-key={w.key}
                      aria-label={`Éditer ${w.text}`}
                      className="font-display text-2xl md:text-3xl tracking-tight font-medium cursor-pointer bg-transparent border-0 p-0 hover:text-[hsl(var(--accent))] transition-colors"
                    >
                      {w.text}
                    </button>
                    <span className="text-[hsl(var(--accent))] text-2xl">✦</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.8, duration: 1 }, y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/50">Scroll</span>
        <span className="h-8 w-px bg-gradient-to-b from-foreground/50 to-transparent" />
      </motion.div>
    </HeroSection>
  );
};

// Wrapper that adds a cursor-following spotlight over the hero section
const HeroSection = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const bg = useTransform(
    [sx, sy] as any,
    ([x, y]: any) =>
      `radial-gradient(600px circle at ${x}% ${y}%, hsl(var(--accent) / 0.18), transparent 60%)`
  );
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };
  return (
    <section
      id="hero"
      ref={ref}
      onMouseMove={onMove}
      className="relative min-h-screen w-full overflow-hidden pt-24 md:pt-28"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[5]"
        style={{ background: bg }}
      />
      {children}
    </section>
  );
};
