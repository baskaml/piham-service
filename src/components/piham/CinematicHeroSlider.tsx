import { useRef, useState, useEffect, MouseEvent } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { stiffness: 130, damping: 24, mass: 0.9 };

type Props = {
  slides: string[];
  alt: string;
  index: number;
  onChange: (i: number) => void;
  cycleTick: number;
  duration: number; // ms
  allLoaded: boolean;
  cardEyebrow: string;
  cardTitle: string;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const CinematicHeroSlider = ({
  slides,
  alt,
  index,
  onChange,
  cycleTick,
  duration,
  allLoaded,
  cardEyebrow,
  cardTitle,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const lastIndex = useRef(index);

  useEffect(() => {
    const prev = lastIndex.current;
    const next = index;
    if (next !== prev) {
      const forward = mod(next - prev, slides.length) <= slides.length / 2;
      setDirection(forward ? 1 : -1);
      lastIndex.current = next;
    }
  }, [index, slides.length]);

  // Mouse-driven tilt + parallax
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [9, -9]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-12, 12]), { stiffness: 120, damping: 18 });
  const px = useSpring(useTransform(mx, [0, 1], [-14, 14]), { stiffness: 90, damping: 20 });
  const py = useSpring(useTransform(my, [0, 1], [-14, 14]), { stiffness: 90, damping: 20 });
  const sheenX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const sheenY = useTransform(my, [0, 1], ["0%", "100%"]);

  const onMove = (e: MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  const go = (delta: number) => onChange(mod(index + delta, slides.length));

  // 3D layered slides — prev / active / next
  const renderLayer = (offset: -1 | 0 | 1) => {
    const i = mod(index + offset, slides.length);
    const isActive = offset === 0;
    return (
      <motion.img
        key={`layer-${i}-${offset}`}
        src={slides[i]}
        alt={isActive ? alt : ""}
        aria-hidden={!isActive}
        data-editable-key={isActive ? `hero.image${i + 1}_url` : undefined}
        draggable={false}
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0.35,
          scale: isActive ? 1.06 : 0.86,
          x: offset * 60,
          z: isActive ? 0 : -240,
          filter: isActive
            ? "blur(0px) saturate(1.08) contrast(1.06) brightness(1.02)"
            : "blur(18px) saturate(0.85) brightness(0.65)",
        }}
        transition={{
          opacity: { duration: 1.2, ease: EASE },
          scale: { duration: duration / 1000 + 1.4, ease: "linear" },
          x: { type: "spring", ...SPRING },
          z: { type: "spring", ...SPRING },
          filter: { duration: 1.0, ease: EASE },
        }}
        className="absolute inset-0 h-full w-full object-cover will-change-[transform,opacity,filter]"
        style={{ transformStyle: "preserve-3d" }}
        loading={isActive ? "eager" : "lazy"}
        decoding="async"
        width={1024}
        height={1280}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative"
      style={{ perspective: 2000, perspectiveOrigin: "50% 40%" }}
    >
      {/* Ambient glow halo behind the card */}
      <motion.div
        aria-hidden
        key={`halo-${index}`}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        className="pointer-events-none absolute -inset-10 rounded-[3rem] -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, hsl(var(--accent) / 0.45), transparent 70%), radial-gradient(40% 40% at 80% 30%, hsl(var(--gold) / 0.30), transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <motion.div
        style={{
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
        }}
        className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-elevated group"
      >
        {/* Skeleton */}
        {!allLoaded && (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-background-elevated via-background to-background-elevated">
            <motion.div
              aria-hidden
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        )}

        {/* 3D layered slides */}
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {allLoaded && renderLayer(-1)}
          {allLoaded && renderLayer(1)}
          {allLoaded && (
            <motion.div
              key={`active-wrap-${index}`}
              className="absolute inset-0"
              initial={{ opacity: 0, z: -120 * direction, scale: 1.12, filter: "blur(20px)" }}
              animate={{ opacity: 1, z: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, z: 120 * direction, scale: 0.94, filter: "blur(20px)" }}
              transition={{
                opacity: { duration: 1.0, ease: EASE },
                z: { type: "spring", ...SPRING },
                scale: { duration: 1.4, ease: EASE },
                filter: { duration: 0.9, ease: EASE },
              }}
              style={{ x: px, y: py, transformStyle: "preserve-3d" }}
            >
              {renderLayer(0)}
            </motion.div>
          )}
        </div>

        {/* Cinematic color grading & vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-70"
          style={{
            background:
              "linear-gradient(160deg, hsl(28 60% 60% / 0.18) 0%, transparent 35%, hsl(220 30% 10% / 0.30) 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_140px_rgba(0,0,0,0.65)]" />

        {/* Premium grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Cursor specular sheen */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            background: useTransform(
              [sheenX, sheenY] as any,
              ([x, y]: any) =>
                `radial-gradient(420px circle at ${x} ${y}, hsl(0 0% 100% / 0.22), transparent 55%)`
            ),
          }}
        />

        {/* Cinematic light sweep on slide change */}
        <AnimatePresence>
          <motion.div
            key={`sweep-${index}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ x: direction === 1 ? "-130%" : "130%", skewX: -16, opacity: 0 }}
              animate={{ x: direction === 1 ? "130%" : "-130%", opacity: [0, 0.55, 0] }}
              transition={{ duration: 1.3, ease: EASE }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent mix-blend-overlay"
            />
          </motion.div>
        </AnimatePresence>

        {/* Counter badge */}
        <div
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-foreground"
          style={{ transform: "translateZ(60px)" }}
        >
          <span className="tabular-nums text-foreground">{String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-4 bg-foreground/40" />
          <span className="tabular-nums text-foreground/60">{String(slides.length).padStart(2, "0")}</span>
        </div>

        {/* Floating navigation arrows */}
        <button
          type="button"
          aria-label="Slide précédente"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full glass-strong text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-white/20 transition-all duration-500"
          style={{ transform: "translateZ(80px) translateY(-50%)" }}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Slide suivante"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full glass-strong text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-white/20 transition-all duration-500"
          style={{ transform: "translateZ(80px) translateY(-50%)" }}
        >
          →
        </button>

        {/* Slide indicators (segmented progress) */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10"
          style={{ transform: "translateZ(60px) translateX(-50%)" }}
        >
          {slides.map((_, i) => {
            const isActive = i === index;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Image ${i + 1}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => { e.stopPropagation(); onChange(i); }}
                className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-500 ${
                  isActive ? "w-8 bg-white/30" : "w-1.5 bg-white/45 hover:bg-white/80"
                }`}
              >
                {isActive && allLoaded && (
                  <motion.span
                    key={`${index}-${cycleTick}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: duration / 1000, ease: "linear" }}
                    className="absolute inset-y-0 left-0 bg-white"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Floating chip top-right */}
        <div
          className="absolute top-4 right-4 z-10 glass-strong rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-foreground"
          style={{ transform: "translateZ(60px)" }}
        >
          ★ 4.92 / 5
        </div>

        {/* Bottom caption — kinetic text reveal per slide */}
        <div
          className="absolute inset-x-4 bottom-10 flex items-end justify-between gap-3 z-10"
          style={{ transform: "translateZ(70px)" }}
        >
          <div className="text-white overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`cap-${index}`}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-110%", opacity: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-semibold">
                  {cardEyebrow}
                </div>
                <div className="font-display text-xl md:text-2xl font-semibold mt-1 tracking-tight">
                  {cardTitle}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <motion.div
            whileHover={{ rotate: 45, scale: 1.12 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="h-11 w-11 rounded-full bg-white text-background flex items-center justify-center shrink-0 shadow-card"
          >
            →
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
