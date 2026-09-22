/** Shared lexical analyzer for documents, queries, and PRF statistics. */

const TOKEN_RE = /[\p{L}\p{N}]+/gu;

export function normalizeText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi-VN");
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized.match(TOKEN_RE) ?? [];
}

export function uniqueTokens(value: string): string[] {
  return [...new Set(tokenize(value))];
}

/** Candidate-only stop words. Raw query tokens and document length are untouched. */
export const PRF_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "to", "with",
  "các", "cho", "có", "của", "đã", "đang", "được", "hay", "là", "một", "này", "những", "ra", "rằng", "rất", "sẽ", "thì", "trong", "và", "với"
]);

export function isPrfCandidate(token: string, documentFrequency: number, documentCount: number): boolean {
  return token.length > 1 && !/^\d+$/.test(token) && !PRF_STOPWORDS.has(token) &&
    !(documentCount > 1 && documentFrequency === documentCount);
}
