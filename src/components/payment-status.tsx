import {
  Badge,
  type BadgeSize,
  type BadgeVariant,
} from "@/components/ui/badge";
import type { PaymentStatus } from "@/types/payment";

const STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: "warning",
  processing: "neutral",
  succeeded: "success",
  failed: "error",
  cancelled: "neutral",
};

export function PaymentStatusBadge({
  status,
  size,
}: {
  status: PaymentStatus;
  size?: BadgeSize;
}) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} size={size} className="capitalize">
      {status}
    </Badge>
  );
}
