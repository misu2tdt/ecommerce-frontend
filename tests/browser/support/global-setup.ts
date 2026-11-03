import { tidyTestData } from "./housekeeping";

export default async function globalSetup() {
  await tidyTestData();
}
