import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
export default function NotFound() { return <><FeedbackState title="Order not found" description="This Order does not exist." /><Link href="/admin/orders" className="mt-5 inline-block font-semibold text-brand underline">Return to Orders</Link></>; }
