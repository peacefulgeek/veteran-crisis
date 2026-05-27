// De-Manus stub. Original Manus OAuth SDK removed; site is fully public.
// Kept exports compatible with context.ts and trpc routers so the build keeps working,
// but every method either silently returns null/throws a clean "auth disabled" error.
// No outbound HTTP, no module-load console noise, no env crashes.

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "veteran-shift-no-auth-stub-secret";
  return new TextEncoder().encode(secret);
}

class SDKServer {
  // Manus OAuth is gone. These methods exist only to keep type imports happy.
  async exchangeCodeForToken(): Promise<never> {
    throw ForbiddenError("Auth disabled: Manus OAuth removed");
  }

  async getUserInfo(): Promise<never> {
    throw ForbiddenError("Auth disabled: Manus OAuth removed");
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { openId, appId: "veteran-shift", name: options.name || "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (typeof openId !== "string" || typeof appId !== "string" || typeof name !== "string") {
        return null;
      }
      return { openId, appId, name };
    } catch {
      return null;
    }
  }

  async getUserInfoWithJwt(): Promise<never> {
    throw ForbiddenError("Auth disabled: Manus OAuth removed");
  }

  async authenticateRequest(_req: Request): Promise<User> {
    // Public site: no users are authenticated. Throwing here lets any
    // protectedProcedure return UNAUTHORIZED cleanly (we expose none publicly).
    throw ForbiddenError("Auth disabled: no users");
  }
}

export const sdk = new SDKServer();

// Re-export COOKIE_NAME just in case other dead files referenced it indirectly.
export { COOKIE_NAME };
