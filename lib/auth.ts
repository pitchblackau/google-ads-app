import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ads_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecret() {
  const s = process.env.APP_JWT_SECRET;
  if (!s) throw new Error("APP_JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function signSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_DURATION };
