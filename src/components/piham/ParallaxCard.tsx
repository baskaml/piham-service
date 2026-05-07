import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

type Props = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

export const ParallaxCard = ({ children, className = "", intensity = 1 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rotateXRaw = useTransform(scrollYProgress, [0, 0.5, 1], [8 * intensity, 0, -6 * intensity]);
  const yRaw = useTransform(scrollYProgress, [0, 1], [50 * intensity, -50 * intensity]);

  const rotateX = useSpring(rotateXRaw, { stiffness: 80, damping: 22 });
  const y = useSpring(yRaw, { stiffness: 80, damping: 22 });

  return (
    <div ref={ref} style={{ perspective: 1400 }} className={className}>
      <motion.div
        style={{ rotateX, y, transformStyle: "preserve-3d" }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};
