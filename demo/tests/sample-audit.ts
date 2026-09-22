import { documents, conversation } from "../src/data/demo-dataset";
import { compareMethods, createRetrievalEngine, type RetrievalDocument } from "../src/lib/retrieval";

const engine = createRetrievalEngine();
engine.index(documents);
const index = engine.getIndex()!;

console.log(`sample=${documents.length} docs turns=${conversation.turns.length}`);
for (const [position, turn] of conversation.turns.entries()) {
  const result = compareMethods(index, { rawQuery: turn.text, humanQuery: turn.humanQuery, topK: 3 });
  const ids = (items: { results: { id: string }[] }) => items.results.map((item) => item.id).join(",");
  console.log(`${position + 1}\traw=${ids(result.raw)}\tprf=${ids(result.prf)}\thuman=${ids(result.human!)}\tprfTerms=${result.prf.trace.terms.map((term) => term.term).join(",")}`);
}

const synthetic: RetrievalDocument[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `P${i}`,
  title: `Performance document ${i}`,
  text: `Wi-Fi mesh router tầng ${i % 10} repeater backhaul access point kiểm thử hiệu năng ${i}.`,
}));
const bytes = new TextEncoder().encode(JSON.stringify(synthetic)).byteLength;
const perfEngine = createRetrievalEngine();
perfEngine.index(synthetic);
const timings: number[] = [];
for (let i = 0; i < 5; i++) perfEngine.search("Wi-Fi mesh tầng", { topK: 5 });
for (let i = 0; i < 50; i++) {
  const start = performance.now();
  perfEngine.search("Wi-Fi mesh tầng", { topK: 5 });
  timings.push(performance.now() - start);
}
timings.sort((a, b) => a - b);
const p95 = timings[Math.min(timings.length - 1, Math.ceil(timings.length * 0.95) - 1)];
console.log(`perf_docs=${synthetic.length} serialized_bytes=${bytes} retrieval_p95_ms=${p95.toFixed(2)}`);
