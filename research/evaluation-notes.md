# Evaluation notes: CAsT2020 rewriting and LLM expansion

## Scope and protocol decision

The controlled comparison should keep the index, BM25 implementation, cut-off,
qrels, and scoring fixed, and vary only the query text supplied to BM25:

1. **Raw**: the current conversational utterance only.
2. **Standalone LLM rewrite**: an API model receives the allowed conversation
   history and emits one standalone query; no retrieved documents, pseudo-
   relevance feedback, answer generation, or reward-model selection is used.
3. **Manual/oracle rewrite**: the released `manual_rewritten_utterance`, as an
   annotated human-reference arm for decontextualisation.

The manual arm is an oracle-input reference, not a deployable baseline or a
guaranteed BM25 upper bound. Report it separately and do not call the
difference between it and the LLM arm a pure model improvement: it includes
human query formulation and possible knowledge of the intended information
need, while lexical BM25 can still prefer a different wording.

This is consistent with the CAsT2020 release, which provides both
`manual_rewritten_utterance` and `automatic_rewritten_utterance`; the local
`data/topics.json` includes both fields and the manual canonical result ID.
The official overview says the automatic canonical response was sampled using
the CAsT2019 automatic rewriter, while the manual canonical response used the
manually rewritten (oracle context-free) query. The organizers also state that
about one quarter of turns depend on a previous system response. A
track-faithful run may therefore include a *released prior-turn canonical
response* when that response is part of the allowed history; it is track
provided context, not automatically leakage. The implementation for this
project should use the simpler primary setting: raw user utterance and prior
user history only, with no response text. In either setting, never provide the
current-turn or a future-turn canonical answer to the rewriter. If prior
responses are enabled later, label that as a separate response-conditioned
setting and use only responses from turns already elapsed in the conversation.

The CAsT2020 official baseline used Solr BM25 (k1=1.2, b=0.75, distributed
IDF, stopword removal, KStem) followed by a BERT reranker. For this project,
use the repository's same BM25-only retriever for every arm and state that
this is a controlled reimplementation rather than the official full baseline.
The official qrels are pooled and incompletely judged (the NIST page notes that
turns with fewer than three relevant documents do not appear in the judgment
file), so report the exact scored-turn set and avoid interpreting unjudged as
nonrelevant.

## What the selected papers imply

### Query rewriting

- **IterCQR** (Jang et al., NAACL 2024) trains CQR iteratively using retrieval
  signals as a reward, avoiding human rewrite labels. It is useful motivation
  for retrieval-aware rewriting, but it is not a valid arm in this experiment:
  it changes the model through training and uses retrieval feedback. It should
  be cited as related work, not combined with a no-training, no-PRF LLM arm.
  Source: <https://arxiv.org/abs/2311.09820>.
- **AdaRewriter** (Lai et al., EMNLP 2025) generates candidate rewrites and
  selects among them with an outcome-supervised reward model adapted at test
  time; it can operate with a black-box LLM API, but still requires a trained
  reward model and outcome-based selection. It is therefore outside the
  primary comparison. A future extension could add it as a separately labeled
  retrieval-aware selection arm. Source:
  <https://arxiv.org/abs/2506.01381>.

The practical implication is to make the standalone-LLM arm a single fixed
prompt, fixed model, fixed decoding policy (prefer temperature 0), and one
rewrite per turn. Do not silently use best-of-N, reranking, or retrieval-based
prompt refinement; those are separate interventions.

### Expansion methods and incompatibilities

- **Query2doc** (Wang, Yang, Wei, EMNLP 2023) prompts an LLM for a pseudo-
  document and appends it as query expansion. It can be adapted to BM25, but
  it is query expansion, not standalone CQR. Adding it to the LLM rewrite arm
  would conflate decontextualisation with vocabulary expansion. If tested,
  make it a distinct `raw + Query2doc` arm with the same BM25 and token budget,
  and do not call it a rewrite-only result. Source:
  <https://arxiv.org/abs/2303.07678>.
