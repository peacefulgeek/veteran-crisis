import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// Manus-specific OAuth + /manus-storage proxy removed: app now runs purely on GitHub + Railway + Bunny.
// Auth (if needed in the future) will use a simple ADMIN_KEY env var; assets are served direct from Bunny CDN.
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  // On hosted platforms ($PORT injected by Railway/Render/Heroku) we MUST bind exactly that
  // port. Only fall back to scanning when running locally without $PORT set.
  const port =
    process.env.PORT ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind to 0.0.0.0 so Railway's HTTP health probe and ingress can reach the process.
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    // 5 crons (top-up, publish, sitemap-ping, asin-health, health-beacon)
    // Per user directive: env var defaults to enabled; only explicit "false" disables.
    try { startCrons({ enabled: process.env.AUTO_GEN_ENABLED !== "false" }); } catch (e) { console.error("[cron] start failed:", e); }
  });
}

startServer().catch(console.error);
