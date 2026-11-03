import { tidyTestData } from "./housekeeping";

export default async function globalTeardown() {
  await tidyTestData();
}
