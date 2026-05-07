import { useRef, ReactNode, MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
  strength?: number;
  target?: string;
  rel?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

export const MagneticButton = ({
  children,
  href,
  onClick,
  className = "",
  strength = 0.18,
  target,
  rel,
  type,
  disabled,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 22, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 150, damping: 22, mass: 0.5 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <motion.span
      style={{ x: sx, y: sy, transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      className="inline-flex items-center gap-2 will-change-transform"
    >
      {children}
    </motion.span>
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block"
    >
      {href ? (
        <a href={href} target={target} rel={rel} onClick={onClick} className={className}>
          {inner}
        </a>
      ) : (
        <button type={type} onClick={onClick} disabled={disabled} className={className}>
          {inner}
        </button>
      )}
    </motion.div>
  );
};
