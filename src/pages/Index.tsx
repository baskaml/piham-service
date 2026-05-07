import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";
import { GlassNav } from "@/components/piham/GlassNav";
import { BannerTicker } from "@/components/piham/BannerTicker";
import { Hero } from "@/components/piham/Hero";
import { TrustBand } from "@/components/piham/TrustBand";
import { Services } from "@/components/piham/Services";
import { Process } from "@/components/piham/Process";
import { Showcase } from "@/components/piham/Showcase";
import { Sectors } from "@/components/piham/Sectors";
import { About } from "@/components/piham/About";
import { Testimonials } from "@/components/piham/Testimonials";
import { Reviews } from "@/components/piham/Reviews";
import { CTA } from "@/components/piham/CTA";
import { Contact } from "@/components/piham/Contact";
import { Footer } from "@/components/piham/Footer";
import { WhatsAppFab } from "@/components/piham/WhatsAppFab";
import { Loader } from "@/components/piham/Loader";

import { ParallaxCard } from "@/components/piham/ParallaxCard";

const Index = () => {
  const location = useLocation();
  const { content } = useSiteContent();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash]);

  // Admin preview: when loaded inside the visual editor iframe,
  // intercept clicks and notify the parent which section was clicked.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("admin-preview") !== "1") return;
    if (window.parent === window) return;

    const SECTION_IDS = [
      "banner", "hero", "trust", "about", "services", "showcase",
      "process", "sectors", "testimonials", "cta", "contact", "footer",
    ];

    const findSection = (el: HTMLElement | null): string | null => {
      let cur: HTMLElement | null = el;
      while (cur && cur !== document.body) {
        if (cur.id && SECTION_IDS.includes(cur.id)) return cur.id;
        cur = cur.parentElement;
      }
      return null;
    };

    // ---- Build lookup indexes from site_content ----
    const norm = (s: string) =>
      s.replace(/\s+/g, " ").trim().toLowerCase();
    const stripExt = (s: string) => s.replace(/\.[a-z0-9]+$/i, "");
    const fileTokens = (url: string): string[] => {
      try {
        const u = url.split("?")[0].split("#")[0];
        const last = u.split("/").pop() ?? u;
        const stem = stripExt(last);
        const tokens = [u, last, stem];
        // strip hash suffixes like "name-Bx12Ab.jpg" or "name.abc123.jpg"
        const noHash = stem.replace(/[-.][A-Za-z0-9_]{6,}$/g, "");
        if (noHash && noHash !== stem) tokens.push(noHash);
        return tokens.filter(Boolean);
      } catch { return [url]; }
    };

    const isImageKey = (k: string) =>
      /image|logo|photo|cover|background|bg_url|_url$/i.test(k) && !k.endsWith("_alt");

    // text value -> array of keys (to disambiguate)
    const textIndex = new Map<string, string[]>();
    // image token -> array of keys
    const imageIndex = new Map<string, string[]>();
    // alt-text -> sibling image key (same section + same prefix)
    const altToImageKey = new Map<string, string>();

    for (const [k, v] of Object.entries(content)) {
      if (!v) continue;
      if (k.endsWith("_json")) continue;
      if (isImageKey(k)) {
        for (const tok of fileTokens(v)) {
          const arr = imageIndex.get(tok) ?? [];
          arr.push(k);
          imageIndex.set(tok, arr);
        }
      } else if (k.endsWith("_alt")) {
        const base = k.slice(0, -4); // hero.image_alt -> hero.image
        // find any image key sharing the same prefix
        const candidate = Object.keys(content).find(
          (kk) => isImageKey(kk) && (kk === base || kk === base + "_url" || kk.startsWith(base)),
        );
        if (candidate) altToImageKey.set(norm(v), candidate);
      } else {
        const n = norm(v);
        if (n.length >= 2 && n.length <= 300) {
          const arr = textIndex.get(n) ?? [];
          arr.push(k);
          textIndex.set(n, arr);
        }
      }
    }

    const pickKey = (keys: string[], section: string | null): string => {
      if (keys.length === 1 || !section) return keys[0];
      const inSection = keys.find((k) => k.startsWith(section + "."));
      return inSection ?? keys[0];
    };

    const findImageKey = (el: HTMLElement, section: string | null): string | null => {
      if (el.tagName === "IMG") {
        const img = el as HTMLImageElement;
        // 1) src tokens
        for (const tok of fileTokens(img.src)) {
          if (imageIndex.has(tok)) return pickKey(imageIndex.get(tok)!, section);
        }
        // 2) alt → matching image key
        const alt = norm(img.alt ?? "");
        if (alt && altToImageKey.has(alt)) return altToImageKey.get(alt)!;
        return null;
      }
      // background-image inline / computed
      const bg = (el.style.backgroundImage || getComputedStyle(el).backgroundImage || "");
      const match = bg.match(/url\(["']?(.+?)["']?\)/);
      if (match) {
        for (const tok of fileTokens(match[1])) {
          if (imageIndex.has(tok)) return pickKey(imageIndex.get(tok)!, section);
        }
      }
      return null;
    };

    // Find the deepest text-bearing leaf whose own text equals a known value,
    // walking up the tree only as fallback.
    const findTextKey = (el: HTMLElement, section: string | null): string | null => {
      // Prefer the smallest element whose direct text content matches.
      let cur: HTMLElement | null = el;
      const visited: HTMLElement[] = [];
      while (cur && cur !== document.body && visited.length < 6) {
        visited.push(cur);
        const t = norm(cur.textContent ?? "");
        if (t && textIndex.has(t)) {
          return pickKey(textIndex.get(t)!, section);
        }
        cur = cur.parentElement;
      }
      // Substring match as last resort, prefer keys in current section
      if (section) {
        for (const node of visited) {
          const t = norm(node.textContent ?? "");
          if (!t) continue;
          for (const [val, keys] of textIndex) {
            if (val.length < 4) continue;
            if (t.includes(val)) {
              const k = pickKey(keys, section);
              if (k.startsWith(section + ".")) return k;
            }
          }
        }
      }
      return null;
    };

    const findKeyForElement = (el: HTMLElement | null): { key: string; node: HTMLElement } | null => {
      if (!el) return null;
      const section = findSection(el);
      // 1) explicit attribute (highest priority)
      const tagged = el.closest<HTMLElement>("[data-editable-key]");
      if (tagged) return { key: tagged.getAttribute("data-editable-key")!, node: tagged };
      // 2) image (the element itself, not its parent)
      const imgEl = el.tagName === "IMG"
        ? el
        : el.querySelector?.("img") as HTMLElement | null;
      if (imgEl) {
        const k = findImageKey(imgEl, section);
        if (k) return { key: k, node: imgEl };
      }
      // background image on the element itself
      const bgKey = findImageKey(el, section);
      if (bgKey) return { key: bgKey, node: el };
      // 3) text on the smallest matching node
      const tk = findTextKey(el, section);
      if (tk) {
        // pick deepest node whose own text matches
        let cur: HTMLElement | null = el;
        let best: HTMLElement = el;
        while (cur && cur !== document.body) {
          const t = norm(cur.textContent ?? "");
          const keys = textIndex.get(t);
          if (keys && keys.includes(tk)) best = cur;
          cur = cur.parentElement;
        }
        return { key: tk, node: best };
      }
      return null;
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      e.preventDefault();
      e.stopPropagation();
      const hit = findKeyForElement(target);
      const section = findSection(target);
      if (hit) {
        let imageUrl: string | undefined;
        let imageAlt: string | undefined;
        const imgNode =
          hit.node.tagName === "IMG"
            ? (hit.node as HTMLImageElement)
            : (hit.node.querySelector?.("img") as HTMLImageElement | null);
        if (imgNode) {
          imageUrl = imgNode.currentSrc || imgNode.src;
          imageAlt = imgNode.alt;
        }
        window.parent.postMessage(
          {
            type: "lovable-element-click",
            key: hit.key,
            section: section ?? hit.key.split(".")[0],
            imageUrl,
            imageAlt,
          },
          "*",
        );
        return;
      }
      if (section) {
        window.parent.postMessage({ type: "lovable-section-click", section }, "*");
      }
    };

    const onScroll = () => { /* noop */ };

    document.addEventListener("click", onClick, true);

    const clearHover = () => {
      document.querySelectorAll<HTMLElement>("[data-admin-hover]").forEach((el) => {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.cursor = "";
        el.removeAttribute("data-admin-hover");
      });
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      clearHover();
      const hit = findKeyForElement(target);
      let el: HTMLElement | null = null;
      if (hit) {
        el = hit.node;
      } else {
        const sec = findSection(target);
        if (sec) el = document.getElementById(sec);
      }
      if (el) {
        el.style.outline = hit ? "2px solid hsl(var(--accent))" : "2px dashed hsl(var(--accent))";
        el.style.outlineOffset = hit ? "2px" : "-4px";
        el.style.cursor = "pointer";
        el.setAttribute("data-admin-hover", "1");
      }
    };
    document.addEventListener("mouseover", onOver);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "lovable-scroll" && typeof e.data.id === "string") {
        const el = document.getElementById(e.data.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.search, content]);

  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Loader />
      <BannerTicker />
      <GlassNav />
      <Hero />
      <TrustBand />
      <Services />
      <ParallaxCard intensity={0.6}>
        <Showcase />
      </ParallaxCard>
      <Process />
      <Sectors />
      <ParallaxCard intensity={0.5}>
        <About />
      </ParallaxCard>
      <Testimonials />
      <Reviews />
      <CTA />
      <Contact />
      <Footer />
      <WhatsAppFab />
    </main>
  );
};

export default Index;
