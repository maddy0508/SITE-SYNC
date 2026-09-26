import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BOOTSTRAP_TOKEN = "M17-PHYSICAL-QA-ONLY-2026";
const QA_EMAIL_PATTERN = /^m17-qa-[a-z0-9]+@sitesync\.app$/;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  if (req.headers.get("x-m17-qa-bootstrap") !== BOOTSTRAP_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!QA_EMAIL_PATTERN.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_test_email" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (password.length < 12 || password.length > 72) {
      return new Response(JSON.stringify({ error: "invalid_test_password" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const secretKey = secretKeys.default;
    if (!secretKey) throw new Error("SUPABASE_SECRET_KEYS.default is not configured");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { m17_qa: true },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return the created user");

    return new Response(JSON.stringify({ ok: true, user_id: data.user.id, email: data.user.email }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
