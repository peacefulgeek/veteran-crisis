import {
  bigint,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/* ─────────── Auth (kept from template) ─────────── */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ─────────── Articles (queue + published) ─────────── */
export const articles = mysqlTable(
  "articles",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    metaDescription: varchar("metaDescription", { length: 320 }).notNull().default(""),
    body: text("body").notNull(),
    tldr: text("tldr"),
    category: varchar("category", { length: 80 }).notNull().default("General"),
    tags: json("tags").$type<string[]>().notNull().default([]),
    author: varchar("author", { length: 80 }).notNull().default("The Oracle Lover"),
    heroUrl: varchar("heroUrl", { length: 500 }),
    heroAlt: varchar("heroAlt", { length: 320 }),
    wordCount: int("wordCount").notNull().default(0),
    readingTime: int("readingTime").notNull().default(8),
    asinsUsed: json("asinsUsed").$type<string[]>().notNull().default([]),
    internalLinksUsed: json("internalLinksUsed").$type<string[]>().notNull().default([]),
    status: mysqlEnum("status", ["queued", "published"]).notNull().default("queued"),
    queuedAt: timestamp("queuedAt").defaultNow(),
    publishedAt: timestamp("publishedAt"),
    lastModifiedAt: timestamp("lastModifiedAt").defaultNow().onUpdateNow().notNull(),
    openerType: mysqlEnum("openerType", [
      "gut-punch",
      "question",
      "story",
      "counterintuitive",
    ]).notNull().default("gut-punch"),
    conclusionType: mysqlEnum("conclusionType", [
      "cta",
      "reflection",
      "question",
      "challenge",
      "benediction",
    ]).notNull().default("reflection"),
  },
  t => ({
    slugIdx: uniqueIndex("articles_slug_idx").on(t.slug),
    statusPubIdx: index("articles_status_published_at").on(t.status, t.publishedAt),
    statusQueueIdx: index("articles_status_queued_at").on(t.status, t.queuedAt),
  }),
);
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/* ─────────── Cron run log ─────────── */
export const cronRuns = mysqlTable("cron_runs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  job: varchar("job", { length: 80 }).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
  status: mysqlEnum("status", ["ok", "error", "skipped"]).notNull().default("ok"),
  detail: text("detail"),
});
export type CronRun = typeof cronRuns.$inferSelect;

/* ─────────── ASIN cache ─────────── */
export const asinCache = mysqlTable("asin_cache", {
  asin: varchar("asin", { length: 16 }).primaryKey(),
  title: varchar("title", { length: 320 }).notNull().default(""),
  category: varchar("category", { length: 80 }).notNull().default(""),
  tags: json("tags").$type<string[]>().notNull().default([]),
  status: mysqlEnum("status", ["valid", "invalid", "unknown"]).notNull().default("unknown"),
  lastChecked: timestamp("lastChecked"),
});
export type AsinCacheRow = typeof asinCache.$inferSelect;

/* ─────────── Mailing list (real Nodemailer-only contact capture) ─────────── */
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 80 }).notNull().default("homepage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Subscriber = typeof subscribers.$inferSelect;
