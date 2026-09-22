# Context Lab

Demo for conversational query retrieval built with Next.js and Bun. The interface starts with one English conversation of 10 turns and a deliberately contrastive corpus of 10 Wi-Fi documents; each turn or document can be added, edited, deleted, and re-indexed.

The sample is designed to make the methods visibly diverge. After the opening turn, current requests deliberately become elliptical—“the other band,” “which one,” “what should I add,” “the coordinated option,” “the extra one,” “changing the setup,” and “the first one”—so the decisive entity lives in the history rather than in the query being searched. The corpus separates nearby intents: router placement, 2.4/5 GHz selection, repeater trade-offs, mesh roaming, wireless versus Ethernet backhaul, AP mode, and powerline. Bluetooth and cellular 5G documents are intentional lexical distractors: a vague Raw hit can send PRF down the wrong expansion path. Rewrite can recover the conversational entity, and Human is the hand-written standalone query for comparison. The sample is a teaching fixture, not a relevance-labelled benchmark.

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`, click **Index documents**, select a question turn, then click **Run turn**. Raw, Raw + PRF, and Human run in the browser/Web Worker. Rewrite calls `POST /api/rewrite` on the same origin; copy `.env.example` to `.env.local` to enable Ollama. Never put an API key in `NEXT_PUBLIC_*`.

Checks:

```sh
bun test
bun run typecheck
bun run build
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/context-lab-browsers bun run test:e2e
```

The Playwright test lives in `browser-checks/` and uses the `.playwright.ts` suffix so Bun does not treat it as a unit test. `vercel.json` selects Bun `1.4.x`; configure `OLLAMA_API_KEY`, `OLLAMA_MODEL`, and preferably Deployment Protection or `DEMO_PASSWORD` before sharing a preview.
