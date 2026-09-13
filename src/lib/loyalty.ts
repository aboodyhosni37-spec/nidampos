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

/**
 * Credit loyalty for ONE invoice, exactly once.
 *
 * Reads the final saved invoice/payment record, so an order edited before
 * payment still uses its final amount. Idempotent: the earn row is inserted
 * first and a unique index on loyalty_transactions(invoice_id) (earn rows
 * without a reward) rejects any second attempt, so refreshing, double-clicking
 * or re-paying can never duplicate points.
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

  const total = Number(inv.total || 0);
  const paid = Number(inv.paid_amount || 0);
  const due = Math.max(0, Number(inv.due_amount ?? total - paid));
  const fullyPaid = total > 0 && due <= 0.005 && paid >= total - 0.005;
  if (!fullyPaid) return { applied: false, reason: "not-fully-paid" };

  // Eligible spend = what was actually paid, never more than the order total.
  const eligible = +Math.min(paid, total).toFixed(2);
  if (eligible <= 0) return { applied: false, reason: "not-fully-paid" };

  const { data: cust, error: cErr } = await supabase
    .from("customers")
    .select("total_spent, reward_status, loyalty_points, rewards_claimed")
    .eq("id", customerId)
    .maybeSingle();
  if (cErr) throw cErr;

  const before = loyaltyProgress(cust ?? {}, settings);
  const newTotal = +(before.totalSpent + eligible).toFixed(2);
  const after = loyaltyProgress(
    { total_spent: newTotal, rewards_claimed: before.milestonesClaimed },
    settings
  );

  const points = Math.floor(newTotal); // 1 point per currency unit spent
  const previousPoints = Number((cust as any)?.loyalty_points || 0);
  const earned = Math.max(0, points - previousPoints);

  // Claim the invoice FIRST — the unique index makes this the atomic gate.
  const { error: claimErr } = await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    invoice_id: invoiceId,
    invoice_number: (inv.number as number) ?? null,
    type: "earn",
    points: earned,
    note: inv.number ? `Order #${inv.number}` : "Order payment",
  });
  if (claimErr) {
    if ((claimErr as any).code === "23505") return { applied: false, reason: "already-counted" };
    throw claimErr;
  }

  const newReward: RewardStatus =
    settings.loyalty_enabled && after.rewardsAvailable > 0 ? after.reward : "none";

  const { error: upErr } = await supabase
    .from("customers")
    .update({
      total_spent: newTotal,
      reward_status: newReward,
      loyalty_points: points,
    })
    .eq("id", customerId);
  if (upErr) throw upErr;

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
