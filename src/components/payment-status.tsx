import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { PaymentStatus } from "@/types/payment";

const STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: "warning",
  processing: "neutral",
  succeeded: "success",
  failed: "error",
  cancelled: "neutral",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  );
}
