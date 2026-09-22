# Paper-informed query rewriting for CAsT-2020

Scope for this note: one rewritten query per turn, the existing BM25 retriever, an OpenRouter API call, preceding raw user utterances only (no QA history), and no pseudo-relevance feedback (PRF), pseudo answers, document expansion, or retrieval-time ensemble. The papers below are evidence for prompt design; their reported numbers should not be treated as predictions for this implementation.

## What the five papers actually contribute

| Paper | Primary method and relevant location | Fit under this scope | Limitation or adaptation |
|---|---|---|---|
| [LLM4CS (Mao et al., Findings EMNLP 2023)](https://arxiv.org/abs/2303.06573) | §3.2 defines REW (rewrite), RTR (rewrite then hypothetical response), and RAR (joint rewrite/response); Appendix A, Figure 4 gives the instruction/demonstration/input format. | REW motivates one call that maps preceding turns plus the current question to a standalone rewrite. | RTR/RAR, multiple generations, vector aggregation, and hypothetical responses are outside scope. The paper’s limitations (§6) note latency from repeated calls and no downstream-ranking awareness. Its displayed prompt requests a reason and response; the plain-text query-only prompt below is an adaptation.
| [Informative Query Rewriting (Ye et al., Findings EMNLP 2023)](https://arxiv.org/abs/2310.09716) | §3.1 identifies correctness, clarity, informativeness, and nonredundancy; Figure 2 and the displayed instruction show the rewrite/edit formulation. | Use the four properties as a checklist for one standalone query. | “Rewrite-then-edit” requires an initial rewrite and a second pass; distillation is training. The authors’ limitations (§6) caution that LLMs may fail instructions, that over-informativeness can hurt retrieval, and that results used one ChatGPT model. Treat “informativeness” as relevant context only, not invented facts.
| [ZeQR (Yang, Zhang & Fang, ICTIR 2023)](https://arxiv.org/abs/2307.09384) | §3.2–§3.4 convert coreference and omission resolution into two MRC steps. The coreference and omission templates are described there; §4.3.1 says coreference must precede omission. | Its error taxonomy is useful for prompt checks: explicitly resolve pronouns and omitted descriptors before writing the query. | ZeQR is zero-shot with respect to conversational-search supervision, but its MRC modules are BERT models fine-tuned on SQuAD (§4.3); it is not a zero-shot OpenRouter reproduction. It also uses IDF to select omission candidates and only the latest canonical passage (§4.3). Adapt the requirements to an LLM prompt.
| [GenQREnsemble (Dhole & Agichtein, ECIR 2024)](https://arxiv.org/abs/2404.03746) | §3, Figure 2: paraphrase one expansion instruction into N instructions, generate keyword sets, append them to the original query. The paper uses N=10 (§4). | At most, the paper motivates testing prompt wording. A single selected instruction can be a baseline. | The core method is multi-output keyword expansion, not conversational decontextualization; GenQREnsembleRF explicitly uses feedback documents and is excluded. Do not call this a faithful reproduction when emitting one standalone query.
| [CHIQ (Mo et al., EMNLP 2024)](https://arxiv.org/abs/2406.05013) | §3.2 separates question disambiguation, response expansion, pseudo response, topic switch, and history summary; §3.3 performs ad-hoc query rewriting. Appendix A.1/A.4/A.5/A.6 prints the prompts. | Use only the question-disambiguation and topic-switch ideas as optional instructions. | The reported pipeline uses several enhancement calls and includes response/pseudo-response generation. With no QA history available, use only raw prior user utterances and treat the final plain-text prompt as an adaptation. Results are mainly TopiOCQA/QReCC, with CAsT transfer tests, so they do not establish CAsT-20 gains here.

## Recommended practical prompt (adaptation)

Use one OpenRouter request per CAsT turn. Supply the preceding raw user utterances and the current utterance; there is no answer text to provide. Ask for exactly one plain-text query, preserving the input language. Keep temperature low. If output is invalid or truncated, stop that turn and persist enough request/cache state to resume it; do not silently substitute the raw utterance. The following combines ideas from LLM4CS-REW, Ye et al.’s four properties, ZeQR’s coreference/omission distinction, and CHIQ’s topic-switch check. It is an adaptation, not a verbatim paper prompt:

```text
You rewrite one conversational search utterance for a BM25 search engine.

Given the preceding raw user utterances and the current utterance, produce
exactly one standalone search query in the same language as the input.
Resolve pronouns and other coreferences ("it", "they", "that", etc.) and
restore omitted descriptors only when the preceding utterances explicitly
support them. Preserve the current utterance's meaning, polarity, entities,
dates, and requested relation. Include useful explicit context needed to
understand it, but do not invent facts, answers, keywords, or entities. Do
not repeat an earlier utterance. If the current turn starts a new topic,
ignore unrelated earlier turns. Keep the query concise.

Return only the query text, with no labels, quotes, markdown, explanation,
answer, or multiple alternatives.

Preceding raw user utterances:
{{history}}

Current utterance:
{{current_question}}
```

The rewrite output should be the sole BM25 query; do not append generated answers or expansion terms. Preserve the exact request/cache state on invalid or truncated output so a later run can resume.

## Faithful reproduction versus adaptation

There is no faithful reproduction in this implementation: the available context is raw user utterances only, output is query text only, and all five papers use at least one incompatible element (demonstrations, QA/response context, MRC modules, multi-output expansion, or multi-call history enhancement). The recommended prompt is an adaptation that combines compatible requirements while omitting those elements. Ye et al.’s “informative” rewrite is adapted to retain only explicitly supported context; GenQREnsemble is useful only for a separate wording ablation, not its N-way keyword outputs or RF variant.

## Evaluation cautions

Compare raw current-utterance BM25 against exactly one rewritten-query BM25 under identical corpus, tokenizer, BM25 parameters, cutoff, and CAsT-20 judgments. Report valid, truncated, and resumable-failure counts alongside retrieval metrics; do not count a silent raw fallback as a successful rewrite. Inspect topic switches, pronouns, omitted noun phrases, negation, dates, and language preservation. A paper’s improvement on another dataset, retriever, model, or multi-call pipeline does not establish an improvement here.
