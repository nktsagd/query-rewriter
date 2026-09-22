import { z } from "zod";
import { REWRITE_PROMPT_VERSION, REWRITE_SYSTEM_PROMPT } from "@/lib/rewrite/prompt";

const ENDPOINT = "https://ollama.com/api/chat";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_HISTORY_TURNS = 50;
const MAX_HISTORY_ITEM = 4_000;
const MAX_CURRENT_QUERY = 8_000;
const MAX_TOTAL_INPUT = 40_000;
const MAX_OUTPUT = 2_000;
const MAX_BODY_BYTES = 256 * 1024;
const NUM_PREDICT = 128;
export const maxDuration = 60;

const requestSchema = z.object({
  history: z.array(z.string().trim().min(1).max(MAX_HISTORY_ITEM)).max(MAX_HISTORY_TURNS),
  currentQuery: z.string().trim().min(1).max(MAX_CURRENT_QUERY),
}).strict().superRefine((value, ctx) => {
  const total = value.currentQuery.length + value.history.reduce((n, item) => n + item.length, 0);
  if (total > MAX_TOTAL_INPUT) ctx.addIssue({ code: "custom", message: "history and currentQuery are too long" });
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new Error("body-too-large");
  if (!request.body) throw new Error("invalid-json");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_BODY_BYTES) throw new Error("body-too-large");
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("invalid-json"); }
}

function configuredPassword() {
  return process.env.DEMO_PASSWORD?.trim() || "";
}

async function validPasswordCookie(request: Request, password: string) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)demo_auth=([^;]+)/)?.[1];
  if (!token) return false;
  const [stamp, signature] = token.split(".");
  if (!stamp || !signature || Date.now() - Number(stamp) > 86_400_000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(signature.match(/.{1,2}/g) || [], (pair) => Number.parseInt(pair, 16));
  return Number.isFinite(Number(stamp)) && await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(stamp));
}

async function authError(request: Request) {
  const password = configuredPassword();
  if (process.env.NODE_ENV === "production" && !password && process.env.DEPLOYMENT_PROTECTED !== "true") {
    return "Rewrite endpoint is disabled until DEMO_PASSWORD or deployment protection is configured";
  }
  if (password && request.headers.get("x-demo-password") !== password && !(await validPasswordCookie(request, password))) return "Unauthorized";
  return null;
}

export function GET() {
  const thinkingDisabled = process.env.OLLAMA_DISABLE_THINKING === "true";
  return json({
    configured: Boolean(process.env.OLLAMA_API_KEY && process.env.OLLAMA_MODEL),
    protected: Boolean(configuredPassword()),
    model: process.env.OLLAMA_MODEL || null,
    promptVersion: REWRITE_PROMPT_VERSION,
    generation: { temperature: 0, numPredict: NUM_PREDICT, think: thinkingDisabled ? false : null },
  });
}

export async function POST(request: Request) {
  const auth = await authError(request);
  if (auth) return json({ error: auth }, auth === "Unauthorized" ? 401 : 503);
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL;
  if (!apiKey || !model) return json({ error: "Rewrite is not configured" }, 503);

  let body: unknown;
  try { body = await readJsonBody(request); } catch (error) {
    return json({ error: error instanceof Error && error.message === "body-too-large" ? "Request body is too large" : "Request body must be JSON" }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid history/currentQuery", details: parsed.error.flatten() }, 400);

  const controller = new AbortController();
  const controllerAbort = () => controller.abort(request.signal.reason);
  if (request.signal.aborted) controllerAbort();
  request.signal.addEventListener("abort", controllerAbort, { once: true });
  // The bounded override is useful for deployment smoke tests; production defaults to 45s.
  const timeout = Math.max(1, Math.min(REQUEST_TIMEOUT_MS, Number(process.env.REWRITE_TIMEOUT_MS) || REQUEST_TIMEOUT_MS));
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const disableThinking = process.env.OLLAMA_DISABLE_THINKING === "true";
    const upstreamPayload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: REWRITE_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ history: parsed.data.history, current_query: parsed.data.currentQuery }) },
      ],
      stream: false,
      options: { temperature: 0, num_predict: NUM_PREDICT },
    };
    if (disableThinking) upstreamPayload.think = false;
    const upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(upstreamPayload),
      signal: controller.signal,
    });
    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status === 429 ? 429 : 502;
      return json({ error: `Ollama rewrite failed (${upstream.status})` }, status);
    }
    const result: unknown = await upstream.json();
    if (!result || typeof result !== "object") return json({ error: "Ollama returned an invalid response" }, 502);
    const done = (result as { done?: unknown }).done;
    if (done !== true || (result as { done_reason?: unknown }).done_reason === "length") return json({ error: "Ollama response was incomplete" }, 502);
    const message = (result as { message?: { content?: unknown } }).message;
    const query = typeof message?.content === "string" ? message.content.trim() : "";
    if (!query || query.length > MAX_OUTPUT || /[\r\n]/.test(query) || /^```|```$/.test(query) || /^[{[]/.test(query)) {
      return json({ error: "Ollama returned an invalid one-line query" }, 502);
    }
    const actualModel = typeof (result as { model?: unknown }).model === "string" ? (result as { model: string }).model : model;
    return json({ query, model: actualModel, promptVersion: REWRITE_PROMPT_VERSION, generation: { temperature: 0, numPredict: NUM_PREDICT, think: disableThinking ? false : null } });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return json({ error: "Rewrite timed out" }, 504);
    return json({ error: "Could not reach Ollama" }, 502);
  } finally {
    request.signal.removeEventListener("abort", controllerAbort);
    clearTimeout(timer);
  }
}
