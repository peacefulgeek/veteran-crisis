// Public site env. Manus Forge / OAuth / OWNER fields removed.
// The site has no users, no OAuth, no Manus runtime — only DATABASE_URL,
// NODE_ENV, and JWT_SECRET (kept only for cookie signing in any leftover stub paths).
export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
