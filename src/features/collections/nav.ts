import { getNavCollections } from "./api";

// Whether the menus should offer "Collections": only when at least one active
// collection exists. A failed lookup (the backend is down, or an older backend
// has no /collections yet) means "no": the menus simply leave the entry out and
// the page around them keeps working. The default loader keeps its answer for a
// few minutes (see getNavCollections).
export async function hasActiveCollections(
  load: () => Promise<readonly unknown[]> = getNavCollections,
): Promise<boolean> {
  try {
    return (await load()).length > 0;
  } catch {
    return false;
  }
}
