import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Schéma fixe attendu en sortie de l'IA — basé sur le prompt admin de l'utilisateur.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["update", "create", "delete", "reorder"] },
    target: { type: "string", enum: ["section", "page", "element"] },
    section: { type: "string" },
    summary: { type: "string", description: "Résumé court en français de la modification proposée" },
    changes: {
      type: "array",
      description: "Liste des paires clé/valeur à écrire dans site_content. La valeur peut être un texte simple, une URL d'image, ou un JSON.stringify pour les listes.",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "Clé site_content, ex: hero.title_line1" },
          value: { type: "string" },
          note: { type: "string", description: "Brève justification" },
        },
        required: ["key", "value"],
        additionalProperties: false,
      },
    },
    seo: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      additionalProperties: false,
    },
    images: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          alt: { type: "string" },
          name: { type: "string" },
        },
        required: ["field", "alt"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["action", "target", "section", "summary", "changes"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Tu es l'assistant éditorial du panneau admin de PIHAM Info Services, entreprise spécialisée en BTP, réseaux, vidéosurveillance (CCTV), sécurité incendie et fourniture d'équipements en Afrique de l'Ouest. Clients: banques, institutions, entreprises, ONG. Valeurs: qualité, fiabilité, respect des délais, expertise terrain.

TON RÔLE:
- Améliorer / structurer / créer du contenu pour le site
- Toujours répondre via l'outil "propose_content_change" — JAMAIS en texte libre
- Ton premium, professionnel, orienté entreprises et institutions
- Français impeccable, percutant, sans clichés marketing creux
- Ne JAMAIS inventer de chiffres, certifications, références clients ou faits non fournis
- Pour les listes (services, témoignages, stats), retourne la valeur sous forme de JSON.stringify d'un tableau

CLÉS site_content connues (exemples Hero):
- hero.eyebrow, hero.title_line1, hero.title_line2_prefix, hero.title_line2_accent, hero.title_line3
- hero.subtitle, hero.cta_primary, hero.cta_secondary
- hero.image_url, hero.image_alt
- hero.stats_json (JSON: [{value, label}])
- brand.name, brand.tagline, brand.logo_url

Si l'admin demande une suppression, mets action="delete" et liste les clés concernées avec value="" ; ajoute un warning explicite. Ne supprime jamais sans qu'on te l'ait demandé explicitement.

Si l'instruction est vague, propose la meilleure amélioration possible et explique-la dans "summary".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY manquant" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(url, service);
    const { data: isAdminRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!isAdminRow) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));
    const instruction = String(body.instruction ?? "").trim();
    const section = String(body.section ?? "hero").trim();
    const currentContent = body.currentContent ?? {};
    const model = String(body.model ?? "google/gemini-3-flash-preview");
    if (!instruction) return json({ error: "Instruction vide" }, 400);

    const userMessage = `SECTION CIBLE: ${section}

CONTENU ACTUEL (extrait JSON des clés liées à cette section):
${JSON.stringify(currentContent, null, 2)}

INSTRUCTION DE L'ADMIN:
${instruction}

Propose la modification via l'outil propose_content_change.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_content_change",
            description: "Propose une modification structurée du contenu du site PIHAM",
            parameters: RESPONSE_SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_content_change" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Limite de requêtes atteinte, réessayez dans un instant." }, 429);
      if (aiResp.status === 402) return json({ error: "Crédits Lovable AI épuisés. Ajoutez des crédits dans Settings > Workspace > Usage." }, 402);
      return json({ error: "Erreur passerelle IA" }, 500);
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "Aucune proposition générée" }, 500);

    let parsed: unknown;
    try { parsed = JSON.parse(call.function.arguments); }
    catch { return json({ error: "Réponse IA invalide (JSON)" }, 500); }

    return json({ proposal: parsed });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message ?? "Erreur" }, 500);
  }
});
