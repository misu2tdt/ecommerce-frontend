import type { VndAmount } from "./catalog";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface Payment {
  id: number;
  provider: string;
  amount: VndAmount;
  currency: "VND";
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  succeededAt: string | null;
  checkoutUrl?: string;
  clientData?: Record<string, string>;
}

export interface PaymentReturnOrder {
  orderId: number;
}
