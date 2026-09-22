Generated using the built-in ImageGen tool. Diagram images are illustrative. Technical specifications follow the project notebook and saved results.

## context

Use case: infographic-diagram. Create a polished English technical workflow illustration for a research PowerPoint slide. Wide landscape aspect ratio 2:1, very high resolution, white background, ample whitespace, navy typography, cobalt blue for inputs, teal for retrieval, subtle orange for ambiguous references. Professional research infographic with crisp large type, tasteful detailed chat-message and document-stack icons, precise directional arrows and strong visual hierarchy. No cartoon robot, no decoration without meaning, no title banner, no tiny text. All text must be legible at presentation size.
Draw a conversational retrieval scenario. Left 28%: vertical chat transcript headed "Conversation". Three bubbles with these exact short texts: "My garage door opener stopped working.", "What might be wrong?", "How much does it cost to fix it?" Label latest bubble "Current question" and highlight "it". This is an illustrative conversation, not a literal dataset excerpt.
Center: a node "Query formulation" receives TWO separate arrows: one from earlier chat messages labelled "History", and one from latest bubble labelled "Current question". Its output arrow labelled "Search query" leads to "BM25 retrieval". Below BM25, a neat cylinder "Passage index" connects UP to BM25, labelled "Search".
Right: BM25 arrow leads to a ranked stack of 3 document sheets headed "Relevant passages", with visible snippets "Opener repair costs", "Labor and service fees", "Repair estimates". Then a small downward arrow to "Chat answer" with caption "Uses retrieved evidence". Draw a subtle dashed boundary containing Query formulation, BM25 and Relevant passages, labelled "Project evaluation ends at retrieval". Chat answer lies outside boundary. Keep all arrows unambiguous. Bottom small caption: "Illustrative conversation and passages".

## raw-human

Use case: infographic-diagram. Create a polished English technical workflow illustration for a research PowerPoint slide. Wide landscape 2:1, very high resolution, white background, large crisp navy typography, blue raw method, purple human reference, teal retrieval, coral warning accents. Detailed yet disciplined document-stack, chat and search icons, clean arrow routing, no cartoon robots, no title banner. Exactly two horizontal workflow lanes.
TOP lane label "RAW". Three main steps connected left-to-right with clear arrowheads:
1 "Latest user message" with exact quotation "How much does it cost for someone to fix it?"
2 "BM25" with sublabel "Query stays unchanged"
3 "Top 100 passages" with two sample document topics "Phone repair" and "Car repair".
Small coral callout under query: "Missing subject: what is it?" Small coral callout under output: "Risk of unrelated results". A small faded history stack above the latest message labelled "Earlier user turns" includes "garage door opener", with a dotted line ending in a stop mark before the Raw input, caption "Not used by Raw".
BOTTOM lane label "HUMAN REFERENCE". Three steps connected left-to-right:
1 "Official manual rewrite" with exact quotation "How much does it cost for someone to repair a garage door opener?"
2 "BM25" with sublabel "Same retrieval settings"
3 "Top 100 passages" with illustrative topics "Garage door opener repair" and "Repair service costs".
Between the two BM25 nodes show a shared cylinder labelled "Same passage index", connected to both BM25 nodes only.
At bottom add exact caption "Illustrative passage topics, not recorded retrieved documents". Important: show manual rewrite as a dataset input, not a newly generated LLM output. Do not claim Human always retrieves relevant documents. Keep all five? NO only two lanes with three main steps each as specified.

## prf

Use case: infographic-diagram. Create a polished English technical workflow illustration for a research PowerPoint slide. Wide landscape 2:1, very high resolution. White background, navy text, blue retrieval stages, amber feedback stages, coral failure example. Large readable labels, professional clean iconography (chat bubble, search engine, ranked passage stack, weighted-term list), precise arrows, meaningful detail, no cartoon robot, no title banner.
Show the exact project PRF/RM3 workflow using TWO clearly separated rows. TOP main flow left-to-right across full width: "Raw query" with example "How much does it cost to fix it?" -> "BM25: first pass" -> "Top 10 passages" with label "Assume relevant" -> "RM3 feedback model" with label "Select 10 terms".
BOTTOM main flow runs LEFT TO RIGHT. From the upper-right RM3 feedback model, route a clear elbow connector down through an open gap and left to the lower-left "Interpolate" stage. The upper-left Raw query ALSO branches vertically down into Interpolate. Label the Raw branch "Original query: 0.5"; label the feedback branch "Feedback model: 0.5". Then bottom main flow: "Interpolate" -> "Expanded weighted query" -> "BM25: second pass" -> "Final top 100 passages". Arrows must point into Interpolate on both input branches. Avoid crossing text and arrows. Show two stages of BM25 explicitly.
Add a slim coral callout below diagram, exact text: "Failure mode: unrelated first-pass passages can reinforce the wrong topic." Below it smaller illustrative example: "Phone repair passages add screen / battery terms, moving away from garage door opener repair."
Small final caption: "No conversation history or LLM. Feedback examples are illustrative."
All arrows flow correctly, no arrows from final output back into feedback. No numerical weights except those specified. Technical accuracy and large readable type are essential.

## llm

Use case: infographic-diagram. Create a polished English technical workflow illustration for a research PowerPoint slide. Wide landscape 2:1 very high resolution, white background, navy typography, cobalt Rewrite lane, teal Rewrite + Keywords lane, subtle purple LLM stages. Clean publication-quality technical illustration, elegant document/chat/LLM process icons, substantial detail, large crisp labels, no title banner, no decorative robot.
Far left a shared input block headed "User-only context", with two stacked inputs "Previous user turns" and "Current question". Example lines "garage door opener" and "How much does it cost to fix it?" Two arrows split from this shared input into TWO INDEPENDENT horizontal lanes. Do NOT draw an arrow from the top lane into the bottom lane.
TOP lane heading "REWRITE". Steps: "LLM call 1" with small caption "Resolve references" -> "Standalone query" with example "Cost to fix a garage door opener?" -> "BM25" -> "Top 100 passages".
BOTTOM lane heading "REWRITE + KEYWORDS". Steps: larger "LLM call 2" containing ordered internal steps "Resolve context", "Finalize base query", "Append 0–3 equivalent terms". All three steps are inside ONE LLM call, no extra model call. Then arrow to "Expanded query" with example "Cost to fix a garage door opener? repair price" (highlight appended repair price in teal), then -> "BM25" -> "Top 100 passages".
Between the two BM25 nodes a shared index symbol connected to both, caption "Same passage index".
Bottom caption: "Separate prompts generate separate base rewrites. The keyword branch does not reuse call 1."
Second short bottom line: "Examples illustrate the prompt workflow. No assistant answers or retrieved passages enter the LLM."
Preserve intent in examples. Output ranked passages, not a generated answer. Make all labels read at projection size.
