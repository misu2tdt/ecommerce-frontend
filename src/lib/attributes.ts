export function formatAttributeLabel(key: string): string {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
