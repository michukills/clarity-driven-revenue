import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

function jsonError(message: string, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AdminAuthResult> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, response: jsonError("Authentication required", 401, corsHeaders) };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceRole) {
    return { ok: false, response: jsonError("Auth environment not configured", 503, corsHeaders) };
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return { ok: false, response: jsonError("Authentication required", 401, corsHeaders) };
  }

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data: isAdmin, error: adminError } = await admin.rpc("is_admin", {
    _user_id: user.id,
  });
  if (adminError || isAdmin !== true) {
    return { ok: false, response: jsonError("Admin access required", 403, corsHeaders) };
  }

  return { ok: true, userId: user.id };
}
