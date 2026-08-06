import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, COOKIE_NAME, SESSION_DURATION } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const validUser = process.env.AUTH_USERNAME;
  const validHash = process.env.AUTH_PASSWORD_HASH;

  if (!validUser || !validHash) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const usernameOk = username?.trim().toLowerCase() === validUser.toLowerCase();
  const passwordOk = usernameOk && bcrypt.compareSync(password ?? "", validHash);

  if (!usernameOk || !passwordOk) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = await signSession(username.trim().toLowerCase());

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  return res;
}
