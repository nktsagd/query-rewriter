import { describe, expect, test } from "bun:test";
import { calculateFeedbackScores, compareMethods, createRetrievalEngine, isPrfCandidate, MiniSearchIndex, tokenize } from "../src/lib/retrieval";

const docs = [
  { id: "a", title: "Router tầng trên", text: "Đặt router ở vị trí trung tâm giúp sóng Wi-Fi lên tầng trên ổn định hơn." },
  { id: "b", title: "Repeater Wi-Fi", text: "Bộ kích sóng repeater nhận rồi phát lại tín hiệu, có thể giảm tốc độ khi họp video." },
  { id: "c", title: "Mesh Ethernet", text: "Mesh dùng ethernet backhaul nối các nút bằng dây mạng để giảm nhiễu và tăng độ ổn định." },
  { id: "d", title: "Bluetooth", text: "Bluetooth chập chờn do khoảng cách và nhiễu ở thiết bị không dây." },
];

describe("tokenizer", () => {
  test("keeps Vietnamese Unicode and extracts digits", () => {
    expect(tokenize("ÀO 5GHz, Wi-Fi! không")).toEqual(["ào", "5ghz", "wi", "fi", "không"]);
  });
});

describe("MiniSearch BM25+ engine", () => {
  test("returns stable lexical results and supports topK", () => {
    const engine = createRetrievalEngine();
    engine.index(docs);
    const result = engine.search("router tầng trên", { topK: 2 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe("a");
    if (result[1]) expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  test("PRF candidates come from feedback docs and expansion can be disabled", () => {
    const engine = createRetrievalEngine();
    engine.index(docs);
    const disabled = engine.searchPRF("router tầng trên", { topK: 3, settings: { expansionWeight: 0 } });
    expect(disabled.trace.usedFallback).toBe(true);
    const expanded = engine.searchPRF("router tầng trên", { topK: 3, settings: { feedbackTerms: 3 } });
    expect(expanded.trace.feedbackDocIds.length).toBeGreaterThan(0);
    expect(expanded.trace.terms.every((term) => expanded.trace.feedbackDocIds.some((id) =>
      (engine.getIndex()?.tokenFrequencies.get(id)?.has(term.term) ?? false)))).toBe(true);
  });
});

test("PRF candidate filtering preserves negation and removes corpus-wide terms", () => {
  expect(isPrfCandidate("không", 1, 4)).toBe(true);
  expect(isPrfCandidate("wifi", 4, 4)).toBe(false);
  expect(isPrfCandidate("7", 1, 4)).toBe(false);
});

test("PRF feedback score follows tf/length times corpus IDF", () => {
  const index = new MiniSearchIndex([
    { id: "f", title: "", text: "query alpha" },
    { id: "other", title: "", text: "query beta" },
  ]);
  const scores = calculateFeedbackScores(index, ["f"], new Set(["query"]));
  expect(scores.get("alpha")).toBeCloseTo(0.5 * Math.log(2), 10);
  expect(scores.has("query")).toBe(false);
});

test("PRF can retrieve a document through a feedback term absent from the raw query", () => {
  const engine = createRetrievalEngine();
  engine.index([
    { id: "feedback", title: "router", text: "router alpha" },
    { id: "new", title: "alpha", text: "alpha only" },
    { id: "other", title: "unrelated", text: "unrelated" },
  ]);
  const output = engine.searchPRF("router", { topK: 5, settings: { feedbackDocs: 1, feedbackTerms: 1 } });
  expect(output.trace.terms[0]?.term).toBe("alpha");
  expect(output.results.some((hit) => hit.id === "new")).toBe(true);
});

test("DF is measured across the whole corpus and term repetition affects BM25 TF", () => {
  const index = new MiniSearchIndex([
    { id: "short", title: "shared", text: "shared" },
    { id: "long", title: "shared", text: "shared shared shared extra" },
    { id: "rare", title: "unique", text: "unique" },
  ]);
  expect(index.documentFrequencies.get("shared")).toBe(2);
  expect(index.documentFrequencies.get("unique")).toBe(1);
  const hits = index.search("shared", { topK: 3 });
  expect(hits[0]?.id).toBe("long");
  expect(index.documentLengths.get("long")).toBeGreaterThan(index.documentLengths.get("short")!);
});

test("comparison exposes independent raw, PRF, Human and latency traces", () => {
  const index = new MiniSearchIndex(docs);
  const comparison = compareMethods(index, { rawQuery: "router tầng trên", humanQuery: "đặt router tầng trên", topK: 3 });
  expect(comparison.raw.results.length).toBeGreaterThan(0);
  expect(comparison.prf.trace.latencyMs.raw).toBeGreaterThanOrEqual(0);
  expect(comparison.prf.trace.latencyMs.expansion).toBeGreaterThanOrEqual(0);
  expect(comparison.human?.results.length).toBeGreaterThan(0);
});
