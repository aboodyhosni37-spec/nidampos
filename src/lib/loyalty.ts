import { supabase } from "@/integrations/supabase/client";

export type RewardStatus = "none" | "half_off" | "free_lunch";

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

// Compute reward status from total spent. Free lunch wins over half-off.
export const computeReward = (total: number): RewardStatus => {
  if (total >= REWARD_FREE_LUNCH_THRESHOLD) return "free_lunch";
  if (total >= REWARD_HALF_OFF_THRESHOLD) return "half_off";
  return "none";
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

// After an order is paid, add the paid amount to total_spent and unlock reward.
export const addCustomerSpend = async (
  customerId: string,
  paidAmount: number,
  order?: { invoice_id?: string | null; invoice_number?: number | null }
) => {
  if (!customerId || paidAmount <= 0) return;
  const { data, error } = await supabase
    .from("customers")
    .select("total_spent, reward_status, loyalty_points")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  const currentTotal = Number((data as any)?.total_spent || 0);
  const newTotal = currentTotal + Number(paidAmount || 0);
  const currentReward = ((data as any)?.reward_status as RewardStatus) || "none";

  // Only unlock; do not auto-downgrade. If already has free_lunch keep it.
  let newReward: RewardStatus = currentReward;
  const eligible = computeReward(newTotal);
  if (currentReward === "none" && eligible !== "none") newReward = eligible;
  if (currentReward === "half_off" && eligible === "free_lunch") newReward = "free_lunch";

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

  // Ledger entry: points earned from this order.
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
};

// Mark reward as redeemed (reset to 'none').
export const consumeReward = async (
  customerId: string,
  info?: {
    reward?: RewardStatus;
    invoice_id?: string | null;
    invoice_number?: number | null;
  }
) => {
  const { error } = await supabase
    .from("customers")
    .update({ reward_status: "none" })
    .eq("id", customerId);
  if (error) throw error;

  const reward = info?.reward ?? "none";
  const cost =
    reward === "free_lunch"
      ? REWARD_FREE_LUNCH_THRESHOLD
      : reward === "half_off"
      ? REWARD_HALF_OFF_THRESHOLD
      : 0;
  await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    invoice_id: info?.invoice_id ?? null,
    invoice_number: info?.invoice_number ?? null,
    type: "redeem",
    points: cost,
    reward,
    note: `${rewardLabel(reward)} redeemed`,
  });
};

