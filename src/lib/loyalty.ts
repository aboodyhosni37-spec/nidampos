import { supabase } from "@/integrations/supabase/client";
import { getCachedSettings, type SystemSettings } from "@/lib/systemSettings";

export type RewardStatus = "none" | "half_off" | "free_lunch";

// Legacy defaults (kept for compatibility); the real values come from Settings.
export const REWARD_HALF_OFF_THRESHOLD = 100;
export const REWARD_FREE_LUNCH_THRESHOLD = 200;

export const rewardLabel = (s: RewardStatus | string | null | undefined): string => {
  switch (s) {
    case "half_off":
      return "50% Discount";
    case "free_lunch":
      return "Free Lunch";
    default:
      return "No Reward";
  }
};

// Legacy helper (unused by the milestone engine, kept so old imports still work).
export const computeReward = (total: number): RewardStatus => {
  if (total >= REWARD_FREE_LUNCH_THRESHOLD) return "free_lunch";
  if (total >= REWARD_HALF_OFF_THRESHOLD) return "half_off";
  return "none";
};

// ---------- cumulative milestone engine ----------

export type LoyaltyProgress = {
  enabled: boolean;
  threshold: number;
  reward: RewardStatus;
  /** cumulative eligible spending across all paid orders */
  totalSpent: number;
  /** milestones the cumulative spending has reached in total */
  milestonesReached: number;
  /** milestones already used/redeemed */
  milestonesClaimed: number;
  /** unredeemed rewards waiting for the customer */
  rewardsAvailable: number;
  /** spending carried over toward the next milestone */
  progressAmount: number;
  /** amount still needed to reach the next milestone */
  remainingToNext: number;
  /** 0-100 progress toward the next milestone */
  percent: number;
};

export const loyaltyProgress = (
  customer: {
    total_spent?: number | null;
    rewards_claimed?: number | null;
  },
  s: SystemSettings = getCachedSettings()
): LoyaltyProgress => {
  const threshold = Math.max(1, Number(s.loyalty_threshold || 0) || 100);
  const reward = (s.loyalty_reward as RewardStatus) || "half_off";
  const totalSpent = Math.max(0, Number(customer?.total_spent || 0));
  const milestonesReached = Math.floor(totalSpent / threshold);
  const milestonesClaimed = Math.max(0, Number(customer?.rewards_claimed || 0));
  const rewardsAvailable = Math.max(0, milestonesReached - milestonesClaimed);
  const progressAmount = +(totalSpent - milestonesReached * threshold).toFixed(2);
  const remainingToNext = +Math.max(0, threshold - progressAmount).toFixed(2);
  return {
    enabled: !!s.loyalty_enabled,
    threshold,
    reward,
    totalSpent,
    milestonesReached,
    milestonesClaimed,
    rewardsAvailable,
    progressAmount,
    remainingToNext,
    percent: Math.min(100, Math.round((progressAmount / threshold) * 100)),
  };
};

export type LoyaltyTransaction = {
  id: string;
  customer_id: string;
  invoice_id: string | null;
  invoice_number: number | null;
  type: "earn" | "redeem" | string;
  points: number;
  reward: string | null;
  note: string | null;
  created_at: string;
};

// Full loyalty ledger for one customer (newest first).
export const listLoyaltyHistory = async (
  customerId: string
): Promise<LoyaltyTransaction[]> => {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoyaltyTransaction[];
};

export type LoyaltySummary = {
  balance: number;
  earned: number;
  redeemed: number;
};

export const summarizeLoyalty = (
  balance: number,
  history: LoyaltyTransaction[]
): LoyaltySummary => ({
  balance: Number(balance || 0),
  earned: history
    .filter((t) => t.type === "earn")
    .reduce((s, t) => s + Number(t.points || 0), 0),
  redeemed: history
    .filter((t) => t.type === "redeem")
    .reduce((s, t) => s + Number(t.points || 0), 0),
});

const VOID_STATUSES = ["cancelled", "canceled", "void", "voided", "refunded"];

export type LoyaltySettleResult = {
  applied: boolean;
  reason?:
    | "no-invoice"
    | "no-customer"
    | "voided"
    | "not-fully-paid"
    | "already-counted";
  amount?: number;
};

