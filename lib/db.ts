import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined;
}

function getDb(): ReturnType<typeof postgres> {
  if (!global._pgClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    global._pgClient = postgres(connectionString, {
      ssl: 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return global._pgClient;
}

// A tagged-template wrapper that lazily initialises the connection
const sql: ReturnType<typeof postgres> = new Proxy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function () {} as any,
  {
    // sql`…` → called as a tagged template
    apply(_t, _thisArg, args) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getDb() as any)(...args);
    },
    // sql.begin, sql.unsafe, etc.
    get(_t, prop) {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (db as any)[prop];
      return typeof val === 'function' ? val.bind(db) : val;
    },
  }
);

export default sql;
