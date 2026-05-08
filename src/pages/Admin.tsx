import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { HeroEditor } from "@/components/admin/HeroEditor";

type Quote = {
  id: string;
  user_id: string;
  service: string;
  title: string;
  message: string;
  budget: string | null;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  created_at: string;
};
type Profile = { id: string; full_name: string | null; phone: string | null; is_blocked: boolean; created_at: string };
type Content = { id: string; key: string; type: string; value: string; description: string | null };
type Page = { id: string; slug: string; title: string; content: string; image_url: string | null; published: boolean; updated_at: string };
type Review = {
  id: string;
  user_id: string;
  display_name: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const Admin = () => {
  const { user, signOut } = useAuth();
  const { content, refresh: refreshContent } = useSiteContent();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [contents, setContents] = useState<Content[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [newContent, setNewContent] = useState({ key: "", type: "text", value: "", description: "" });
  const [userSearch, setUserSearch] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [createForm, setCreateForm] = useState({ email: "", full_name: "", phone: "", role: "user" as "user" | "admin" });
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [newPage, setNewPage] = useState({ slug: "", title: "", content: "", image_url: "", published: true });
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => { document.title = "Admin — PIHAM"; }, []);

  const log = async (action: string, target_type?: string, target_id?: string, details?: any) => {
    if (!user) return;
    await supabase.from("admin_logs").insert({ admin_id: user.id, action, target_type, target_id, details });
  };

  const load = async () => {
    const [{ data: q }, { data: p }, { data: r }, { data: c }, { data: pg }, { data: rv }] = await Promise.all([
      supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      supabase.from("site_content").select("*").order("key"),
      supabase.from("pages").select("*").order("updated_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    if (q) setQuotes(q as Quote[]);
    if (p) setProfiles(p as Profile[]);
    if (r) setAdminIds(new Set(r.map((x) => x.user_id)));
    if (c) setContents(c as Content[]);
    if (pg) setPages(pg as Page[]);
    if (rv) setReviews(rv as Review[]);
  };

  useEffect(() => { load(); }, []);

  const updateContentByKey = async (key: string, value: string) => {
    const row = contents.find((c) => c.key === key);
    if (row) {
      await supabase.from("site_content").update({ value, updated_by: user?.id }).eq("id", row.id);
    } else {
      await supabase.from("site_content").insert({ key, type: "text", value, updated_by: user?.id });
    }
    await log("update_content", "content", key);
    await refreshContent();
    try {
      window.postMessage({ type: "lovable-content-updated", key }, "*");
    } catch { /* noop */ }
    toast.success("Mise à jour réussie", { description: key, duration: 1500 });
    load();
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setUploadingLogo(true);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Logo > 2 MB");
      const ext = file.name.split(".").pop() || "png";
      const path = `branding/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      await updateContentByKey("brand.logo_url", data.publicUrl);
      toast.success("Logo mis à jour");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingLogo(false); }
  };

  const uploadImageTo = async (file: File, folder: string): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) throw new Error("Image > 5 MB");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadForKey = async (key: string, file: File) => {
    setUploadingFor(key);
    try {
      const url = await uploadImageTo(file, "content");
      await updateContentByKey(key, url);
      toast.success("Image mise à jour");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingFor(null); }
  };

  const createPage = async () => {
    if (!newPage.slug.trim() || !newPage.title.trim()) return toast.error("Titre et URL requis");
    const slug = newPage.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { error } = await supabase.from("pages").insert({
      slug, title: newPage.title.trim(), content: newPage.content,
      image_url: newPage.image_url || null, published: newPage.published, updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await log("create_page", "page", slug);
    setNewPage({ slug: "", title: "", content: "", image_url: "", published: true });
    toast.success("Page créée");
    load();
  };

  const savePage = async (p: Page) => {
    const { error } = await supabase.from("pages").update({
      title: p.title, content: p.content, image_url: p.image_url, published: p.published, updated_by: user?.id,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await log("update_page", "page", p.id);
    toast.success("Page enregistrée");
    setEditingPage(null);
    load();
  };

  const deletePage = async (p: Page) => {
    if (!confirm(`Supprimer la page "${p.title}" ?`)) return;
    const { error } = await supabase.from("pages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await log("delete_page", "page", p.id);
    toast.success("Page supprimée");
    load();
  };

  const uploadPageImage = async (file: File, target: "new" | Page) => {
    try {
      const url = await uploadImageTo(file, "pages");
      if (target === "new") setNewPage({ ...newPage, image_url: url });
      else setEditingPage({ ...(target as Page), image_url: url });
      toast.success("Image téléversée");
    } catch (e: any) { toast.error(e.message); }
  };

  const createUser = async () => {
    if (!createForm.email) return toast.error("Email requis");
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: createForm });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCreatedInfo({ email: data.email, password: data.password });
      setCreateForm({ email: "", full_name: "", phone: "", role: "user" });
      toast.success("Compte créé");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  };

  const updateQuote = async (id: string, status: Quote["status"]) => {
    const admin_response = responses[id]?.trim() || null;
    const { error } = await supabase.from("quote_requests").update({ status, admin_response }).eq("id", id);
    if (error) return toast.error(error.message);
    await log("update_quote", "quote", id, { status });
    toast.success("Devis mis à jour");
    load();
  };

  const toggleBlock = async (p: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !p.is_blocked }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await log(p.is_blocked ? "unblock_user" : "block_user", "user", p.id);
    load();
  };

  const toggleAdmin = async (p: Profile) => {
    const isAdmin = adminIds.has(p.id);
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", p.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      await log("remove_admin", "user", p.id);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" });
      if (error) return toast.error(error.message);
      await log("grant_admin", "user", p.id);
    }
    load();
  };

  const saveContent = async (c: Content) => {
    const { error } = await supabase.from("site_content").update({ value: c.value, updated_by: user?.id }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await log("update_content", "content", c.id);
    toast.success("Contenu enregistré");
  };

  const addContent = async () => {
    if (!newContent.key || !newContent.value) return toast.error("Clé et valeur requises");
    const { error } = await supabase.from("site_content").insert({
      key: newContent.key.trim(),
      type: newContent.type,
      value: newContent.value,
      description: newContent.description || null,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await log("create_content", "content", newContent.key);
    setNewContent({ key: "", type: "text", value: "", description: "" });
    load();
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase.from("site_content").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await log("delete_content", "content", id);
    load();
  };

  const stats = {
    users: profiles.length,
    quotes: quotes.length,
    pending: quotes.filter((q) => q.status === "pending").length,
    approved: quotes.filter((q) => q.status === "approved").length,
  };

  const filteredQuotes = quoteFilter === "all" ? quotes : quotes.filter((q) => q.status === quoteFilter);
  const filteredProfiles = userSearch
    ? profiles.filter((p) =>
        (p.full_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
        (p.phone ?? "").toLowerCase().includes(userSearch.toLowerCase()))
    : profiles;

  return (
    <main className="min-h-screen bg-background px-4 py-16 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-50" style={{ background: "var(--gradient-mesh)" }} />
      <div className="container max-w-6xl">
        <div className="flex items-center justify-between mb-10 rounded-3xl border border-border bg-card/70 backdrop-blur-xl p-6 shadow-card">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Accueil</Link>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mt-2">
              Panneau <span className="text-gradient-accent">admin</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Button asChild className="rounded-full btn-primary"><Link to="/admin/editor">✦ Éditeur visuel</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/admin/quotes">📩 Demandes de devis</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/dashboard">Mon espace</Link></Button>
            <Button variant="outline" onClick={signOut} className="rounded-full">Déconnexion</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Utilisateurs", value: stats.users },
            { label: "Demandes", value: stats.quotes },
            { label: "En attente", value: stats.pending },
            { label: "Validées", value: stats.approved },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="font-display text-3xl mt-1">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="quotes">Devis</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="branding">Identité & Bannière</TabsTrigger>
            <TabsTrigger value="sections">Accueil & Sections</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="content">Contenus (CMS)</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all","pending","approved","rejected"] as const).map((s) => (
                <Button key={s} size="sm" variant={quoteFilter === s ? "default" : "outline"} className="rounded-full" onClick={() => setQuoteFilter(s)}>
                  {s === "all" ? "Tous" : s === "pending" ? "En attente" : s === "approved" ? "Validés" : "Refusés"}
                </Button>
              ))}
            </div>
            {filteredQuotes.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis.</p>}
            {filteredQuotes.map((q) => (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{q.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{q.service} · {new Date(q.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                  <Badge variant={q.status === "approved" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>
                    {q.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{q.message}</p>
                  {q.budget && <p className="text-xs text-muted-foreground">Budget: {q.budget}</p>}
                  <Textarea
                    placeholder="Réponse au client (optionnel)"
                    value={responses[q.id] ?? q.admin_response ?? ""}
                    onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                    rows={2}
                    maxLength={2000}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateQuote(q.id, "approved")}>Valider</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateQuote(q.id, "rejected")}>Refuser</Button>
                    <Button size="sm" variant="outline" onClick={() => updateQuote(q.id, "pending")}>Remettre en attente</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users">
            <Card className="mb-4">
              <CardHeader><CardTitle>Créer un compte client</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Input placeholder="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                <Input placeholder="Nom complet" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} />
                <Input placeholder="Téléphone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                  <Button onClick={createUser} disabled={creating} className="btn-primary">
                    {creating ? "Création..." : "Créer le compte"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Un mot de passe ultra-fort est généré automatiquement.</p>
                </div>
                {createdInfo && (
                  <div className="md:col-span-2 rounded-xl border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/5 p-4 text-sm space-y-2">
                    <div className="font-medium">Identifiants à transmettre au client :</div>
                    <div><span className="text-muted-foreground">Email :</span> <code className="font-mono">{createdInfo.email}</code></div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Mot de passe :</span>
                      <code className="font-mono break-all">{createdInfo.password}</code>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdInfo.password); toast.success("Copié"); }}>Copier</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ce mot de passe ne sera plus affiché après fermeture.</p>
                    <Button size="sm" variant="ghost" onClick={() => setCreatedInfo(null)}>Fermer</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Utilisateurs</CardTitle>
                <Input placeholder="Rechercher..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-xs" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Inscrit</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.full_name ?? "—"}</TableCell>
                        <TableCell>{p.phone ?? "—"}</TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>
                          {p.is_blocked
                            ? <Badge variant="destructive">Bloqué</Badge>
                            : <Badge variant="secondary">Actif</Badge>}
                        </TableCell>
                        <TableCell>{adminIds.has(p.id) ? <Badge>Admin</Badge> : "User"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => toggleBlock(p)}>
                            {p.is_blocked ? "Débloquer" : "Bloquer"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleAdmin(p)}>
                            {adminIds.has(p.id) ? "Retirer admin" : "Promouvoir admin"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Logo & identité</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {content["brand.logo_url"] ? (
                    <img src={content["brand.logo_url"]} alt="logo" className="h-20 w-20 rounded-2xl object-contain bg-white p-1 border border-border" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--gold))] flex items-center justify-center text-white font-display text-2xl">P</div>
                  )}
                  <div className="flex-1">
                    <Label htmlFor="logo">Téléverser un logo (PNG/JPG, max 2 MB)</Label>
                    <Input id="logo" type="file" accept="image/*" disabled={uploadingLogo}
                      onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  </div>
                  {content["brand.logo_url"] && (
                    <Button variant="outline" size="sm" onClick={() => updateContentByKey("brand.logo_url", "")}>Retirer</Button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nom de marque</Label>
                    <Input defaultValue={content["brand.name"] ?? ""} onBlur={(e) => updateContentByKey("brand.name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Sous-titre</Label>
                    <Input defaultValue={content["brand.tagline"] ?? ""} onBlur={(e) => updateContentByKey("brand.tagline", e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Les modifications sont enregistrées automatiquement à la perte du focus.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bannière défilante</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={(content["banner.enabled"] ?? "").toLowerCase() === "true"}
                    onCheckedChange={(v) => updateContentByKey("banner.enabled", v ? "true" : "false")}
                  />
                  <span className="text-sm">Activer la bannière</span>
                </div>
                <div>
                  <Label>Message</Label>
                  <Input defaultValue={content["banner.message"] ?? ""} maxLength={200}
                    onBlur={(e) => updateContentByKey("banner.message", e.target.value)}
                    placeholder="Promotion spéciale, nouveau service, etc." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mots défilants (Hero)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Les mots-clés défilants visibles sous le Hero. Laisser vide pour masquer un mot.
                </p>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
                  const key = `hero.marquee${n}`;
                  return (
                    <div key={key}>
                      <Label>Mot {n}</Label>
                      <Input
                        defaultValue={content[key] ?? ""}
                        maxLength={60}
                        onBlur={(e) => {
                          if ((content[key] ?? "") !== e.target.value) {
                            updateContentByKey(key, e.target.value);
                          }
                        }}
                        placeholder={`Ex: Fibre optique`}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <HeroEditor
              content={content}
              updateKey={updateContentByKey}
              uploadForKey={uploadForKey}
              uploadingFor={uploadingFor}
            />
          </TabsContent>

          <TabsContent value="pages" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Créer une page</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Input placeholder="URL (slug, ex: a-propos)" value={newPage.slug} onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })} />
                <Input placeholder="Titre" value={newPage.title} onChange={(e) => setNewPage({ ...newPage, title: e.target.value })} />
                <Textarea placeholder="Contenu (HTML ou texte)" rows={5} className="md:col-span-2" value={newPage.content} onChange={(e) => setNewPage({ ...newPage, content: e.target.value })} />
                <div className="md:col-span-2 space-y-2">
                  <Label>Image de couverture</Label>
                  {newPage.image_url && <img src={newPage.image_url} alt="preview" className="h-32 rounded-lg object-cover border border-border" />}
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPageImage(e.target.files[0], "new")} />
                    {newPage.image_url && <Button variant="outline" size="sm" onClick={() => setNewPage({ ...newPage, image_url: "" })}>Retirer</Button>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newPage.published} onCheckedChange={(v) => setNewPage({ ...newPage, published: v })} />
                  <span className="text-sm">Publier</span>
                </div>
                <div className="md:col-span-2"><Button onClick={createPage}>Créer la page</Button></div>
              </CardContent>
            </Card>

            {pages.map((p) => {
              const isEditing = editingPage?.id === p.id;
              const cur = isEditing ? editingPage! : p;
              return (
                <Card key={p.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{cur.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">/p/{cur.slug} · {p.published ? "publiée" : "brouillon"}</p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing && <Button size="sm" variant="outline" onClick={() => setEditingPage(p)}>Modifier</Button>}
                      {isEditing && <Button size="sm" onClick={() => savePage(cur)}>Enregistrer</Button>}
                      {isEditing && <Button size="sm" variant="ghost" onClick={() => setEditingPage(null)}>Annuler</Button>}
                      <Button size="sm" variant="destructive" onClick={() => deletePage(p)}>Supprimer</Button>
                    </div>
                  </CardHeader>
                  {isEditing && (
                    <CardContent className="space-y-3">
                      <div><Label>Titre</Label><Input value={cur.title} onChange={(e) => setEditingPage({ ...cur, title: e.target.value })} /></div>
                      <div><Label>Contenu</Label><Textarea rows={6} value={cur.content} onChange={(e) => setEditingPage({ ...cur, content: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Image</Label>
                        {cur.image_url && <img src={cur.image_url} alt="preview" className="h-32 rounded-lg object-cover border border-border" />}
                        <div className="flex gap-2 items-center">
                          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPageImage(e.target.files[0], cur)} />
                          {cur.image_url && <Button variant="outline" size="sm" onClick={() => setEditingPage({ ...cur, image_url: null })}>Retirer</Button>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={cur.published} onCheckedChange={(v) => setEditingPage({ ...cur, published: v })} />
                        <span className="text-sm">Publiée</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Ajouter un contenu</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Input placeholder="clé (ex: hero.title)" value={newContent.key} onChange={(e) => setNewContent({ ...newContent, key: e.target.value })} />
                <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newContent.type} onChange={(e) => setNewContent({ ...newContent, type: e.target.value })}>
                  <option value="text">text</option>
                  <option value="html">html</option>
                  <option value="image">image (URL)</option>
                  <option value="video">video (URL)</option>
                </select>
                <Input placeholder="description" value={newContent.description} onChange={(e) => setNewContent({ ...newContent, description: e.target.value })} className="md:col-span-2" />
                <Textarea placeholder="valeur" value={newContent.value} onChange={(e) => setNewContent({ ...newContent, value: e.target.value })} className="md:col-span-2" />
                <Button onClick={addContent}>Ajouter</Button>
              </CardContent>
            </Card>

            {contents.map((c, i) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{c.key} <Badge variant="outline" className="ml-2">{c.type}</Badge></CardTitle>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteContent(c.id)}>Supprimer</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={c.value}
                    onChange={(e) => setContents(contents.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    rows={3}
                  />
                  <Button size="sm" onClick={() => saveContent(c)}>Enregistrer</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["pending","approved","rejected","all"] as const).map((s) => (
                <Button key={s} size="sm" variant={reviewFilter === s ? "default" : "outline"} className="rounded-full" onClick={() => setReviewFilter(s)}>
                  {s === "all" ? "Tous" : s === "pending" ? "En attente" : s === "approved" ? "Approuvés" : "Rejetés"}
                  <span className="ml-2 text-xs opacity-70">
                    {s === "all" ? reviews.length : reviews.filter((r) => r.status === s).length}
                  </span>
                </Button>
              ))}
            </div>
            {reviews
              .filter((r) => reviewFilter === "all" || r.status === reviewFilter)
              .map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="font-display font-semibold">{r.display_name}</div>
                        <div className="text-[hsl(var(--gold))] text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                          {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</div>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{r.comment}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant={r.status === "approved" ? "outline" : "default"}
                        onClick={async () => {
                          await supabase.from("reviews").update({ status: "approved" }).eq("id", r.id);
                          await log("approve_review", "review", r.id);
                          toast.success("Avis approuvé");
                          load();
                        }}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await supabase.from("reviews").update({ status: "rejected" }).eq("id", r.id);
                          await log("reject_review", "review", r.id);
                          toast.success("Avis rejeté");
                          load();
                        }}
                      >
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Supprimer cet avis ?")) return;
                          await supabase.from("reviews").delete().eq("id", r.id);
                          await log("delete_review", "review", r.id);
                          toast.success("Avis supprimé");
                          load();
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {reviews.filter((r) => reviewFilter === "all" || r.status === reviewFilter).length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">Aucun avis dans cette catégorie.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Admin;