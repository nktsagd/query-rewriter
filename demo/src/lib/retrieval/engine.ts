import { MiniSearchIndex, type Bm25Settings, type MiniSearchHit, type RetrievalDocument } from "./minisearch";
import { runPrf, type PrfOutput, type PrfSettings } from "./prf";

export type { Bm25Settings, MiniSearchHit, RetrievalDocument } from "./minisearch";
export type { ExpansionTerm, PrfOutput, PrfSettings, PrfTrace } from "./prf";

export interface SearchOptions { topK?: number; }

export interface RetrievalEngine {
  index(documents: RetrievalDocument[], settings?: Partial<Bm25Settings>): void;
  replaceIndex(index: MiniSearchIndex): void;
  search(query: string, options?: SearchOptions): MiniSearchHit[];
  searchPRF(query: string, options?: SearchOptions & { settings?: Partial<PrfSettings> }): PrfOutput;
  getIndex(): MiniSearchIndex | undefined;
}

export function createRetrievalEngine(): RetrievalEngine {
  let current: MiniSearchIndex | undefined;
  return {
    index(documents, settings) { current = new MiniSearchIndex(documents, settings); },
    replaceIndex(index) { current = index; },
    search(query, options) { return current?.search(query, options) ?? []; },
    searchPRF(query, options) {
      if (!current) return { query, weights: new Map(), results: [], trace: { feedbackDocIds: [], terms: [], settings: { feedbackDocs: 3, feedbackTerms: 5, expansionWeight: 0.5 }, usedFallback: true, reason: "Index is not ready", latencyMs: { raw: 0, expansion: 0 } } };
      return runPrf(current, query, options);
    },
    getIndex() { return current; },
  };
}

export { MiniSearchIndex };
