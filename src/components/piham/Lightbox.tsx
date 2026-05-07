import { useEffect, useRef, useState } from "react";

export type MediaItem =
  | { type: "image"; src: string; title: string; tag: string }
  | { type: "video"; src: string; poster: string; title: string; tag: string };

type Props = {
  index: number;
  items: MediaItem[];
  onClose: () => void;
  onChange: (i: number) => void;
};

export const Lightbox = ({ index, items, onClose, onChange }: Props) => {
  const startX = useRef(0);
  const total = items.length;
  const [entered, setEntered] = useState(false);
  const current = items[index];

  const next = () => onChange((index + 1) % total);
  const prev = () => onChange((index - 1 + total) % total);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    const t = requestAnimationFrame(() => setEntered(true));
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      cancelAnimationFrame(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Précharger discrètement les médias adjacents (images uniquement)
  useEffect(() => {
    [items[(index + 1) % total], items[(index - 1 + total) % total]].forEach((it) => {
      if (it?.type === "image") {
        const img = new Image();
        img.src = it.src;
      } else if (it?.type === "video" && it.poster) {
        const img = new Image();
        img.src = it.poster;
      }
    });
  }, [index, items, total]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center transition-opacity duration-500 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const diff = startX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-6 right-6 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-2xl flex items-center justify-center transition-colors"
      >
        ×
      </button>

      <button
        onClick={prev}
        aria-label="Précédent"
        className="absolute left-4 md:left-8 h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-3xl flex items-center justify-center transition-colors"
      >
        ‹
      </button>

      <button
        onClick={next}
        aria-label="Suivant"
        className="absolute right-4 md:right-8 h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-3xl flex items-center justify-center transition-colors"
      >
        ›
      </button>

      <div
        key={index}
        className="text-center text-white max-w-[92vw] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-6 left-6 bg-white/10 backdrop-blur rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold">
          {current.tag}
        </div>

        {current.type === "image" ? (
          <img
            src={current.src}
            alt={current.title}
            decoding="async"
            fetchPriority="high"
            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl mx-auto"
          />
        ) : (
          <video
            key={current.src}
            src={current.src}
            poster={current.poster}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl mx-auto bg-black"
          />
        )}

        <p className="mt-4 text-sm opacity-80">
          {index + 1} / {total} — {current.title}
        </p>
      </div>
    </div>
  );
};
