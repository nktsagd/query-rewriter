export type RewriteInput = {
  history: string[];
  currentQuery: string;
};

export type RewriteResponse = {
  query: string;
  model: string;
  promptVersion: string;
  generation?: {
    temperature: number;
    numPredict: number;
    think: boolean | null;
  };
};

export async function rewrite(
  input: RewriteInput,
  signal?: AbortSignal,
  password?: string,
): Promise<RewriteResponse> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (password) headers["x-demo-password"] = password;

  const response = await fetch("/api/rewrite", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Rewrite failed (${response.status})`);
  }
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error: unknown }).error)
      : `Rewrite failed (${response.status})`;
    throw new Error(detail);
  }
  if (!payload || typeof payload !== "object" || typeof (payload as { query?: unknown }).query !== "string") {
    throw new Error("Rewrite returned an invalid response");
  }
  return payload as RewriteResponse;
}
