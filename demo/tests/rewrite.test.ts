import { afterEach, describe, expect, test } from "bun:test";
import { REWRITE_PROMPT_VERSION, REWRITE_SYSTEM_PROMPT } from "../src/lib/rewrite/prompt";
import { rewrite } from "../src/lib/rewrite/client";
import { GET, POST } from "../src/app/api/rewrite/route";
import { POST as authPost } from "../src/app/api/auth/route";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const input = { history: ["Wi-Fi yếu ở tầng trên"], currentQuery: "Nó có cải thiện không?" };
function configure() { process.env.OLLAMA_API_KEY = "test-secret-key"; process.env.OLLAMA_MODEL = "test-model"; delete process.env.DEMO_PASSWORD; delete process.env.REWRITE_TIMEOUT_MS; Object.assign(process.env, { NODE_ENV: "test" }); }
function request(body: unknown = input, headers?: HeadersInit) { return new Request("http://localhost/api/rewrite", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }); }
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });

describe("rewrite contract", () => {
  test("keeps the notebook rewriter 2 prompt byte-identical", async () => {
    const notebook = await Bun.file("../notebooks/colab_benchmark.ipynb").json();
    const cell = notebook.cells.find((entry: { source?: string[] }) => (entry.source || []).join("").includes('"rewriter 2"'));
    const source = (cell.source || []).join("");
    expect(source.match(/"rewriter 2": \"\"\"([\s\S]*?)\"\"\"/)?.[1]).toBe(REWRITE_SYSTEM_PROMPT);
    expect(REWRITE_PROMPT_VERSION).toContain("rewriter-2");
  });
  test("client sends only its public input and returns the typed response", async () => {
    let outgoing: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { outgoing = new Request(new URL(String(input), "http://localhost"), init); return Response.json({ query: "router upstairs fix", model: "demo-model", promptVersion: REWRITE_PROMPT_VERSION }); }) as unknown as typeof fetch;
    await expect(rewrite(input, undefined, "secret")).resolves.toMatchObject({ query: "router upstairs fix" });
    expect(outgoing?.headers.get("x-demo-password")).toBe("secret"); expect(await outgoing?.json()).toEqual(input);
  });
  test("forwards exact safe Ollama payload and never returns the key", async () => {
    configure(); let outgoing: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { outgoing = new Request(String(input), init); return Response.json({ done: true, message: { content: "router upstairs fix" }, secret: process.env.OLLAMA_API_KEY }); }) as unknown as typeof fetch;
    const response = await POST(request()); const body = await response.json(); const payload = await outgoing?.json() as Record<string, unknown>;
    expect(response.status).toBe(200); expect(body).toEqual({ query: "router upstairs fix", model: "test-model", promptVersion: REWRITE_PROMPT_VERSION, generation: { temperature: 0, numPredict: 128, think: null } }); expect(JSON.stringify(body)).not.toContain("test-secret-key");
    expect(outgoing?.url).toBe("https://ollama.com/api/chat"); expect(outgoing?.headers.get("authorization")).toBe("Bearer test-secret-key");
    expect(payload.model).toBe("test-model"); expect(payload.stream).toBe(false); expect(payload.think).toBeUndefined();
    expect(payload.messages).toEqual([{ role: "system", content: REWRITE_SYSTEM_PROMPT }, { role: "user", content: JSON.stringify({ history: input.history, current_query: input.currentQuery }) }]);
    expect(JSON.stringify(payload)).not.toContain("test-secret-key");
  });
  test("returns useful status for missing configuration and invalid input", async () => {
    configure(); delete process.env.OLLAMA_API_KEY; expect((await POST(request())).status).toBe(503); configure();
    const response = await POST(request({ ...input, docs: ["secret document"], currentQuery: "   " })); expect(response.status).toBe(400); expect(JSON.stringify(await response.json())).not.toContain("secret document");
  });
  test.each([401, 429, 500, 503])("maps upstream %i without leaking details", async (status) => { configure(); globalThis.fetch = (async () => new Response("upstream secret", { status })) as unknown as typeof fetch; const response = await POST(request()); expect(response.status).toBe(status === 429 ? 429 : 502); expect(JSON.stringify(await response.json())).not.toContain("upstream secret"); });
  test.each([{ label: "multiline", content: "one\ntwo" }, { label: "json", content: '{"query":"bad"}' }, { label: "markdown", content: "```query```" }, { label: "empty", content: "" }])("rejects $label model output", async ({ content }) => { configure(); globalThis.fetch = (async () => Response.json({ done: true, message: { content } })) as unknown as typeof fetch; expect((await POST(request())).status).toBe(502); });
  test("sends think false only when explicitly enabled and requires a completed response", async () => {
    configure(); process.env.OLLAMA_DISABLE_THINKING = "true"; let payload: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_: RequestInfo | URL, init?: RequestInit) => { payload = await new Request("http://ollama", init).json(); return Response.json({ done: true, model: "actual-model", message: { content: "safe query" } }); }) as unknown as typeof fetch;
    const response = await POST(request()); const body = await response.json(); expect(payload?.think).toBe(false); expect(body.model).toBe("actual-model"); expect(body.generation).toEqual({ temperature: 0, numPredict: 128, think: false });
    for (const result of [{ message: { content: "safe query" } }, { done: false, message: { content: "safe query" } }, { done: true, done_reason: "length", message: { content: "safe query" } }]) { globalThis.fetch = (async () => Response.json(result)) as unknown as typeof fetch; expect((await POST(request())).status).toBe(502); }
  });
  test("bounds the raw request body before JSON parsing", async () => { configure(); const huge = new Request("http://localhost/api/rewrite", { method: "POST", body: new Uint8Array(256 * 1024 + 1) }); expect((await POST(huge)).status).toBe(400); });
  test("returns timeout and does not retry", async () => { configure(); process.env.REWRITE_TIMEOUT_MS = "5"; let calls = 0; globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => { calls += 1; init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))); })) as unknown as typeof fetch; expect((await POST(request())).status).toBe(504); expect(calls).toBe(1); });
  test("requires signed cookie when password protection is configured", async () => {
    configure(); process.env.DEMO_PASSWORD = "correct-password"; globalThis.fetch = (async () => Response.json({ done: true, message: { content: "safe query" } })) as unknown as typeof fetch;
    expect((await POST(request())).status).toBe(401);
    const auth = await authPost(new Request("http://localhost/api/auth", { method: "POST", body: JSON.stringify({ password: "correct-password" }), headers: { "content-type": "application/json" } })); const cookie = auth.headers.get("set-cookie")!;
    expect((await POST(request(input, { cookie }))).status).toBe(200); expect((await POST(request(input, { cookie: cookie.replace("; HttpOnly", "x; HttpOnly") }))).status).toBe(401);
  });
  test("GET exposes only nonsecret configuration metadata", () => { configure(); process.env.DEMO_PASSWORD = "secret-password"; expect(GET().status).toBe(200); });
});
