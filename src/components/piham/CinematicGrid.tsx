import { useRef, useState, useEffect, ReactNode, MouseEvent, createContext, useContext } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const SPRING = { stiffness: 180, damping: 22, mass: 0.6 };

type PointerCtx = {
  pointer: { x: number; y: number; active: boolean };
  hovered: number | null;
  setHovered: (i: number | null) => void;
};

const Ctx = createContext<PointerCtx | null>(null);

type GridProps = {
  children: ReactNode;
  className?: string;
  perspective?: number;
};

export const CinematicGrid = ({ children, className = "", perspective = 1600 }: GridProps) => {
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });
  const [hovered, setHovered] = useState<number | null>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    setPointer({ x: e.clientX, y: e.clientY, active: true });
  };
  const handleLeave = () => {
    setPointer((p) => ({ ...p, active: false }));
    setHovered(null);
  };

  return (
    <Ctx.Provider value={{ pointer, hovered, setHovered }}>
      <div
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={className}
        style={{ perspective, perspectiveOrigin: "50% 30%" }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
};

type CardProps = {
  index: number;
  children: ReactNode;
  className?: string;
  intensity?: number; // 1 = default, 0.6 = subtler (small cards)
  proximityRadius?: number;
  as?: "div" | "article" | "button";
  onClick?: () => void;
};

export const CinematicCard = ({
  index,
  children,
  className = "",
  intensity = 1,
  proximityRadius = 320,
  as = "div",
  onClick,
}: CardProps) => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CinematicCard must be used inside <CinematicGrid>");
  const { pointer, hovered, setHovered } = ctx;
  const ref = useRef<HTMLDivElement>(null);

  const localX = useMotionValue(0);
  const localY = useMotionValue(0);
  const proximity = useMotionValue(0);

  const sx = useSpring(localX, SPRING);
  const sy = useSpring(localY, SPRING);
  const sProx = useSpring(proximity, { stiffness: 120, damping: 20 });

  const isHovered = hovered === index;
  const isOther = hovered !== null && !isHovered;

  const rotateY = useTransform(sx, (v) => v * (isHovered ? 14 : 6) * intensity);
  const rotateX = useTransform(sy, (v) => -v * (isHovered ? 12 : 5) * intensity);
  const z = useTransform(sProx, (v) => (isHovered ? 80 : v * 30) * intensity);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pointer.active) {
      localX.set(0);
      localY.set(0);
      proximity.set(0);
      return;
    }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const dist = Math.hypot(dx, dy);
    localX.set(Math.max(-1.2, Math.min(1.2, dx / (r.width / 2))));
    localY.set(Math.max(-1.2, Math.min(1.2, dy / (r.height / 2))));
    proximity.set(Math.max(0, 1 - dist / proximityRadius));
  }, [pointer, localX, localY, proximity, proximityRadius]);

  const Comp: any =
    as === "button" ? motion.button : as === "article" ? motion.article : motion.div;

  return (
    <Comp
      ref={ref as any}
      onClick={onClick}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      style={{
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
        z,
        scale: isHovered ? 1 + 0.06 * intensity : isOther ? 1 - 0.03 * intensity : 1,
        filter: isOther ? `blur(${3 * intensity}px) brightness(0.72)` : "blur(0px) brightness(1)",
        opacity: isOther ? 0.7 : 1,
        zIndex: isHovered ? 50 : 1,
        willChange: "transform, filter",
        position: "relative",
      }}
      transition={{ type: "spring", ...SPRING }}
      className={className}
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, hsl(var(--accent) / 0.45), transparent 70%)",
          filter: "blur(28px)",
          zIndex: -1,
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
      {/* Cursor specular sheen */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          background: useTransform(
            [sx, sy] as any,
            ([x, y]: any) =>
              `radial-gradient(380px circle at ${50 + x * 30}% ${50 + y * 30}%, hsl(0 0% 100% / 0.14), transparent 60%)`
          ),
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.4s ease",
          mixBlendMode: "overlay",
        }}
      />
      {/* Animated border glow */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          boxShadow: isHovered
            ? "inset 0 0 0 1px hsl(var(--accent) / 0.6), 0 30px 80px -20px hsl(var(--accent) / 0.55)"
            : "inset 0 0 0 1px hsl(0 0% 100% / 0.04)",
          transition: "box-shadow 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </Comp>
  );
};
