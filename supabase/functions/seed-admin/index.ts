// Idempotent super-admin seed. Safe to call repeatedly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "zx.piham_47@gmail.com";
const ADMIN_PASSWORD = "T9$k!vQ2@Lx#7mPz_4R!aW8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let userId: string | null = null;
    let page = 1;
    while (page < 50) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data.users.find((u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (found) { userId = found.id; break; }
      if (data.users.length < 200) break;
      page++;
    }

    let created = false;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Super Admin" },
      });
      if (error) throw error;
      userId = data.user!.id;
      created = true;
    } else {
      await admin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD, email_confirm: true });
    }

    for (const role of ["super_admin", "admin"] as const) {
      await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    }
    await admin.from("profiles").upsert({ id: userId, full_name: "Super Admin" }, { onConflict: "id" });

    return new Response(JSON.stringify({ ok: true, created, user_id: userId, email: ADMIN_EMAIL }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