/** One consistent rule for "does this saved order count toward loyalty". */
const eligibleAmount = (inv: any): number => {
  const isVoid =
    VOID_STATUSES.includes(String(inv?.status ?? "").toLowerCase()) ||
    VOID_STATUSES.includes(String(inv?.order_status ?? "").toLowerCase());
  if (isVoid) return 0;
  const total = Number(inv?.total || 0);
  const paid = Number(inv?.paid_amount || 0);
  const due = Math.max(0, Number(inv?.due_amount ?? total - paid));
  const fullyPaid = total > 0 && due <= 0.005 && paid >= total - 0.005;
  if (!fullyPaid) return 0;
  // The final saved order total — no re-derived tax, discount or delivery math.
  return +Math.min(paid, total).toFixed(2);
};

/**
 * Recompute a customer's cumulative loyalty spending from the saved orders.
 *
 * Single source of truth: SUM(final total of every eligible fully-paid,
 * non-void order). Fully idempotent — running it again yields the same value,
 * so refreshing, printing, reopening or re-paying never inflates the total.
 * Also repairs the earn ledger: one earn row per eligible order, stale earn
 * rows for no-longer-eligible orders are removed.
 */
export const reconcileCustomerLoyalty = async (
  customerId: string,
  s: SystemSettings = getCachedSettings()
): Promise<LoyaltyProgress> => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, number, total, paid_amount, due_amount, status, order_status")
    .eq("customer_id", customerId)
    .limit(2000);
  if (error) throw error;

  const eligible = (invoices ?? [])
    .map((inv: any) => ({ inv, amount: eligibleAmount(inv) }))
    .filter((r) => r.amount > 0);

  const totalSpent = +eligible.reduce((sum, r) => sum + r.amount, 0).toFixed(2);

  const { data: cust } = await supabase
    .from("customers")
    .select("rewards_claimed")
    .eq("id", customerId)
    .maybeSingle();

  const claimed = Math.max(0, Number((cust as any)?.rewards_claimed || 0));
  const progress = loyaltyProgress({ total_spent: totalSpent, rewards_claimed: claimed }, s);

  const { error: upErr } = await supabase
    .from("customers")
    .update({
      total_spent: totalSpent,
      loyalty_points: Math.floor(totalSpent),
      reward_status: s.loyalty_enabled && progress.rewardsAvailable > 0 ? progress.reward : "none",
    })
    .eq("id", customerId);
  if (upErr) throw upErr;

  // Repair the earn ledger so history matches the eligible orders exactly.
  const { data: earnRows } = await supabase
    .from("loyalty_transactions")
    .select("id, invoice_id, points")
    .eq("customer_id", customerId)
    .eq("type", "earn")
    .is("reward", null);

  const eligibleIds = new Set(eligible.map((r) => r.inv.id as string));
  const seen = new Set<string>();
  const staleIds: string[] = [];
  for (const row of (earnRows ?? []) as any[]) {
    const invId = row.invoice_id as string | null;
    if (!invId || !eligibleIds.has(invId) || seen.has(invId)) {
      staleIds.push(row.id as string);
    } else {
      seen.add(invId);
    }
  }
  if (staleIds.length) {
    await supabase.from("loyalty_transactions").delete().in("id", staleIds);
  }

  const missing = eligible.filter((r) => !seen.has(r.inv.id as string));
  if (missing.length) {
    await supabase.from("loyalty_transactions").insert(
      missing.map((r) => ({
        customer_id: customerId,
        invoice_id: r.inv.id as string,
        invoice_number: (r.inv.number as number) ?? null,
        type: "earn",
        points: Math.floor(r.amount),
        note: r.inv.number ? `Order #${r.inv.number}` : "Order payment",
      }))
    );
  }

  return progress;
};

/**
 * Credit loyalty for ONE invoice, exactly once.
 *
 * Reads the final saved invoice/payment record, so an order edited before
 * payment still uses its final amount. Idempotent: the earn row is inserted
 * first and a unique index on loyalty_transactions(invoice_id) (earn rows
 * without a reward) rejects any second attempt, so refreshing, double-clicking
 * or re-paying can never duplicate points. The cumulative total is then always
 * recomputed from the saved orders, never added to a stale stored value.
 */
