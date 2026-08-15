import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "barber_admin";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function validToken() {
  return createHmac(
    "sha256",
    requiredEnv("ADMIN_SESSION_SECRET"),
  )
    .update("barber-admin-session-v1")
    .digest("hex");
}

export function adminPasswordMatches(candidate: string) {
  return safeEqual(candidate, requiredEnv("ADMIN_PASSWORD"));
}

export async function createAdminSession() {
  const store = await cookies();

  store.set(COOKIE_NAME, validToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  return token ? safeEqual(token, validToken()) : false;
}
