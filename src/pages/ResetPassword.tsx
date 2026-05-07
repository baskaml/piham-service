import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Réinitialiser le mot de passe — PIHAM";
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("8 caractères minimum");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour");
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Nouveau mot de passe</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Lien invalide ou expiré. Demandez un nouvel email depuis la page de connexion.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pw">Nouveau mot de passe</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} />
            </div>
            <div>
              <Label htmlFor="cf">Confirmer</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required maxLength={72} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "..." : "Mettre à jour"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ResetPassword;