export const settleInvoiceLoyalty = async (
  invoiceId: string,
  opts?: { customerIdFallback?: string | null }
): Promise<LoyaltySettleResult> => {
  if (!invoiceId) return { applied: false, reason: "no-invoice" };
  const settings = getCachedSettings();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, number, customer_id, total, paid_amount, due_amount, status, order_status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!inv) return { applied: false, reason: "no-invoice" };

  const customerId = (inv.customer_id as string | null) ?? opts?.customerIdFallback ?? null;
  if (!customerId) return { applied: false, reason: "no-customer" };

  const isVoid =
    VOID_STATUSES.includes(String(inv.status ?? "").toLowerCase()) ||
    VOID_STATUSES.includes(String(inv.order_status ?? "").toLowerCase());
  if (isVoid) return { applied: false, reason: "voided" };

  const eligible = eligibleAmount(inv);
  if (eligible <= 0) return { applied: false, reason: "not-fully-paid" };

  const { data: cust, error: cErr } = await supabase
    .from("customers")
    .select("total_spent, rewards_claimed")
    .eq("id", customerId)
    .maybeSingle();
  if (cErr) throw cErr;
  const before = loyaltyProgress(cust ?? {}, settings);

  // Claim the invoice FIRST — the unique index makes this the atomic gate.
  const { error: claimErr } = await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    invoice_id: invoiceId,
    invoice_number: (inv.number as number) ?? null,
    type: "earn",
    points: Math.floor(eligible),
    note: inv.number ? `Order #${inv.number}` : "Order payment",
  });
  const alreadyCounted = !!claimErr && (claimErr as any).code === "23505";
  if (claimErr && !alreadyCounted) throw claimErr;

  // Recompute the cumulative total from the saved orders (idempotent).
  const after = await reconcileCustomerLoyalty(customerId, settings);

  if (alreadyCounted) return { applied: false, reason: "already-counted" };

  // Ledger note when one or more milestones were crossed by this order.
  const newMilestones = after.milestonesReached - before.milestonesReached;
  if (settings.loyalty_enabled && newMilestones > 0) {
    await supabase.from("loyalty_transactions").insert({
      customer_id: customerId,
      invoice_id: invoiceId,
      invoice_number: (inv.number as number) ?? null,
      type: "earn",
      points: 0,
      reward: after.reward,
      note: `Milestone reached: cumulative spend ${after.milestonesReached * after.threshold} · ${rewardLabel(
        after.reward
      )} unlocked`,
    });
  }

  return { applied: true, amount: eligible };
};


/** Back-compat wrapper: always routed through the idempotent invoice settler. */
export const addCustomerSpend = async (
  customerId: string,
  _paidAmount: number,
  order?: { invoice_id?: string | null; invoice_number?: number | null }
) => {
  if (!order?.invoice_id) return;
  await settleInvoiceLoyalty(order.invoice_id, { customerIdFallback: customerId });
};

// Mark one milestone reward as used. Cumulative spending is preserved, only the
// claimed-milestone counter moves, so leftover spend keeps counting.
export const consumeReward = async (
  customerId: string,
  info?: {
    reward?: RewardStatus;
    invoice_id?: string | null;
    invoice_number?: number | null;
  }
) => {
  const settings = getCachedSettings();
  const { data, error } = await supabase
    .from("customers")
    .select("total_spent, rewards_claimed")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;

  const before = loyaltyProgress(data ?? {}, settings);
  const claimed = before.milestonesClaimed + 1;
  const after = loyaltyProgress(
    { total_spent: before.totalSpent, rewards_claimed: claimed },
    settings
  );

  const { error: upErr } = await supabase
    .from("customers")
    .update({
      rewards_claimed: claimed,
      reward_status:
        settings.loyalty_enabled && after.rewardsAvailable > 0 ? after.reward : "none",
    })
    .eq("id", customerId);
  if (upErr) throw upErr;

  const reward = info?.reward ?? before.reward;
  await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    invoice_id: info?.invoice_id ?? null,
    invoice_number: info?.invoice_number ?? null,
    type: "redeem",
    points: Math.round(before.threshold),
    reward,
    note: `${rewardLabel(reward)} redeemed (milestone ${claimed})`,
  });
};
