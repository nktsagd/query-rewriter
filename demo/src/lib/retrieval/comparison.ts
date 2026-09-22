import type { MiniSearchHit, MiniSearchIndex } from "./minisearch";
import { runPrf, type PrfOutput, type PrfSettings } from "./prf";

export interface ComparisonInput {
  rawQuery: string;
  humanQuery?: string;
  topK?: number;
  prfSettings?: Partial<PrfSettings>;
}

export interface TimedResults { query: string; results: MiniSearchHit[]; latencyMs: number; }

export interface ComparisonOutput {
  raw: TimedResults;
  prf: PrfOutput;
  human?: TimedResults;
}

export function compareMethods(index: MiniSearchIndex, input: ComparisonInput): ComparisonOutput {
  const topK = input.topK ?? 5;
  const rawStart = performance.now();
  const raw = { query: input.rawQuery, results: index.search(input.rawQuery, { topK }), latencyMs: performance.now() - rawStart };
  const prf = runPrf(index, input.rawQuery, { topK, settings: input.prfSettings });
  let human: TimedResults | undefined;
  if (input.humanQuery?.trim()) {
    const start = performance.now();
    human = { query: input.humanQuery, results: index.search(input.humanQuery, { topK }), latencyMs: performance.now() - start };
  }
  return { raw, prf, human };
}
