import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_RESTAURANT = "lamahamar-cafe";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const pin = String(body?.pin ?? "").trim();
  const username = body?.username ? String(body.username).trim().slice(0, 100) : null;
  const restaurantCode = String(body?.restaurant || DEFAULT_RESTAURANT).trim().toLowerCase().slice(0, 80);
  if (!/^\d{4,6}$/.test(pin)) return json({ error: "Invalid PIN" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, restaurant_code, status, subscription_status, subscription_ends_at")
    .eq("restaurant_code", restaurantCode)
    .maybeSingle();
  if (!restaurant) return json({ error: "Restaurant not found" }, 404);

  let q = admin.from("app_users").select("id, name, username, role, is_active").eq("pin", pin).eq("is_active", true);
  if (username) q = q.ilike("username", username);
  const { data: candidates } = await q;
  if (!candidates?.length) return json({ error: "Invalid PIN" }, 401);

  const { data: members } = await admin
    .from("restaurant_members")
    .select("app_user_id")
    .eq("restaurant_id", restaurant.id)
    .in("app_user_id", candidates.map((c) => c.id));
  const allowed = candidates.filter((c) => members?.some((m) => m.app_user_id === c.id));
  if (allowed.length === 0) return json({ error: "You are not assigned to this restaurant" }, 403);
  if (allowed.length > 1) return json({ error: "PIN is not unique for this restaurant. Ask an admin to change it." }, 409);
  const user = allowed[0];

  if (restaurant.status !== "active") {
    return json({ error: `This restaurant is ${restaurant.status}. Access is blocked.` }, 403);
  }
  const expired =
    restaurant.subscription_status === "cancelled" ||
    (restaurant.subscription_ends_at && new Date(restaurant.subscription_ends_at + "T23:59:59Z") < new Date());
  if (expired) return json({ error: "This restaurant's subscription has expired. Access is blocked." }, 403);

  // Hidden auth account per staff member + restaurant.
  const email = `pos-${user.id}-${restaurant.id.slice(0, 8)}@pos.nidam.invalid`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const app_metadata = {
    pos: true,
    app_user_id: user.id,
    restaurant_id: restaurant.id,
    pos_role: user.role,
  };

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password, app_metadata });
    if (error) return json({ error: "Sign-in failed" }, 500);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata,
    });
    if (error) return json({ error: "Sign-in failed" }, 500);
  }

  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data: signed, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr || !signed.session) return json({ error: "Sign-in failed" }, 500);

  return json({
    session: {
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    },
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
    restaurant: { id: restaurant.id, name: restaurant.name, code: restaurant.restaurant_code },
  });
});
