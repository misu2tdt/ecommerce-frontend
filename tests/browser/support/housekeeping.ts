import { execSync } from "node:child_process";
import { backendDirectory, backendEnvironment } from "./backend-env";

// Housekeeping for a LOCAL run. The test database lives on after a run, and the
// backend only expires unpaid orders outside the test environment, so every run
// would leave pending orders holding stock until the popular sizes sell out and
// the next run cannot add anything to the cart. Before and after a run the demo
// customer's unpaid orders are cancelled (which returns their stock) and the
// seeded variants are refilled. CI starts from a fresh database and skips this.

const API = "http://localhost:3000";
const CUSTOMER = "demo.customer@example.com";
const PASSWORD = "DemoOnly!2026";

async function cancelPendingOrders(): Promise<number> {
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: CUSTOMER, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`login ${login.status}`);
  const { access_token: token } = (await login.json()) as {
    access_token: string;
  };
  const headers = { Authorization: `Bearer ${token}` };

  const orders = (await (await fetch(`${API}/orders`, { headers })).json()) as Array<{
    id: number;
    status: string;
  }>;
  let cancelled = 0;
  for (const order of orders.filter((entry) => entry.status === "pending")) {
    const response = await fetch(`${API}/orders/${order.id}/cancel`, {
      method: "POST",
      headers,
    });
    if (response.ok) cancelled += 1;
  }
  return cancelled;
}

function restockSeededVariants() {
  try {
    execSync("npm run demo:restock", {
      cwd: backendDirectory,
      env: backendEnvironment() as NodeJS.ProcessEnv,
      stdio: "ignore",
      timeout: 120_000,
    });
  } catch {
    console.warn(
      "Test housekeeping: `npm run demo:restock` did not run (an older backend?). " +
        "If tests cannot add to the cart, run `npm run seed:demo:test` in the backend.",
    );
  }
}

export async function tidyTestData() {
  if (process.env.CI) return;
  try {
    const cancelled = await cancelPendingOrders();
    if (cancelled > 0) console.log(`Test housekeeping: cancelled ${cancelled} unpaid orders.`);
  } catch (error) {
    console.warn(`Test housekeeping: could not cancel unpaid orders (${String(error)}).`);
  }
  restockSeededVariants();
}
