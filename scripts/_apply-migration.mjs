import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: +url.port,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
  multipleStatements: false,
});

const stmts = [
  `CREATE TABLE IF NOT EXISTS articles (
    id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    slug varchar(200) NOT NULL UNIQUE,
    title varchar(300) NOT NULL,
    metaDescription varchar(320) NOT NULL DEFAULT '',
    body mediumtext NOT NULL,
    tldr text,
    category varchar(80) NOT NULL DEFAULT 'General',
    tags json NULL,
    author varchar(80) NOT NULL DEFAULT 'The Oracle Lover',
    heroUrl varchar(500),
    heroAlt varchar(320),
    wordCount int NOT NULL DEFAULT 0,
    readingTime int NOT NULL DEFAULT 8,
    asinsUsed json NULL,
    internalLinksUsed json NULL,
    status enum('queued','published') NOT NULL DEFAULT 'queued',
    queuedAt timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    publishedAt timestamp NULL,
    lastModifiedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    openerType enum('gut-punch','question','story','counterintuitive') NOT NULL DEFAULT 'gut-punch',
    conclusionType enum('cta','reflection','question','challenge','benediction') NOT NULL DEFAULT 'reflection'
  )`,
  `CREATE INDEX articles_status_published_at ON articles (status, publishedAt)`,
  `CREATE INDEX articles_status_queued_at ON articles (status, queuedAt)`,
  `CREATE TABLE IF NOT EXISTS asin_cache (
    asin varchar(16) NOT NULL PRIMARY KEY,
    title varchar(320) NOT NULL DEFAULT '',
    category varchar(80) NOT NULL DEFAULT '',
    tags json NULL,
    status enum('valid','invalid','unknown') NOT NULL DEFAULT 'unknown',
    lastChecked timestamp NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cron_runs (
    id bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
    job varchar(80) NOT NULL,
    startedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finishedAt timestamp NULL,
    status enum('ok','error','skipped') NOT NULL DEFAULT 'ok',
    detail text
  )`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    email varchar(320) NOT NULL UNIQUE,
    source varchar(80) NOT NULL DEFAULT 'homepage',
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

for (const s of stmts) {
  try {
    await conn.query(s);
    console.log('OK', s.split('\n')[0].slice(0, 80));
  } catch (e) {
    console.warn('SKIP', e.code, (e.sqlMessage || '').slice(0, 90));
  }
}
const [rows] = await conn.query('SHOW TABLES');
console.log('TABLES:', rows);
await conn.end();
process.exit(0);
