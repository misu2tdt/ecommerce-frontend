import path from "node:path";

// Where the smoke tests find the backend, and the environment it runs with. One
// definition, used by the Playwright config and by the housekeeping around a run.

export const backendDirectory = path.resolve(
  process.cwd(),
  process.env.E2E_BACKEND_DIR ?? "../ecommerce-backend",
);

// The isolated test database. Port 5432 is where a developer's own PostgreSQL
// usually listens, so it is never the default: another port needs an explicit
// E2E_ALLOW_DB_PORT naming that same port.
const TEST_DATABASE_PORT = "5434";

function testDatabasePort(): string {
  const port = process.env.DB_PORT ?? TEST_DATABASE_PORT;
  if (port !== TEST_DATABASE_PORT && process.env.E2E_ALLOW_DB_PORT !== port) {
    throw new Error(
      `The smoke tests run against the isolated test database on port ${TEST_DATABASE_PORT}, but DB_PORT is ${port}. If that is really the isolated test database, set E2E_ALLOW_DB_PORT=${port} as well.`,
    );
  }
  return port;
}

export function backendEnvironment(): Record<string, string> {
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  return {
    ...inherited,
    NODE_ENV: "test",
    PORT: "3000",
    // The database stores times without a zone, in its own (UTC) clock, and the
    // API reads them in the Node process zone. Pinning both to UTC keeps every
    // timestamp the tests compare correct on any machine.
    TZ: "UTC",
    DB_HOST: process.env.DB_HOST ?? "localhost",
    DB_PORT: testDatabasePort(),
    DB_USERNAME: process.env.DB_USERNAME ?? "postgres",
    DB_PASSWORD:
      process.env.ECOMMERCE_TEST_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    DB_NAME: process.env.DB_NAME ?? "ecommerce_test",
    FRONTEND_ORIGIN: "http://localhost:3001",
    SWAGGER_ENABLED: "false",
    // The money-path tests finish orders on the demo payment page. This needs a
    // backend that has the demo payment provider (backend main).
    PAYMENT_PROVIDER: "demo",
  };
}
