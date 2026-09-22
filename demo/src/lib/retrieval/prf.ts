import { isPrfCandidate, tokenize, uniqueTokens } from "./tokenizer";
import type { MiniSearchHit, MiniSearchIndex } from "./minisearch";

export interface PrfSettings {
  feedbackDocs: number;
  feedbackTerms: number;
  expansionWeight: number;
}

export const DEFAULT_PRF: PrfSettings = { feedbackDocs: 3, feedbackTerms: 5, expansionWeight: 0.5 };

export interface ExpansionTerm {
  term: string;
  score: number;
  weight: number;
  documentFrequency: number;
}

export interface PrfTrace {
  feedbackDocIds: string[];
  terms: ExpansionTerm[];
  settings: PrfSettings;
  usedFallback: boolean;
  reason?: string;
  latencyMs: { raw: number; expansion: number };
}

export interface PrfOutput {
  query: string;
  weights: Map<string, number>;
  results: MiniSearchHit[];
  trace: PrfTrace;
}

/** Calculate the v1 feedback score before top-term selection. Exported for trace/tests. */
export function calculateFeedbackScores(index: MiniSearchIndex, feedbackDocIds: string[], rawTokens: Set<string>): Map<string, number> {
  const scores = new Map<string, number>();
  const N = index.documents.length;
  if (!feedbackDocIds.length) return scores;
  for (const id of feedbackDocIds) {
    const counts = index.tokenFrequencies.get(id) ?? new Map();
    const length = index.documentLengths.get(id) || 1;
    for (const [term, tf] of counts) {
      const df = index.documentFrequencies.get(term) ?? 0;
      if (rawTokens.has(term) || !isPrfCandidate(term, df, N)) continue;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      scores.set(term, (scores.get(term) ?? 0) + (tf / length) * idf / feedbackDocIds.length);
    }
  }
  return scores;
}

export function runPrf(index: MiniSearchIndex, rawQuery: string, options: { topK?: number; settings?: Partial<PrfSettings> } = {}): PrfOutput {
  const settings = { ...DEFAULT_PRF, ...options.settings };
  const topK = options.topK ?? 5;
  const rawTokens = uniqueTokens(rawQuery);
  const weights = new Map(rawTokens.map((term) => [term, 1]));
  const started = performance.now();
  const fallback = (reason: string, rawResults = index.search(rawQuery, { topK }), rawLatency = performance.now() - started): PrfOutput => ({
    query: rawQuery,
    weights,
    results: rawResults,
    trace: { feedbackDocIds: rawResults.slice(0, settings.feedbackDocs).map((hit) => hit.id), terms: [], settings, usedFallback: true, reason, latencyMs: { raw: rawLatency, expansion: 0 } },
  });
  if (settings.feedbackDocs <= 0 || settings.feedbackTerms <= 0 || settings.expansionWeight <= 0) return fallback("PRF is disabled");

  const rawResults = index.search(rawQuery, { topK: Math.max(topK, settings.feedbackDocs) });
  const rawLatency = performance.now() - started;
  const feedback = rawResults.slice(0, settings.feedbackDocs);
  if (!feedback.length) return fallback("No feedback documents matched", rawResults.slice(0, topK));

  const rawSet = new Set(rawTokens);
  const scores = calculateFeedbackScores(index, feedback.map((hit) => hit.id), rawSet);
  const selected = [...scores.entries()]
    .sort(([a, av], [b, bv]) => bv - av || a.localeCompare(b))
    .slice(0, settings.feedbackTerms);
  if (!selected.length) return fallback("No eligible expansion terms", rawResults.slice(0, topK));
  const maxScore = selected[0][1];
  const terms = selected.map(([term, score]) => ({ term, score, weight: settings.expansionWeight * score / maxScore, documentFrequency: index.documentFrequencies.get(term) ?? 0 }));
  for (const item of terms) weights.set(item.term, item.weight);
  const query = [...weights.keys()].join(" ");
  const expansionStarted = performance.now();
  const results = index.search(query, { topK, weights });
  return { query, weights, results, trace: { feedbackDocIds: feedback.map((hit) => hit.id), terms, settings, usedFallback: false, latencyMs: { raw: rawLatency, expansion: performance.now() - expansionStarted } } };
}