- **HyDE** (Gao et al., ACL 2023) generates a hypothetical document and feeds
  its embedding to a dense encoder (e.g., Contriever) before dense retrieval.
  It cannot be a like-for-like BM25 expansion without changing the retriever
  and representation space. Keep it out of the primary BM25 experiment;
  compare it only in a separately labeled dense-retrieval study. Sources:
  <https://arxiv.org/abs/2212.10496> and
  <https://aclanthology.org/2023.acl-long.99/>.
- **CSQE** (Lei et al., EACL 2024) explicitly retrieves initial documents,
  asks an LLM to select key corpus sentences, and combines those sentences
  with LLM-generated expansions. It is a corpus-steered PRF-like pipeline.
  It violates the requested no-PRF/no-retrieved-context condition and must
  not be mixed into the standalone arm. It is a good later ablation for whether
  grounding expansion in the collection helps. Source:
  <https://arxiv.org/abs/2402.18031> (published paper:
  <https://aclanthology.org/2024.eacl-short.34/>).
- **LLM-based Query Expansion Fails for Unfamiliar and Ambiguous Queries**
  (Abe et al., SIGIR 2025) reports controlled degradation when the model lacks
  query knowledge or when ambiguity causes a biased, narrow expansion. This is
  directly relevant to CAsT turns: an expansion can erase a rare entity or
  commit to one interpretation. Use this paper to motivate per-turn failure
  analysis, not as evidence that a particular OpenRouter model will fail in the
  same way. Source: <https://arxiv.org/abs/2505.12694>.

## Recommended runnable ablation

Run the three primary arms over the same scored CAsT2020 turns, with identical
BM25 with `k1=0.9`, `b=0.4`, and `top_k=100`, and cache every generated rewrite. Report nDCG@10,
Recall@100, and RR@10, plus per-turn paired deltas against Raw. Partition
results by (a) first turn vs later turn, (b) whether the topic has a released
response-dependent context label, and (c) whether the LLM rewrite changes,
adds, or drops named entities/numbers. Include the manual arm as an annotated
reference; its score is not an assumed ceiling.

The primary three-arm table is:

| Arm | Input to BM25 | Uses retrieval feedback? | Purpose |
|---|---|---:|---|
| Raw | raw utterance | No | lexical baseline |
| LLM-CQR | one standalone LLM rewrite | No | requested intervention |
| Manual | released manual rewrite | No | human reference |

If expansion is explicitly studied later, add `Raw + Query2doc` and optionally
`LLM-CQR + Query2doc` in a second, clearly labeled table. These are expansion
arms, not additional CQR arms, and should not be described as a 2x2 design.

Do not include `CSQE`, RM3, Rocchio, initial-result snippets, IterCQR, or
AdaRewriter in this no-PRF/no-training table. If they are later run, place
them in a second table with separate labels for retrieval feedback and learned
selection. For OpenRouter, record provider/model ID, prompt version, decoding
parameters, timestamp, failures, and the exact cached output; otherwise model
drift and API retries make paired comparisons irreproducible.

## Primary sources

- CAsT2020 overview: <https://trec.nist.gov/pubs/trec29/papers/OVERVIEW.C.pdf>
- CAsT2020 data and qrels: <https://trec.nist.gov/data/cast2020.html>
- CAsT2020 submitted-run index: <https://trec.nist.gov/pubs/trec29/appendices/cast.html>
- IterCQR: <https://arxiv.org/abs/2311.09820>
- AdaRewriter: <https://arxiv.org/abs/2506.01381>
- Query2doc: <https://arxiv.org/abs/2303.07678>
- HyDE: <https://aclanthology.org/2023.acl-long.99/>
- CSQE: <https://aclanthology.org/2024.eacl-short.34/>
- LLM expansion failure analysis: <https://arxiv.org/abs/2505.12694>
