import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_DEFAULTS } from "@/data/contentDefaults";

type Content = Record<string, string>;
type Versions = Record<string, number>;
interface Ctx {
  content: Content;
  overrides: Content;
  refresh: () => Promise<void>;
  /** Returns the URL with a cache-busting query param tied to the content's last update. */
  getImage: (key: string) => string;
  /** Append a cache-busting param to an arbitrary URL using the global content version. */
  bust: (url: string) => string;
}

const SiteContentCtx = createContext<Ctx>({
  content: CONTENT_DEFAULTS,
  overrides: {},
  refresh: async () => {},
  getImage: (k) => CONTENT_DEFAULTS[k] ?? "",
  bust: (url) => url,
});

const appendVersion = (url: string, version: number | undefined) => {
  if (!url || !version) return url;
  // Skip data URIs
  if (url.startsWith("data:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${version}`;
};

export const SiteContentProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Content>({});
  const [versions, setVersions] = useState<Versions>({});
  const [globalVersion, setGlobalVersion] = useState<number>(() => Date.now());

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("site_content").select("key,value,updated_at");
    if (data) {
      const map: Content = {};
      const vmap: Versions = {};
      for (const r of data as Array<{ key: string; value: string | null; updated_at: string | null }>) {
        map[r.key] = r.value ?? "";
        vmap[r.key] = r.updated_at ? new Date(r.updated_at).getTime() : Date.now();
      }
      setOverrides(map);
      setVersions(vmap);
      setGlobalVersion(Date.now());
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("site_content_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (payload) => {
        const row = (payload.new ?? payload.old) as { key?: string; value?: string | null; updated_at?: string | null } | null;
        if (row?.key) {
          const ts = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
          if (payload.eventType === "DELETE") {
            setOverrides((prev) => {
              const { [row.key!]: _, ...rest } = prev;
              return rest;
            });
            setVersions((prev) => {
              const { [row.key!]: _, ...rest } = prev;
              return rest;
            });
          } else {
            setOverrides((prev) => ({ ...prev, [row.key!]: row.value ?? "" }));
            setVersions((prev) => ({ ...prev, [row.key!]: ts }));
          }
          setGlobalVersion(Date.now());
        } else {
          refresh();
        }
      })
      .subscribe();

    const onMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.type === "lovable-content-updated") {
        refresh();
      }
    };
    const onFocus = () => refresh();
    window.addEventListener("message", onMessage);
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const content = useMemo(() => ({ ...CONTENT_DEFAULTS, ...overrides }), [overrides]);

  const getImage = useCallback(
    (key: string) => appendVersion(content[key] ?? "", versions[key] ?? globalVersion),
    [content, versions, globalVersion]
  );

  const bust = useCallback((url: string) => appendVersion(url, globalVersion), [globalVersion]);

  return (
    <SiteContentCtx.Provider value={{ content, overrides, refresh, getImage, bust }}>
      {children}
    </SiteContentCtx.Provider>
  );
};

export const useSiteContent = () => useContext(SiteContentCtx);
