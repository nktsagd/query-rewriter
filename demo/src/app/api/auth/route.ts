const COOKIE_MAX_AGE = 86_400;

async function sign(stamp: string, password: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(stamp)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const expected = process.env.DEMO_PASSWORD?.trim();
  if (!expected) return Response.json({ error: "Password auth is not configured" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const password = body && typeof body === "object" && "password" in body ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== "string" || password !== expected) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const stamp = String(Date.now());
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json({ ok: true }, {
    headers: { "set-cookie": `demo_auth=${stamp}.${await sign(stamp, expected)}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}` },
  });
}

export function DELETE() {
  return Response.json({ ok: true }, { headers: { "set-cookie": "demo_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } });
}

