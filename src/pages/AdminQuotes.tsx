import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { extractPhone, buildWaUrl, trackWaClick } from "@/lib/whatsapp";

type QuoteStatus = "pending" | "in_progress" | "quoted" | "approved" | "rejected";

type Quote = {
  id: string;
  user_id: string;
  service: string;
  title: string;
  message: string;
  budget: string | null;
  status: QuoteStatus;
  admin_response: string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; phone: string | null };

// Variables disponibles dans les templates : {nom}, {titre_projet}, {service}, {budget}
const renderTemplate = (
  tpl: string,
  ctx: { nom: string; titre_projet: string; service?: string; budget?: string },
) =>
  tpl
    .replace(/\{nom\}/g, ctx.nom)
    .replace(/\{titre_projet\}/g, ctx.titre_projet)
    .replace(/\{service\}/g, ctx.service ?? "")
    .replace(/\{budget\}/g, ctx.budget ?? "");

const STATUS_META: Record<
  QuoteStatus,
  { label: string; cls: string; templates: { label: string; text: string }[] }
> = {
  pending: {
    label: "Reçu",
    cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    templates: [
      {
        label: "Accusé chaleureux",
        text: "Bonjour {nom} 👋, nous avons bien reçu votre demande « {titre_projet} ». Notre équipe l'étudie et revient vers vous sous 24 h ouvrées. — PIHAM Info Services",
      },
      {
        label: "Accusé court",
        text: "Bonjour {nom}, demande « {titre_projet} » bien reçue ✅. Nous revenons vers vous très vite. — PIHAM",
      },
    ],
  },
  in_progress: {
    label: "En cours",
    cls: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    templates: [
      {
        label: "En analyse",
        text: "Bonjour {nom}, votre projet « {titre_projet} » ({service}) est en cours d'analyse par nos experts. Proposition détaillée sous 48 à 72 h. — PIHAM",
      },
      {
        label: "Visite à planifier",
        text: "Bonjour {nom}, pour avancer sur « {titre_projet} », nous souhaitons planifier une visite/un échange technique. Quelles sont vos disponibilités ? — PIHAM",
      },
    ],
  },
  quoted: {
    label: "Devis envoyé",
    cls: "bg-violet-500/15 text-violet-600 border-violet-500/30",
    templates: [
      {
        label: "Devis envoyé",
        text: "Bonjour {nom}, votre devis pour « {titre_projet} » vient de vous être envoyé par email 📩. Restons disponibles ici pour toute question. — PIHAM",
      },
      {
        label: "Relance devis",
        text: "Bonjour {nom}, avez-vous pu consulter le devis envoyé pour « {titre_projet} » ? Je reste disponible pour en discuter. — PIHAM",
      },
    ],
  },
  approved: {
    label: "Accepté",
    cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    templates: [
      {
        label: "Confirmation",
        text: "Bonjour {nom}, merci pour la validation du projet « {titre_projet} » 🎉. Nous vous recontactons pour planifier le démarrage. — PIHAM",
      },
    ],
  },
  rejected: {
    label: "Refusé",
    cls: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    templates: [
      {
        label: "Refus courtois",
        text: "Bonjour {nom}, suite à l'étude de « {titre_projet} », nous ne pouvons malheureusement pas y donner suite. Nous restons disponibles pour de futurs échanges. — PIHAM",
      },
    ],
  },
};

const FILTERS: { value: "all" | QuoteStatus; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "Reçues" },
  { value: "in_progress", label: "En cours" },
  { value: "quoted", label: "Devis envoyé" },
  { value: "approved", label: "Acceptées" },
  { value: "rejected", label: "Refusées" },
];

