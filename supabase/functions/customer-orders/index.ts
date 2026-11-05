import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const checkout = z.object({
  action: z.literal("checkout"),
  client_ref: z.string().min(20).max(80),
  tracking_token: z.string().regex(/^[a-f0-9]{64}$/),
  order_type: z.enum(["PICKUP", "DELIVERY", "DINE-IN"]),
  customer_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/),
  district: z.string().max(80).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  table_label: z.string().max(30).optional(),
  items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(99) })).min(1).max(100),
});
const schema = z.union([checkout, z.object({ action: z.literal("status"), tracking_token: z.string().regex(/^[a-f0-9]{64}$/) })]);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 24000) return respond({ error: "Request too large" }, 413);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return respond({ error: "Please check your order details." }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return respond({ error: "Ordering is temporarily unavailable." }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    // Guest access is restricted to a validated checkout or a private tracking
    // credential. No caller-provided restaurant, user, prices or SQL is trusted.
    const input = parsed.data;
    const result = input.action === "status"
      ? await admin.rpc("get_customer_order", { tracking_token: input.tracking_token })
      : await admin.rpc("submit_customer_order", { payload: input });
    if (result.error) return respond({ error: input.action === "status" ? "Order not found or tracking link expired." : "Could not place this order. Check availability and your details, then try again." }, 400);
    return respond(result.data);
  } catch { return respond({ error: "Could not process this request. Please try again." }, 400); }
});