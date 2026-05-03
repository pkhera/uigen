// @vitest-environment node
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { SignJWT } from "jose";
import { createSession, getSession } from "../auth";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function signToken(payload: object, expirationTime = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  const mockSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as any).mockResolvedValue({ set: mockSet });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("sets a cookie named auth-token", async () => {
    await createSession("user-123", "test@example.com");
    expect(mockSet).toHaveBeenCalledWith(
      "auth-token",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" })
    );
  });

  test("cookie value is a JWT (three dot-separated segments)", async () => {
    await createSession("user-123", "test@example.com");
    const [, token] = mockSet.mock.calls[0];
    expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("secure flag is false outside production", async () => {
    await createSession("user-123", "test@example.com");
    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("secure flag is true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await createSession("user-123", "test@example.com");
    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(true);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no auth-token cookie is present", async () => {
    (cookies as any).mockResolvedValue({ get: () => undefined });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const payload = { userId: "user-123", email: "test@example.com", expiresAt: new Date() };
    const token = await signToken(payload);
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const session = await getSession();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for an expired token", async () => {
    const payload = { userId: "user-123", email: "test@example.com", expiresAt: new Date() };
    // Set expiration to 1 second in the past
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(JWT_SECRET);
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a malformed token", async () => {
    (cookies as any).mockResolvedValue({ get: () => ({ value: "not.a.jwt" }) });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a token signed with a different secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-123", email: "x@y.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const session = await getSession();
    expect(session).toBeNull();
  });
});
