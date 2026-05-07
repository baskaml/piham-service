import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhoneForStorage } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const USERNAME_DOMAIN = "piham.local";
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const usernameRe = /^[a-zA-Z0-9._-]{3,40}$/;

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Nom requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z
    .string()
    .trim()
    .min(8, "Numéro WhatsApp requis")
    .max(30, "Numéro trop long")
    .regex(/^[+\d][\d\s().-]{6,}$/, "Format invalide (ex: +228 99 50 00 54)"),
  password: z
    .string()
    .min(12, "Min. 12 caractères")
    .max(72)
    .regex(/[A-Z]/, "Ajoute une majuscule")
    .regex(/[a-z]/, "Ajoute une minuscule")
    .regex(/\d/, "Ajoute un chiffre")
    .regex(/[^A-Za-z0-9]/, "Ajoute un symbole"),
});

const Auth = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [suFullName, setSuFullName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suLoading, setSuLoading] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = "Connexion — PIHAM"; }, []);
  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ identifier, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const id = identifier.trim();
    let email = id;
    if (!isEmail(id)) {
      if (!usernameRe.test(id)) return toast.error("Nom d'utilisateur invalide");
      email = `${id.toLowerCase()}@${USERNAME_DOMAIN}`;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Connecté");
    } catch (err: any) {
      toast.error(err.message ?? "Identifiants invalides");
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    const id = identifier.trim();
    if (!id || !isEmail(id)) return toast.error("Saisis ton email d'abord");
    const email = id;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ fullName: suFullName, email: suEmail, phone: suPhone, password: suPassword });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const normalizedPhone = normalizePhoneForStorage(parsed.data.phone);
    if (!normalizedPhone) return toast.error("Numéro WhatsApp invalide");
    setSuLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: suEmail.trim().toLowerCase(),
        password: suPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: suFullName.trim(), phone: normalizedPhone },
        },
      });
      if (error) throw error;
      toast.success("Compte créé — connexion en cours…");
      // Auto sign-in (auto_confirm is enabled)
      await supabase.auth.signInWithPassword({
        email: suEmail.trim().toLowerCase(),
        password: suPassword,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'inscription");
    } finally { setSuLoading(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{ background: "var(--gradient-mesh)" }}
      />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-elevated">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Retour</Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] via-[hsl(330_90%_55%)] to-[hsl(var(--gold))] flex items-center justify-center shadow-[0_0_24px_hsl(var(--accent)/0.4)]">
            <span className="text-white font-display font-bold text-lg">P</span>
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground leading-tight">Espace client</h1>
            <p className="text-xs text-muted-foreground">Authentification sécurisée PIHAM</p>
          </div>
        </div>

        <Tabs defaultValue="signin" className="mt-7">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email ou nom d'utilisateur</Label>
                <Input id="identifier" type="text" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={255} required />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full btn-primary">
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                Mot de passe oublié ?
              </button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-5">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="su-name">Nom complet</Label>
                <Input id="su-name" type="text" autoComplete="name" value={suFullName} onChange={(e) => setSuFullName(e.target.value)} maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" autoComplete="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} maxLength={255} required />
              </div>
              <div>
                <Label htmlFor="su-phone">Numéro WhatsApp</Label>
                <Input id="su-phone" type="tel" autoComplete="tel" placeholder="+228 99 50 00 54" value={suPhone} onChange={(e) => setSuPhone(e.target.value)} maxLength={30} required />
                <p className="mt-1 text-[11px] text-muted-foreground">Pour recevoir les notifications de votre devis sur WhatsApp.</p>
              </div>
              <div>
                <Label htmlFor="su-pass">Mot de passe</Label>
                <Input id="su-pass" type="password" autoComplete="new-password" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} maxLength={72} required />
                <p className="mt-1 text-[11px] text-muted-foreground">Min. 12 caractères, avec majuscule, minuscule, chiffre et symbole.</p>
              </div>
              <Button type="submit" disabled={suLoading} className="w-full btn-primary">
                {suLoading ? "Création..." : "Créer mon compte"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Auth;