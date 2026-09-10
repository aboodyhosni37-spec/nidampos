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

// After an order is paid, add the paid amount to cumulative spending and unlock
// any milestone rewards the customer has newly reached. Spending never resets;
// the remainder past a milestone carries over toward the next one.
export const addCustomerSpend = async (
  customerId: string,
  paidAmount: number,
  order?: { invoice_id?: string | null; invoice_number?: number | null }
) => {
  if (!customerId || paidAmount <= 0) return;
  const settings = getCachedSettings();

  const { data, error } = await supabase
    .from("customers")
    .select("total_spent, reward_status, loyalty_points, rewards_claimed")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;

  const before = loyaltyProgress(data ?? {}, settings);
  const newTotal = +(before.totalSpent + Number(paidAmount || 0)).toFixed(2);
  const after = loyaltyProgress(
    { total_spent: newTotal, rewards_claimed: before.milestonesClaimed },
    settings
  );

  // Reward is available whenever an unredeemed milestone exists.
  const newReward: RewardStatus =
    settings.loyalty_enabled && after.rewardsAvailable > 0 ? after.reward : "none";

  const points = Math.floor(newTotal); // 1 point per currency unit spent
  const previousPoints = Number((data as any)?.loyalty_points || 0);

  const { error: upErr } = await supabase
    .from("customers")
    .update({
      total_spent: newTotal,
      reward_status: newReward,
      loyalty_points: points,
    })
    .eq("id", customerId);
  if (upErr) throw upErr;

  const earned = Math.max(0, points - previousPoints);
  if (earned > 0) {
    await supabase.from("loyalty_transactions").insert({
      customer_id: customerId,
      invoice_id: order?.invoice_id ?? null,
      invoice_number: order?.invoice_number ?? null,
      type: "earn",
      points: earned,
      note: order?.invoice_number ? `Order #${order.invoice_number}` : "Order payment",
    });
  }

  // Ledger note when one or more milestones were crossed by this order.
  const newMilestones = after.milestonesReached - before.milestonesReached;
  if (settings.loyalty_enabled && newMilestones > 0) {
    await supabase.from("loyalty_transactions").insert({
      customer_id: customerId,
      invoice_id: order?.invoice_id ?? null,
      invoice_number: order?.invoice_number ?? null,
      type: "earn",
      points: 0,
      reward: after.reward,
      note: `Milestone reached: cumulative spend ${after.milestonesReached * after.threshold} · ${rewardLabel(
        after.reward
      )} unlocked`,
    });
  }
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
