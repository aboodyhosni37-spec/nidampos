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

// After an order is paid, add the paid amount to total_spent and unlock reward.
export const addCustomerSpend = async (customerId: string, paidAmount: number) => {
  if (!customerId || paidAmount <= 0) return;
  const { data, error } = await supabase
    .from("customers")
    .select("total_spent, reward_status")
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
  const { error: upErr } = await supabase
    .from("customers")
    .update({
      total_spent: newTotal,
      reward_status: newReward,
      loyalty_points: points,
    })
    .eq("id", customerId);
  if (upErr) throw upErr;
};

// Mark reward as redeemed (reset to 'none').
export const consumeReward = async (customerId: string) => {
  const { error } = await supabase
    .from("customers")
    .update({ reward_status: "none" })
    .eq("id", customerId);
  if (error) throw error;
};