const AdminQuotes = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | QuoteStatus>("all");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => { document.title = "Demandes — Admin PIHAM"; }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: q }, { data: p }] = await Promise.all([
      supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, phone"),
    ]);
    if (q) setQuotes(q as Quote[]);
    if (p) {
      const map: Record<string, Profile> = {};
      (p as Profile[]).forEach((x) => (map[x.id] = x));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const services = useMemo(() => {
    const s = new Set<string>();
    quotes.forEach((q) => q.service && s.add(q.service));
    return Array.from(s);
  }, [quotes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    quotes.forEach((q) => { c[q.status] = (c[q.status] ?? 0) + 1; });
    return c;
  }, [quotes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (filter !== "all" && q.status !== filter) return false;
      if (serviceFilter !== "all" && q.service !== serviceFilter) return false;
      if (!term) return true;
      const p = profiles[q.user_id];
      return (
        q.title.toLowerCase().includes(term) ||
        q.message.toLowerCase().includes(term) ||
        q.service.toLowerCase().includes(term) ||
        (p?.full_name ?? "").toLowerCase().includes(term) ||
        (p?.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [quotes, profiles, filter, serviceFilter, search]);

  const setStatus = async (id: string, status: QuoteStatus) => {
    const prev = quotes;
    setQuotes((qs) => qs.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
    if (error) {
      setQuotes(prev);
      toast.error("Mise à jour impossible", { description: error.message });
      return;
    }
    if (user) {
      await supabase.from("admin_logs").insert({
        admin_id: user.id, action: "update_quote_status", target_type: "quote", target_id: id, details: { status },
      });
    }
    toast.success(`Statut → ${STATUS_META[status].label}`);
  };

  const saveResponse = async (id: string) => {
    const text = (responses[id] ?? "").trim();
    if (!text) return;
    const { error } = await supabase.from("quote_requests").update({ admin_response: text }).eq("id", id);
    if (error) return toast.error(error.message);
    setQuotes((qs) => qs.map((x) => (x.id === id ? { ...x, admin_response: text } : x)));
    toast.success("Réponse enregistrée");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-display text-lg font-semibold">Demandes de devis</h1>
            <Badge variant="outline" className="text-[10px]">{quotes.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="container py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground/70 border-border hover:bg-muted"
              }`}
            >
              {f.label}
              <span className="ml-2 opacity-70">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, téléphone, projet…)"
              className="pl-9"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Aucune demande pour ce filtre.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => {
              const p = profiles[q.user_id];
              const open = openId === q.id;
              const meta = STATUS_META[q.status];
              return (
                <Card key={q.id} className="overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : q.id)}
                    className="w-full text-left p-5 flex flex-col md:flex-row md:items-center gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(q.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{q.service}</Badge>
                        {q.budget && <Badge variant="secondary" className="text-[10px]">{q.budget}</Badge>}
                      </div>
                      <div className="mt-1.5 font-semibold text-foreground truncate">{q.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p?.full_name ?? "—"} {p?.phone && `· ${p.phone}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{open ? "▲ Réduire" : "▼ Détails"}</div>
                  </button>

                  {open && (
                    <div className="border-t border-border p-5 space-y-4 bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</div>
                          <div className="font-medium">{p?.full_name ?? "Utilisateur"}</div>
                        </div>
                        {p?.phone && (
                          <a href={`tel:${p.phone}`} className="hover:underline">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Téléphone</div>
                            <div className="font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{p.phone}</div>
                          </a>
                        )}
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</div>
                          <div className="font-medium">{q.budget ?? "—"}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Message</div>
                        <p className="text-sm whitespace-pre-wrap text-foreground/90">{q.message}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(["pending", "in_progress", "quoted", "approved", "rejected"] as QuoteStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(q.id, s)}
                            disabled={q.status === s}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                              q.status === s
                                ? "bg-foreground text-background border-foreground cursor-default"
                                : "bg-card border-border hover:bg-muted"
                            }`}
                          >
                            {STATUS_META[s].label}
                          </button>
                        ))}
                      </div>

                      {/* Notification WhatsApp */}
                      {(() => {
                        const phone = p?.phone || extractPhone(q.message);
                        const name = p?.full_name || "client";
                        if (!phone) {
                          return (
                            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                              Aucun numéro de téléphone trouvé pour notifier ce client par WhatsApp.
                            </div>
                          );
                        }
                        return (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Notifier via WhatsApp
                              </span>
                              <span className="text-[11px] text-muted-foreground ml-auto">{phone}</span>
                            </div>
                            <div className="space-y-3">
                              {(["pending", "in_progress", "quoted", "approved", "rejected"] as QuoteStatus[]).map((s) => {
                                const meta = STATUS_META[s];
                                return (
                                  <div key={s} className="rounded-lg bg-card/60 border border-border/60 p-2.5">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                                        {meta.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {meta.templates.map((tpl, i) => {
                                        const text = renderTemplate(tpl.text, {
                                          nom: name,
                                          titre_projet: q.title,
                                          service: q.service,
                                          budget: q.budget ?? "",
                                        });
                                        return (
                                          <a
                                            key={i}
                                            href={buildWaUrl(phone, text) ?? "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => trackWaClick("admin_quick_reply")}
                                            title={text}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
                                          >
                                            <MessageCircle className="h-3 w-3" />
                                            {tpl.label}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Variables : <code>{`{nom}`}</code>, <code>{`{titre_projet}`}</code>, <code>{`{service}`}</code>, <code>{`{budget}`}</code>
                            </p>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Message personnalisé</div>
                              <Textarea
                                rows={3}
                                placeholder={`Bonjour ${name}, …`}
                                value={responses[`wa-${q.id}`] ?? ""}
                                onChange={(e) => setResponses((r) => ({ ...r, [`wa-${q.id}`]: e.target.value }))}
                              />
                              <div className="mt-2 flex justify-end">
                                <a
                                  href={buildWaUrl(phone, (responses[`wa-${q.id}`] ?? "").trim() || `Bonjour ${name},`) ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 transition-colors"
                                  onClick={() => {
                                    trackWaClick("admin_send_response");
                                    if (!(responses[`wa-${q.id}`] ?? "").trim()) {
                                      toast.message("Astuce : rédigez votre message avant d'envoyer.");
                                    }
                                  }}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Envoyer message personnalisé
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Réponse interne</div>
                        <Textarea
                          rows={3}
                          defaultValue={q.admin_response ?? ""}
                          onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                          placeholder="Note interne ou réponse au client…"
                        />
                        <div className="mt-2 flex justify-end">
                          <Button size="sm" onClick={() => saveResponse(q.id)}>Enregistrer</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminQuotes;
