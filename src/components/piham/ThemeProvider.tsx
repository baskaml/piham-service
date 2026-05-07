import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [profileThemeLoaded, setProfileThemeLoaded] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const loadTheme = async () => {
      setProfileThemeLoaded(false);
      if (!user) {
        setProfileThemeLoaded(true);
        return;
      }
      const { data } = await supabase.from("profiles").select("theme").eq("id", user.id).maybeSingle();
      if (!cancelled) {
        if (data?.theme === "dark" || data?.theme === "light") setThemeState(data.theme);
        setProfileThemeLoaded(true);
      }
    };
    loadTheme();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !profileThemeLoaded) return;
    supabase.from("profiles").update({ theme }).eq("id", user.id).then(() => undefined);
  }, [theme, user, profileThemeLoaded]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((p) => (p === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
