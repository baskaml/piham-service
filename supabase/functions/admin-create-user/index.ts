import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function genPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?-_=+";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let pwd = "";
  // Guarantee diversity
  pwd += upper[bytes[0] % upper.length];
  pwd += lower[bytes[1] % lower.length];
  pwd += digits[bytes[2] % digits.length];
  pwd += symbols[bytes[3] % symbols.length];
  for (let i = 4; i < 20; i++) pwd += all[bytes[i] % all.length];
  // shuffle
  return pwd.split("").sort(() => crypto.getRandomValues(new Uint8Array(1))[0] - 128).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(url, service);
    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim().slice(0, 100);
    const phone = String(body.phone ?? "").trim().slice(0, 30);
    const role = body.role === "admin" ? "admin" : "user";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email invalide" }, 400);

    const password = typeof body.password === "string" && body.password.length >= 12
      ? body.password
      : genPassword();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (cErr) return json({ error: cErr.message }, 400);

    if (phone) {
      await admin.from("profiles").update({ phone }).eq("id", created.user.id);
    }
    if (role === "admin") {
      await admin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    await admin.from("admin_logs").insert({
      admin_id: user.id,
      action: "create_user",
      target_type: "user",
      target_id: created.user.id,
      details: { email, role },
    });

    return json({ user_id: created.user.id, email, password, role });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur" }, 500);
  }
});