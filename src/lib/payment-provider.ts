// What a payment provider is called on screen.
export function paymentProviderLabel(provider: string): string {
  const name = provider.trim().toLowerCase();
  if (name === "momo") return "MoMo";
  if (name === "demo") return "Demo payment";
  if (!name) return "Unknown";
  return name.charAt(0).toUpperCase() + name.slice(1);
}
