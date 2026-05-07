import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { services } from "@/data/services";
import { normalizePhoneForStorage } from "@/lib/whatsapp";

type Quote = {
  id: string;
  service: string;
  title: string;
  message: string;
  budget: string | null;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  created_at: string;
};

const quoteSchema = z.object({
  service: z.string().min(1),
  title: z.string().trim().min(3, "Titre trop court").max(120),
  message: z.string().trim().min(10, "Message trop court").max(2000),
  budget: z.string().trim().max(50).optional(),
});

const statusLabel: Record<Quote["status"], { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Validé", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
};

const Dashboard = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; phone: string }>({ full_name: "", phone: "" });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState({ service: services[0]?.slug ?? "", title: "", message: "", budget: "" });
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Mon espace — PIHAM"; }, []);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: q }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (p) setProfile({ full_name: p.full_name ?? "", phone: p.phone ?? "" });
    if (q) setQuotes(q as Quote[]);
  };

  useEffect(() => { load(); }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const normalizedPhone = normalizePhoneForStorage(profile.phone);
    if (profile.phone.trim() && !normalizedPhone) {
      return toast.error("Numéro WhatsApp invalide");
    }
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name.trim().slice(0, 100),
      phone: normalizedPhone.slice(0, 30),
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      setProfile((p) => ({ ...p, phone: normalizedPhone }));
      toast.success("Profil mis à jour");
    }
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = quoteSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!profile.phone || profile.phone.trim().length < 8) {
      return toast.error("Renseigne ton numéro WhatsApp dans l'onglet Profil pour recevoir les notifications.");
    }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("quote_requests")
        .insert({
          user_id: user.id,
          service: parsed.data.service,
          title: parsed.data.title,
          message: parsed.data.message,
          budget: parsed.data.budget || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (files && files.length > 0) {
        for (const file of Array.from(files).slice(0, 5)) {
          if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} > 10 MB`); continue; }
          const path = `${user.id}/${inserted.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from("quote-files").upload(path, file);
          if (upErr) { toast.error(upErr.message); continue; }
          await supabase.from("quote_files").insert({
            quote_id: inserted.id,
            user_id: user.id,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          });
        }
      }

      toast.success("Demande envoyée");
      setForm({ service: services[0]?.slug ?? "", title: "", message: "", budget: "" });
      setFiles(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-60" style={{ background: "var(--gradient-mesh)" }} />
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-10 rounded-3xl border border-border bg-card/70 backdrop-blur-xl p-6 shadow-card">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Accueil</Link>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mt-2">
              Mon <span className="text-gradient-accent">espace</span>
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && <Button asChild className="btn-primary"><Link to="/admin">Admin</Link></Button>}
            <Button variant="outline" onClick={signOut} className="rounded-full">Déconnexion</Button>
          </div>
        </div>

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quotes">Mes demandes</TabsTrigger>
            <TabsTrigger value="new">Nouvelle demande</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="space-y-4">
            {quotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune demande pour l'instant.</p>
            ) : quotes.map((q) => (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{q.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.service} · {new Date(q.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant={statusLabel[q.status].variant}>{statusLabel[q.status].label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{q.message}</p>
                  {q.admin_response && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Réponse PIHAM</div>
                      {q.admin_response}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="new">
            <Card>
              <CardHeader><CardTitle>Demande de devis</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submitQuote} className="space-y-4">
                  <div>
                    <Label htmlFor="service">Service</Label>
                    <select id="service" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                      {services.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="title">Titre du projet</Label>
                    <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget estimé (optionnel)</Label>
                    <Input id="budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} maxLength={50} />
                  </div>
                  <div>
                    <Label htmlFor="message">Description</Label>
                    <Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} required />
                  </div>
                  <div>
                    <Label htmlFor="files">Fichiers (max 5, 10 MB chacun)</Label>
                    <Input id="files" type="file" multiple onChange={(e) => setFiles(e.target.files)} />
                  </div>
                  <Button type="submit" disabled={submitting}>{submitting ? "Envoi..." : "Envoyer la demande"}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div>
                  <Label htmlFor="fn">Nom complet</Label>
                  <Input id="fn" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="ph">Numéro WhatsApp</Label>
                  <Input id="ph" type="tel" placeholder="+228 99 50 00 54" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={30} />
                  <p className="mt-1 text-[11px] text-muted-foreground">Utilisé pour recevoir les notifications de devis sur WhatsApp.</p>
                </div>
                <Button onClick={saveProfile}>Enregistrer</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Dashboard;