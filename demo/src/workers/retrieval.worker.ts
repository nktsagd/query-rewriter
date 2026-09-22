import { createRetrievalEngine, MiniSearchIndex, type Bm25Settings, type PrfSettings, type RetrievalDocument } from "../lib/retrieval";

export type RetrievalWorkerRequest =
  | { type: "INDEX"; requestId: string; revision: number; documents: RetrievalDocument[]; settings?: Partial<Bm25Settings> }
  | { type: "SEARCH"; requestId: string; revision: number; query: string; topK?: number }
  | { type: "SEARCH_PRF"; requestId: string; revision: number; query: string; topK?: number; settings?: Partial<PrfSettings> }
  | { type: "CANCEL"; requestId: string };

export type RetrievalWorkerResponse =
  | { type: "PROGRESS"; requestId: string; revision: number; completed: number; total: number }
  | { type: "INDEX_READY"; requestId: string; revision: number; documentCount: number }
  | { type: "RESULT"; requestId: string; revision: number; method: "raw" | "prf"; result: unknown }
  | { type: "ERROR"; requestId: string; revision: number; error: string };

const engine = createRetrievalEngine();
const cancelled = new Set<string>();
const activeRequests = new Set<string>();
let activeRevision = -1;
let latestIndexRevision = -1;
const post = (message: RetrievalWorkerResponse) => self.postMessage(message);

function isCancelled(requestId: string): boolean { return cancelled.has(requestId); }

async function handle(message: RetrievalWorkerRequest): Promise<void> {
  if (message.type === "CANCEL") {
    cancelled.add(message.requestId);
    if (!activeRequests.has(message.requestId)) cancelled.delete(message.requestId);
    return;
  }
  activeRequests.add(message.requestId);
  cancelled.delete(message.requestId);
  try {
    if (message.type === "INDEX") {
      if (message.revision < latestIndexRevision) return;
      latestIndexRevision = message.revision;
      // Yield between batches so CANCEL can be handled while a large corpus indexes.
      const batchSize = 100;
      const pending = new MiniSearchIndex([], message.settings);
      for (let start = 0; start < message.documents.length; start += batchSize) {
        if (isCancelled(message.requestId) || message.revision !== latestIndexRevision) return;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        pending.addDocuments(message.documents.slice(start, start + batchSize));
        post({ type: "PROGRESS", requestId: message.requestId, revision: message.revision, completed: Math.min(start + batchSize, message.documents.length), total: message.documents.length });
      }
      if (isCancelled(message.requestId) || message.revision !== latestIndexRevision) return;
      engine.replaceIndex(pending);
      activeRevision = message.revision;
      post({ type: "INDEX_READY", requestId: message.requestId, revision: message.revision, documentCount: message.documents.length });
      return;
    }
    if (isCancelled(message.requestId)) return;
    if (message.revision !== activeRevision || message.revision !== latestIndexRevision) return;
    if (message.type === "SEARCH") post({ type: "RESULT", requestId: message.requestId, revision: message.revision, method: "raw", result: engine.search(message.query, { topK: message.topK }) });
    else post({ type: "RESULT", requestId: message.requestId, revision: message.revision, method: "prf", result: engine.searchPRF(message.query, { topK: message.topK, settings: message.settings }) });
  } catch (error) {
    post({ type: "ERROR", requestId: message.requestId, revision: message.revision, error: error instanceof Error ? error.message : String(error) });
  } finally {
    activeRequests.delete(message.requestId);
    cancelled.delete(message.requestId);
  }
}

self.onmessage = (event: MessageEvent<RetrievalWorkerRequest>) => { void handle(event.data); };
