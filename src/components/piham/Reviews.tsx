import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SectionHeading } from "./SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Review = {
  id: string;
  display_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  user_id: string;
};

const Star = ({ filled, onClick, size = 16 }: { filled?: boolean; onClick?: () => void; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
    onClick={onClick}
    style={{ width: size, height: size }}
    className={`text-[hsl(var(--gold))] ${onClick ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const Reviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myPending, setMyPending] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,display_name,rating,comment,created_at,status,user_id")
      .order("created_at", { ascending: false })
      .limit(60);
    const list = (data as Review[]) ?? [];
    setReviews(list.filter((r) => r.status === "approved"));
    if (user) {
      const mine = list.find((r) => r.user_id === user.id && r.status !== "approved");
      setMyPending(mine ?? null);
    } else {
      setMyPending(null);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("reviews_public")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) return toast.error("Nom trop court");
    if (comment.trim().length < 5) return toast.error("Commentaire trop court (min. 5 caractères)");
    if (comment.trim().length > 1000) return toast.error("Commentaire trop long (max. 1000)");
    if (rating < 1 || rating > 5) return toast.error("Note invalide");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      display_name: name.trim().slice(0, 80),
      rating,
      comment: comment.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Merci ! Ton avis sera publié après validation.");
    setComment("");
    setRating(5);
    load();
  };

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <section id="reviews" className="relative py-24 md:py-32 bg-background overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-1/4 -right-24 h-[300px] w-[300px] rounded-full bg-[hsl(var(--accent))]/10 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-[300px] w-[300px] rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />
      </div>

      <div className="container relative">
        <SectionHeading
          align="center"
          eyebrow="Avis vérifiés"
          title={<>Ce que disent <span className="text-gradient-accent">nos clients</span></>}
          description="Partagez votre expérience avec PIHAM Info Services. Tous les avis sont publiés après modération."
        />

        {avg && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} filled={i <= Math.round(Number(avg))} size={20} />
              ))}
            </div>
            <span className="font-display text-lg font-semibold text-primary">{avg}/5</span>
            <span className="text-sm text-muted-foreground">· {reviews.length} avis</span>
          </div>
        )}

        {/* Form */}
        <div className="mt-12 max-w-2xl mx-auto rounded-2xl bg-card border border-border p-7 md:p-8 shadow-soft">
          <h3 className="font-display text-xl font-semibold text-foreground">Laisser un avis</h3>
          {!user ? (
            <div className="mt-4 text-sm text-muted-foreground">
              <Link to="/auth" className="text-[hsl(var(--accent))] underline underline-offset-4 hover:opacity-80">
                Connecte-toi
              </Link>{" "}
              pour publier ton avis.
            </div>
          ) : myPending ? (
            <div className="mt-4 text-sm text-muted-foreground">
              Ton avis ({myPending.rating}★) est <span className="text-foreground font-medium">en attente de modération</span>. Merci !
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="rev-name">Nom affiché</Label>
                <Input
                  id="rev-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="ex: Jean K."
                />
              </div>
              <div>
                <Label>Note</Label>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(i)}
                      aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
                    >
                      <Star filled={i <= (hover || rating)} size={28} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
                </div>
              </div>
              <div>
                <Label htmlFor="rev-comment">Commentaire</Label>
                <Textarea
                  id="rev-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  minLength={5}
                  rows={4}
                  required
                  placeholder="Décrivez votre expérience…"
                />
                <div className="text-[11px] text-muted-foreground text-right mt-1">{comment.length}/1000</div>
              </div>
              <Button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Envoi…" : "Publier mon avis"}
              </Button>
            </form>
          )}
        </div>

        {/* Public list */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground text-sm">
              Aucun avis publié pour le moment. Soyez le premier !
            </div>
          ) : (
            reviews.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl bg-card border border-border p-6 shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} filled={i <= r.rating} />
                  ))}
                </div>
                <p className="mt-4 text-sm text-foreground leading-relaxed flex-1">"{r.comment}"</p>
                <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-white font-display font-semibold shrink-0">
                    {r.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary truncate">{r.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};