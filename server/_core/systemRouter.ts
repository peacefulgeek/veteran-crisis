// De-Manus stub: original Manus systemRouter (health + notifyOwner) removed.
// /health is served by Express directly in server/_core/index.ts.
// Owner notifications are no longer routed through Manus.
import { publicProcedure, router } from "./trpc";

export const systemRouter = router({
  // Kept as a trivial query so the tRPC `system.*` namespace still type-checks
  // for any leftover client code without making any external calls.
  ok: publicProcedure.query(() => ({ ok: true } as const)),
});
