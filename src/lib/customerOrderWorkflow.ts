import type { OrderWorkflowStatus } from "./orders";

export const onlineOrderStatuses = (type?: string | null): OrderWorkflowStatus[] => [
  "Pending", "Accepted", "Preparing", "Ready",
  ...(type === "DELIVERY" ? ["Out for delivery" as const] : []),
  "Completed", "Cancelled",
];