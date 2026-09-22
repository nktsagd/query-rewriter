import MiniSearch from "minisearch";
import { tokenize, uniqueTokens } from "./tokenizer";

export interface RetrievalDocument {
  id: string;
  title: string;
  text: string;
}

export interface Bm25Settings {
  /** MiniSearch names the BM25 k1 parameter `k`. */
  k: number;
  b: number;
  d: number;
}

export const DEFAULT_BM25: Bm25Settings = { k: 1.2, b: 0.7, d: 0.5 };

export interface MiniSearchHit {
  id: string;
  score: number;
  match: Record<string, string[]>;
}

export class MiniSearchIndex {
  readonly settings: Bm25Settings;
  readonly documents: RetrievalDocument[];
  readonly tokenFrequencies = new Map<string, Map<string, number>>();
  readonly documentFrequencies = new Map<string, number>();
  readonly documentLengths = new Map<string, number>();
  private readonly index: MiniSearch<RetrievalDocument>;

  constructor(documents: RetrievalDocument[], settings: Partial<Bm25Settings> = {}) {
    this.settings = { ...DEFAULT_BM25, ...settings };
    this.documents = [];
    this.index = new MiniSearch<RetrievalDocument>({
      fields: ["content"],
      storeFields: ["title"],
      tokenize,
    });

    this.addDocuments(documents);
  }

  /** Add one batch. The MiniSearch index remains usable between batches. */
  addDocuments(documents: RetrievalDocument[]): void {
    const indexed = documents.map((doc) => {
      this.documents.push({ ...doc });
      const content = `${doc.title}\n${doc.text}`;
      const tokens = tokenize(content);
      const counts = new Map<string, number>();
      for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
      this.tokenFrequencies.set(doc.id, counts);
      this.documentLengths.set(doc.id, tokens.length);
      for (const token of counts.keys()) this.documentFrequencies.set(token, (this.documentFrequencies.get(token) ?? 0) + 1);
      return { ...doc, content };
    });
    this.index.addAll(indexed);
  }

  search(query: string, options: { topK?: number; weights?: Map<string, number> } = {}): MiniSearchHit[] {
    const topK = options.topK ?? 5;
    const weights = options.weights;
    const normalizedQuery = uniqueTokens(query).join(" ");
    if (!normalizedQuery) return [];
    const hits = this.index.search(normalizedQuery, {
      combineWith: "OR",
      bm25: this.settings,
      ...(weights ? { boostTerm: (term: string) => weights.get(normalizeTerm(term)) ?? 1 } : {}),
    });
    return hits
      .map((hit) => ({ id: String(hit.id), score: hit.score, match: hit.match ?? {} }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, topK);
  }
}

function normalizeTerm(term: string): string {
  return tokenize(term)[0] ?? term.normalize("NFC").toLocaleLowerCase("vi-VN");
}
