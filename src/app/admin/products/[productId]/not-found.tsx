import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
export default function NotFound() { return <><FeedbackState title="Product not found" description="This Product does not exist or is no longer available." /><Link href="/admin/products" className="mt-5 inline-block font-semibold text-emerald-800 underline">Return to Products</Link></>; }
