import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";

// Lesson 4: surface crashes loudly so Railway deploy logs show *something*
// instead of a silent exit. Must be registered before any async work begins.
process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err && (err.stack || err));
  // Give stdout a beat to flush before Railway kills the container.
  setTimeout(() => process.exit(1), 100);
});
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection:", reason);
  setTimeout(() => process.exit(1), 100);
});
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// Vendor OAuth and storage proxy were removed in Round 15: this app now runs
// purely on GitHub + Railway + Bunny CDN, with no third-party identity or
// storage shim layered between Express and the public routes.
// Auth (if needed in the future) will use a simple ADMIN_KEY env var; assets
// are served directly from Bunny CDN.
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
// @ts-ignore — sibling .mjs ESM module
import { wwwToApexRedirect, registerSiteRoutes, articleMetaInjector } from "../lib/site-routes.mjs";
// @ts-ignore — sibling .mjs ESM module
import { startCrons } from "../lib/cron-jobs.mjs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Master scope §2 + §6: WWW → apex 301 MUST be the very first middleware.
  app.use(wwwToApexRedirect());
  // Per-article SSR meta injector (crawlers only). Mounted immediately after
  // WWW redirect so it runs BEFORE Vite/static catch-all swallows /articles/*.
  app.use(articleMetaInjector());
  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Public site routes (health, sitemap, robots, llms, /api/articles, /api/cron-status)
  registerSiteRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Lesson 5: when $PORT is unset locally, default to 8080 (Railway-aligned)
  // rather than 3000. In dev (NODE_ENV !== production) the sandbox preview
  // still scans up if 3000-busy via findAvailablePort.
  const envPort = process.env.PORT ? parseInt(process.env.PORT) : null;
  const fallbackPort =
    process.env.NODE_ENV === "production" ? 8080 : 3000;
  const port =
    envPort !== null
      ? envPort
      : process.env.NODE_ENV === "production"
      ? fallbackPort
      : await findAvailablePort(fallbackPort);

  // Lesson 4: bind errors should be surfaced to Railway logs immediately
  // instead of a silent process death. Most common case: EADDRINUSE.
  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`[fatal] httpServer.error code=${err.code} port=${port}:`, err.message);
    setTimeout(() => process.exit(1), 100);
  });

  // Bind to 0.0.0.0 so Railway's ingress can reach the process.
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    // 6 crons (publish-one Mon-Fri 09:00 MT, quarterly-refresh, publish-to-bunny,
    // sitemap-ping, asin-health, health-beacon). No top-up / fallback generation.
    // Per user directive: env var defaults to enabled; only explicit "false" disables.
    try { startCrons({ enabled: process.env.AUTO_GEN_ENABLED !== "false" }); } catch (e) { console.error("[cron] start failed:", e); }
  });
}

startServer().catch((err) => {
  console.error("[fatal] startServer rejected:", err && (err.stack || err));
  setTimeout(() => process.exit(1), 100);
});
