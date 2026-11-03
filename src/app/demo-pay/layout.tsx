import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";

// Everything under this address belongs to one visitor (or to the staff) and
// stays out of search results.
export const metadata: Metadata = noIndex();

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
