# Kế hoạch demo so sánh truy vấn hội thoại

Trạng thái: kế hoạch triển khai, chưa xây ứng dụng hoặc deploy. Cập nhật yêu cầu: 2026-09-23 (text thuần, bộ mẫu có sẵn và Bun runtime).

## 1. Mục tiêu và phạm vi

Xây một workspace Next.js chạy bằng **Bun runtime**, có sẵn một bộ dữ liệu demo để người dùng sửa hoặc nhập/dán text thuần, nhấn Index, chọn một lượt hỏi trong hội thoại, rồi so sánh bốn phương pháp: **Raw**, **Raw + PRF**, **Rewrite with keywords**, **Human**.

- Một corpus và một index chung cho mọi phương pháp; không cần nhãn liên quan hoặc điểm do người dùng nhập.
- Thao tác documents, index, BM25+, PRF, lưu phiên và bảng so sánh chạy trên browser.
- LLM gọi **Ollama Cloud** theo lựa chọn của người dùng. Suy luận LLM diễn ra trên cloud.
- Vercel phục vụ website và một Next.js Route Handler chuyển tiếp yêu cầu rewrite. Không có dịch vụ Python/Java, database server hoặc search server.
- Đầu vào người dùng chỉ là **text thuần nhập/dán trực tiếp**: nội dung tài liệu, history, current request và Human query. Không có upload/import file, JSON, TXT, PDF, DOCX, rich-text hoặc OCR. JSON nội bộ cho API/storage không phải định dạng người dùng cần nhập. Embeddings, reranker và đánh giá bằng qrels ngoài phạm vi.
- Lần mở đầu có sẵn **một bộ mẫu đầy đủ** gồm **10 docs và đúng một hội thoại nhiều lượt**; người dùng sửa, thêm, xóa tùy ý. Không phải tự chuẩn bị dữ liệu mới thử được demo.
- Corpus nhỏ: giới hạn ban đầu đề xuất 1.000 docs, tổng nội dung UTF-8 10 MB, tối đa 100.000 ký tự/doc. Đây là giới hạn sản phẩm ban đầu, cần đo thực tế để điều chỉnh.

### Ranh giới “on-browser” và Ollama Cloud

Kiểm tra không dùng API key: gửi OPTIONS tới `https://ollama.com/api/chat` với method POST, headers `authorization,content-type`, lần lượt Origin `http://localhost:3000` và `https://retrieval-demo.vercel.app` (origin mẫu, chưa có deployment). Cả hai trả HTTP 405 và không có `Access-Control-Allow-Origin` ngày 2026-09-22. Chưa thực hiện inference có xác thực.

Vì vậy không chọn browser gọi thẳng endpoint này làm kiến trúc mặc định. Đề xuất `POST /api/rewrite` cùng origin trên Vercel, giữ `OLLAMA_API_KEY` ở biến môi trường server. Đây là ngoại lệ cần thiết cho luồng cloud đã chọn; không tuyên bố toàn ứng dụng chạy 100% trong browser. Nếu yêu cầu tuyệt đối không có server function thì cần thay cách gọi LLM hoặc chờ endpoint hỗ trợ CORS thích hợp.

## 2. Hiện trạng repository và cách tổ chức

Đã kiểm tra README và notebook hiện tại. Repository có notebook, kết quả CAsT và tài liệu nghiên cứu; chưa có ứng dụng web. Notebook có `rewriter 2` tạo một query độc lập rồi nối 0–3 synonym/contextual keywords, và nhánh Raw + RM3.

Tạo ứng dụng độc lập trong `demo/`. Giữ nguyên notebook, kết quả và research. Vercel chọn Root Directory là `demo`. Không nhập dữ liệu benchmark vào bundle website.

```text
demo/
  src/app/
    page.tsx                     # Trang workspace
    layout.tsx
    globals.css
    api/rewrite/route.ts          # Chỉ gọi Ollama Cloud
  src/components/
    documents-panel.tsx
    conversation-panel.tsx
    method-column.tsx
    comparison-table.tsx
    document-detail.tsx
    settings-panel.tsx
  src/lib/
    types.ts                     # Documents, run, worker protocol
    schemas.ts                   # Validate text input, storage và API
    retrieval/tokenizer.ts
    retrieval/minisearch.ts
    retrieval/prf.ts
    retrieval/comparison.ts
    rewrite/prompt.ts
    rewrite/client.ts
    storage.ts
  src/workers/retrieval.worker.ts
  src/data/demo-dataset.ts       # 10 docs và đúng một hội thoại mẫu
  tests/                         # Kiểm chứng thuật toán và luồng browser
  bun.lock
  vercel.json                    # Chọn Bun runtime cho Functions
  .env.example
  README.md
```

Stack: Next.js App Router, TypeScript strict, Tailwind CSS, MiniSearch, Web Worker, IndexedDB qua `idb`, Zod, Bun test và Playwright. Dùng React reducer/context cho state trước; chưa cần thêm thư viện state hoặc framework orchestration. Chốt phiên bản stable tương thích khi scaffold, pin Bun trong `packageManager` và commit `bun.lock`. Dùng `bun install --frozen-lockfile` trong CI. Scripts dev/build/start lần lượt gọi `bun run --bun next dev`, `bun run --bun next build`, `bun run --bun next start`; unit test dùng `bun test`, typecheck dùng `bunx --bun tsc --noEmit`. Web Worker vẫn chạy bằng JavaScript engine của browser.

## 3. Bố cục và hành vi giao diện

Desktop ưu tiên màn hình 1440 px trở lên, màu sáng trung tính, typography rõ, bốn cột có màu nhấn cố định; text và thứ hạng vẫn đủ phân biệt khi không nhìn màu.

```text
Toolbar: Tên demo | Khôi phục mẫu | Export kết quả | Settings
┌───────────────────────────────┬─────────────────────────────────┐
│ Hội thoại duy nhất [+ Thêm lượt]│ Documents [+ Thêm doc] [Index] │
│ 1. Câu hỏi mở đầu             │ Danh sách tiêu đề doc           │
│ 2. Câu hỏi nối tiếp           │ → Chọn doc: title + content     │
│ ... → Chọn lượt để sửa/xóa    │                   [Xóa doc]     │
│ Human query của lượt đã chọn │ Số docs · Trạng thái index      │
│ Chạy lượt đã chọn [Run][Cancel]│                                 │
├────────────────┬────────────────┬────────────────┬───────────────┤
│ Raw            │ Raw + PRF      │ Rewrite with   │ Human         │
│                │                │ keywords       │               │
│ Query thực tế  │ Query + terms  │ Query từ LLM   │ Query nhập tay│
│ Top documents  │ Top documents  │ Top documents  │ Top documents │
├────────────────┴────────────────┴────────────────┴───────────────┤
│ Comparison: doc ID/title | Raw rank | PRF rank | Rewrite | Human │
└─────────────────────────────────────────────────────────────────┘
```

### Documents

- Khung Documents riêng, hiển thị danh sách **tiêu đề của từng doc**, không bung toàn văn tất cả docs cùng lúc. Bấm một tiêu đề để chọn doc và mở vùng chỉnh sửa ngay trong khung: title, textarea content và nút “Xóa doc”. Doc đang chọn có highlight rõ.
- Title và content đều là text thuần bắt buộc; ID ổn định tự sinh, không đổi khi sửa tiêu đề. Doc mới chưa có tên hiện “Tài liệu chưa đặt tên”; phải nhập title/content trước Index. Không có trường label/relevance hoặc điều khiển chọn/upload file.
- Nút “Thêm doc” tạo và chọn một doc mới. Xóa chỉ tác động doc đang chọn, sau đó chọn doc kế bên hoặc hiện trạng thái trống. Dán text nhiều đoạn vẫn thuộc một doc, không tự tách theo dòng trống hay dấu phân cách.
- Giữ xuống dòng và dấu tiếng Việt. Validate nội dung chỉ có khoảng trắng, số docs và giới hạn độ dài/dung lượng; báo lỗi ngay tại trường và đánh dấu doc lỗi trong danh sách. Render mọi đầu vào như text, không diễn giải HTML/Markdown.
- Chỉ index khi nhấn Index. Validate toàn bộ trước, không âm thầm bỏ doc lỗi.
- Trạng thái: chưa index → đang index (% docs đã xử lý) → sẵn sàng, hoặc lỗi.
- Sửa corpus/tokenizer đánh dấu index cũ, vô hiệu hóa Run cho tới khi index lại. Index mới chỉ thay index đang dùng khi hoàn tất thành công.
- Khu documents có giới hạn chiều cao và thu gọn được để dành diện tích cho kết quả.

### Một khung hội thoại và chọn lượt chạy

- Workspace chỉ có **một hội thoại**, là danh sách lượt hỏi có thứ tự như một conversation trong dataset. Không có danh sách nhiều hội thoại, bộ chọn tình huống hoặc nút tạo hội thoại thứ hai. “Thêm/xóa” ở khung này nghĩa là thêm/xóa **từng lượt hỏi trong hội thoại đó**.
- Mỗi lượt có ID ổn định, số thứ tự hiển thị, câu hỏi gốc text thuần và Human query tham khảo tùy chọn. Bấm một lượt để chọn, sửa câu hỏi/Human query hoặc xóa đúng lượt đó. Có nút “Thêm lượt” ở cuối danh sách và thao tác đổi thứ tự; đánh lại số thứ tự sau thêm/xóa/di chuyển, không đổi ID.
- Khi chọn lượt thứ i: `currentQuery = turns[i].text`, `history = turns trước i theo đúng thứ tự`. UI phân biệt lượt đang chạy, các lượt trước làm history và các lượt sau chưa dùng. Không nhập một bản history/current request rời dễ lệch với hội thoại.
- Run chạy bốn phương pháp cho **lượt đang chọn**. Raw/PRF chỉ nhận câu hiện tại; Rewrite nhận history và câu hiện tại; Human dùng Human query của lượt đó. Tuyệt đối không đưa các lượt tương lai vào rewrite.
- Chỉ lưu câu hỏi gốc của người dùng làm history; không tự tạo câu trả lời trợ lý, không đưa rewrite/Human query của lượt trước vào history. Đây là chuỗi lượt truy vấn hội thoại theo dataset, không phải chatbot sinh câu trả lời.
- Run không tự thêm lượt hoặc chuyển lượt. Người dùng chọn lượt khác để quan sát diễn tiến; không tự chạy cả hội thoại hay gọi LLM khi click chọn lượt.
- Sửa/xóa/đổi thứ tự lượt làm kết quả liên quan trở thành cũ; snapshot giữ nguyên input lúc chạy. Đổi lượt hiển thị rõ kết quả cũ thuộc lượt nào và cần Run lại, không gắn kết quả cũ vào lượt mới. Không cần index lại khi chỉ sửa hội thoại.
- Human query để trống thì cột Human hiển thị “Chưa nhập”, các cột khác vẫn chạy. Xóa hết lượt thì hiện nút thêm lượt và vô hiệu hóa Run; lượt rỗng báo lỗi trước khi chạy, không âm thầm bỏ khỏi history.

### Bốn cột kết quả

- Mỗi cột có query thực sự dùng, trạng thái riêng, thời gian, số kết quả và top-k docs.
- PRF có phần mở rộng: docs phản hồi, terms được thêm, trọng số; query text không được dùng thay cho thông tin trọng số.
- Rewrite có phần “Xem prompt” và model. Không tự suy ra đâu là phần base query/keyword từ một output plain text không có ranh giới.
- Result card có rank, ID, title, snippet; nhấn mở toàn văn ở side sheet. Highlight từ khớp bằng render text an toàn, không render HTML của document.
- Điểm engine nằm trong chi tiết; không hiển thị như phần trăm đúng và không dùng so sánh chất lượng giữa các cột.
- Click/chọn doc sẽ làm nổi bật doc đó ở các cột còn lại. Bảng so sánh lấy hợp các docs trong top-k; “—” nghĩa là ngoài top-k, không khẳng định không có trong toàn corpus.
- Tablet dùng hai cột; mobile dùng tabs từng phương pháp và bảng cuộn ngang. Desktop giữ thứ tự bốn cột cố định.

## 4. Index và BM25+

- Dùng MiniSearch cho index, tính điểm và ranking. Nhãn trong phần thông tin phương pháp: **MiniSearch / BM25+**, không phải Pyserini/Lucene.
- Tạo một field `content = title + '\n' + text` để mọi nhánh dùng cùng quy tắc, không có title boost ẩn. Giữ docs gốc riêng cho UI.
- Tokenizer chung cho index, query và PRF: normalize Unicode NFC, lowercase, tách chuỗi chữ/số bằng Unicode-aware regex. Giữ dấu tiếng Việt; không stemming, không fuzzy, không prefix.
- Bản đầu là lexical tokenization theo khoảng cách/dấu câu, không tuyên bố đã có bộ tách từ ghép tiếng Việt. Stopwords chỉ dùng để lọc candidate PRF với danh sách Anh/Việt có phiên bản; không loại từ phủ định như “không”, “not”.
- MiniSearch cấu hình tường minh `k=1.2`, `b=0.7`, `d=0.5`, OR; top-k mặc định 5, chọn 5/10/20. Ghi các giá trị này trong export. Tham số không lấy ngầm từ benchmark Pyserini.
- Mọi nhánh dùng cùng analyzer, index revision, BM25 settings. Cột khác nhau ở cách tạo query.
- Query tokens được chuẩn hóa và loại trùng nhất quán, giữ nguyên query text để hiển thị. Token weights được lưu riêng cho PRF.
- Xếp hạng hòa điểm theo doc ID để ổn định. Query không có token hợp lệ hoặc không match trả trạng thái tương ứng, không tự thêm doc điểm 0.
- Index chạy trong worker; main thread chỉ truyền dữ liệu, nhận progress/kết quả. Sử dụng API public của MiniSearch, không đọc private internals.

## 5. PRF v1: mở rộng TF-IDF có trọng số

Đây là thuật toán PRF đơn giản của demo, **không gọi là RM3**. MiniSearch đảm nhiệm cả hai lượt tìm kiếm. Chỉ module chọn từ phản hồi cần viết thêm.

Tham số mặc định: `feedbackDocs=3`, `feedbackTerms=5`, `expansionWeight=0.5`. Số docs thực dùng tối đa bằng số kết quả lần đầu; feedbackDocs độc lập với top-k hiển thị.

1. Chạy query Raw bằng BM25+, lấy top `feedbackDocs` làm tập F.
2. Từ thống kê token xây lúc index, tính cho mỗi candidate t:

   `idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))`

   `feedbackScore(t) = mean[d in F](tf(t,d) / length(d)) * idf(t)`

   N và df lấy từ **toàn corpus**; length là số token trước khi lọc candidate. Tập F trọng số đồng đều, không coi BM25 score là xác suất.

3. Candidate phải xuất hiện trong F; bỏ term đã có trong Raw, stopwords, token toàn số, token một ký tự và term có `df=N` khi `N>1`. Lọc chỉ áp dụng terms bổ sung, không thay Raw.
4. Chọn tối đa feedbackTerms theo score giảm dần, hòa điểm theo chuỗi token. Không có candidate hoặc không có feedback docs thì giữ nguyên query Raw và giải thích trong UI.
5. Từ gốc có weight 1. Từ mở rộng có weight `expansionWeight * feedbackScore(t) / maxSelectedScore`.
6. Ghép các token duy nhất thành query thứ hai, truyền weights bằng `boostTerm`, gọi MiniSearch rồi lấy top-k. Không thêm từ bằng cách lặp nhiều lần trong chuỗi.
7. Trả query cuối, bảng token/weight, IDs feedback docs, thông số và hai lượt latency để UI giải thích được.

Lưu TF, DF và document length trong các Map riêng ngay lúc tokenize; không tự viết lại index retrieval. `feedbackTerms=0`, `expansionWeight=0` hoặc F rỗng phải có nhánh trả kết quả Raw trực tiếp. Đây là tiêu chí kiểm chứng quan trọng.

## 6. Rewrite with keywords và Ollama Cloud

- Chuyển nguyên prompt `SYSTEM_PROMPTS['rewriter 2']` từ notebook sang file TypeScript có `promptVersion`, không thay nội dung ngầm.
- Input gồm history và current request. Không đưa corpus, feedback docs, Human query hoặc kết quả retrieval vào LLM.
- Output một dòng query cuối, gồm query đã làm rõ ngữ cảnh và tối đa ba synonym/cụm từ đồng nghĩa theo prompt. Ràng buộc ngữ nghĩa do prompt hướng dẫn, không tuyên bố validator chứng minh được.
- UI đọc được system prompt và payload câu hỏi; bản đầu prompt chỉ đọc để giữ phương pháp ổn định.
- Browser gửi `{history, currentQuery}` tới `POST /api/rewrite`. Server tự thêm prompt, model và generation settings đã cấu hình.
- Route dùng `fetch` tới endpoint cố định `https://ollama.com/api/chat`, Bearer key từ `OLLAMA_API_KEY`, model từ `OLLAMA_MODEL`, `stream:false`, temperature 0 và output budget ngắn. Chỉ gửi `think:false` nếu model hỗ trợ.
- Không cho client chọn upstream URL; không gửi credentials, docs hoặc Human query vào body. Key không có prefix `NEXT_PUBLIC_`, không ghi log hoặc xuất session.
- Đọc `message.content`; không nhầm `message.thinking` với query. Kiểm tra response hoàn tất, query không rỗng, một dòng và không phải JSON/code block. Response lỗi/truncated hiển thị lỗi riêng, không lặng lẽ dùng Raw.
- Timeout toàn request hữu hạn, đồng bộ với giới hạn Function đang áp dụng trên Vercel; đề xuất ban đầu khoảng 45 giây. Không tự retry nhiều lần tạo chi phí khó kiểm soát; có nút thử lại riêng cột Rewrite.
- Cache rewrite trong phiên theo history + currentQuery + promptVersion + model/settings. Dùng lại khi chỉ đổi corpus/top-k; có nút tạo lại rõ ràng. Ghi model thực tế và metadata được trả về vào run.
- Deploy mặc định phục vụ demo có kiểm soát: dùng Deployment Protection nếu tài khoản hỗ trợ, hoặc mật khẩu demo qua cookie ký HttpOnly cho route rewrite. Nếu muốn website công khai không giới hạn người xem, cần chốt cơ chế quota/rate limit trước khi mở key chung; kiểm tra Origin đơn thuần không thay thế xác thực.
- Nếu thiếu key hoặc Cloud lỗi, Raw/PRF/Human vẫn dùng được; cột Rewrite báo lý do.

## 7. Điều phối, trạng thái và lưu phiên

Mỗi Index có `corpusRevision` và `indexRevision`; mỗi Run đóng băng snapshot gồm index revision, conversation revision, selectedTurnId, history, request, Human query, settings và `runId`.

- Sau Run, Raw + PRF + Human chạy trong worker trong khi HTTP rewrite chờ độc lập. Có kết quả cột nào hiện cột đó; không đợi tất cả cùng xong.
- LLM xong thì gửi query hợp lệ vào cùng index trong worker.
- Không thay index khi Run đang chạy. Cho sửa draft nhưng đánh dấu kết quả thuộc input cũ; chỉ thay revision sau lần Index mới.
- Ignore mọi response có runId/indexRevision đã lỗi thời. Cancel dùng AbortController cho HTTP; đánh dấu hủy để bỏ kết quả worker đang tới. Index chia batch và nhường event loop để xử lý cancel/progress.
- Worker protocol: `INDEX`, `SEARCH`, `SEARCH_PRF`, `CANCEL`; response `PROGRESS`, `INDEX_READY`, `RESULT`, `ERROR` đều kèm requestId và revision.
- State cấp ứng dụng: corpus draft, indexed revision, conversation draft (turns), selectedTurnId, settings, active run, selected doc. State từng phương pháp: idle/running/success/empty/error/skipped/cancelled.
- IndexedDB lưu docs, một conversation gồm các turns và Human query từng lượt, selectedTurnId, settings và run gần nhất; không lưu key. Có lỗi quota thì tiếp tục trong RAM và cho export.
- Refresh khôi phục workspace, xây lại index trong worker và hiển thị trạng thái khôi phục. Chưa cần persist binary index ở bản đầu.
- Chỉ export kết quả/session JSON để lưu hoặc phân tích, có schemaVersion, corpus, snapshot, prompt/model provenance, query/weights và kết quả; không có import ngược vào UI. IndexedDB khôi phục tự động, có validate schema/version.
- Lần mở đầu chưa có phiên lưu thì nạp 10 docs và một hội thoại mẫu vào hai khung, chọn lượt 3 để có sẵn history, chờ người dùng nhấn Index rồi Run. Có phiên lưu thì ưu tiên phiên đó, không ghi đè bằng mẫu.
- “Khôi phục mẫu” đặt lại 10 docs và hội thoại duy nhất, chọn lại lượt 3, làm stale index/kết quả; xác nhận nếu có chỉnh sửa chưa export. Không tự gọi LLM khi nạp mẫu.
- Chỉ history/current request được gửi tới API khi rewrite; docs, index và retrieval results ở browser. Nếu người dùng tự đưa nội dung nhạy cảm vào history/request thì phần đó sẽ đi tới Ollama.

## 8. Bộ ví dụ và kiểm chứng

### Bộ mẫu: 10 docs và đúng một hội thoại dài, tự nhiên

Đóng gói một bộ mẫu có phiên bản trong `src/data/demo-dataset.ts`: `documents` gồm **10 docs** và `conversation` là **một object có 10 lượt hỏi liên tiếp**. Không dùng mảng nhiều conversations/scenarios. Đây là dữ liệu biên soạn cho demo theo cấu trúc lượt của dataset, không phải benchmark CAsT. Mười docs là số lượng mẫu ban đầu, không chặn người dùng thêm doc.

Chủ đề xuyên suốt: **một người dùng tìm cách cải thiện Wi-Fi trong căn nhà hai tầng**, từ chẩn đoán vị trí đặt router đến so sánh repeater/mesh, backhaul và các ranh giới với Bluetooth/5G. Bộ mẫu hiện tại đã được biên soạn bằng tiếng Anh trong `demo/src/data/demo-dataset.ts`. Các docs dài khoảng 120–200 từ, chia sẻ từ vựng thực tế nhưng giữ các ranh giới quyết định riêng để Raw, PRF, Rewrite và Human có thể cho kết quả khác nhau.

| ID | Tiêu đề/nội dung doc cần biên soạn |
|---|---|
| D01 | Router placement across a concrete floor |
| D02 | 2.4 GHz or 5 GHz through walls and floors |
| D03 | Range extender or repeater for one dead zone |
| D04 | Mesh Wi-Fi for whole-home roaming |
| D05 | Ethernet backhaul over Cat6 |
| D06 | Keep the ISP router with Access Point mode |
| D07 | Powerline networking when cable routes are difficult |
| D08 | Channel congestion and DFS troubleshooting |
| D09 | Bluetooth headset range is not Wi-Fi coverage |
| D10 | Cellular 5G is different from 5 GHz Wi-Fi |

**Hội thoại mẫu duy nhất**, các câu nối tiếp cùng nhu cầu; mỗi hàng là một lượt trong khung hội thoại:

| Lượt | Câu hỏi gốc có thể chỉnh | Điểm quan sát / docs tham khảo |
|---|---|---|
| 1 | My upstairs bedroom loses Wi-Fi during video calls, but a speed test beside the router is normal. What should I check first? | Full context establishes the router, bedroom, floor, and call problem; D01 |
| 2 | Would moving it help, or should I try the other band? | “it” is the router, while “the other band” is an unresolved alternative; D01, D02 |
| 3 | Which one should I use through that floor? | “one” requires the history to recover the two Wi-Fi bands; D02 |
| 4 | The audio is still choppy. What should I add? | The missing subject is the Wi-Fi fix; audio wording attracts the Bluetooth distractor, while history points to a repeater; D03, D09 |
| 5 | If I do not want the same trade-off, what is the coordinated option? | “the same trade-off” refers to the repeater; the coordinated alternative is mesh; D04 |
| 6 | How is mesh different if I keep the link wireless? | History supplies the comparison target and wireless condition; D03, D04, D05 |
| 7 | I cannot change the route between floors yet. Where should the extra one go? | “the extra one” is the secondary node; the history carries the unresolved wireless/cable route; D04, D05, D07 |
| 8 | Would changing the setup later be worth it? | “the setup” resolves to the node link and the later route change; the intended method is Ethernet backhaul; D05 |
| 9 | Can the first one stay in charge? | The first device is the ISP router; the intended configuration is Access Point mode even though the current turn names neither device nor mode; D06 |
| 10 | My phone still loses its signal upstairs. Is that covered too? | A topic boundary must distinguish cellular signal from home Wi-Fi; D02, D09, D10 |

- Biên soạn Human query độc lập cho từng lượt, giữ đúng ý và điều kiện có tại thời điểm đó, không mượn thông tin từ lượt sau. Lưu cùng lượt và cho sửa trong UI; không gửi Human vào LLM.
- Toàn bộ 10 docs cùng nằm trong index ở mọi lượt, không lọc theo docs tham khảo. Docs tham khảo chỉ là hướng dẫn đọc/kiểm tra thủ công, không phải qrels hoặc đáp án ranking cứng.
- Bộ mẫu cần thể hiện một câu mở đầu đủ ngữ cảnh rồi các current turn thiếu đối tượng hoặc dùng anaphora (`it`, `that`, `one`, `old box`), từ đồng nghĩa tự nhiên (`booster`/`range extender`/`repeater`, `node`/`access point`), và ranh giới chủ đề qua nhiều lượt. D09/D10 là distractor có chủ đích để Raw có thể chọn nhầm và PRF khuếch đại nhầm; các docs Wi-Fi còn lại cạnh tranh tự nhiên giữa các giải pháp.
- Rà soát cả 10 lượt bằng Raw/PRF/Human trên corpus thật đã biên soạn, ghi query/terms và thứ hạng. Cần có lượt cho thấy khác biệt top-k/thứ hạng giữa các phương pháp local, ngoài khác biệt chuỗi query. Nếu chưa thấy, cải thiện độ phân biệt nội dung theo ý nghĩa, không gắn luật ưu tiên doc hoặc nhồi từ khóa để ép kết quả.
- Khi có credentials, chạy Rewrite thật cả hội thoại theo từng prefix history và ghi nhận kết quả. Không hứa Rewrite luôn thắng, không đòi mọi lượt đều có ranking khác nhau; nếu chưa chạy Cloud thì ghi rõ. Mục tiêu là quan sát được tác dụng và giới hạn của từng method trên cùng một mạch hội thoại.
- Fixture tính tay và dữ liệu đo hiệu năng tách riêng khỏi bộ mẫu người dùng.

Kiểm chứng có trọng tâm:

1. Tokenizer: dấu Việt NFC/NFD, dấu câu, chữ số, query rỗng và thống nhất index/query/PRF.
2. BM25+: fixture nhỏ đối chiếu công thức/expected ranking, độ dài doc, term lặp, hòa điểm; không chỉ snapshot output thư viện.
3. PRF: tính tay candidate score/weight trên corpus nhỏ; candidate chỉ đến từ feedback docs; DF từ toàn corpus; không đổi Raw khi expansion bị tắt; lần hai thực sự có thể tìm doc mới. Không gọi đây là test RM3.
4. Luồng Run: Human bỏ trống, Cloud 401/429/5xx/timeout/output lỗi, response cũ tới muộn, cancel, sửa corpus và index lại. Lỗi một cột không làm mất cột khác.
5. Browser E2E: thêm docs → Index → Run → mở doc → đối chiếu bảng; nạp mẫu → sửa text → index lại, export và reload khôi phục phiên; chọn/thêm/sửa/xóa lượt, kiểm tra history chỉ gồm các lượt trước; chọn tiêu đề doc để sửa/xóa đúng doc, khôi phục mẫu và xác nhận thay đổi; test worker trên production build.
6. Kiểm tra network: index/BM25/PRF không gọi server; `/api/rewrite` không có docs/Human/key trong response; client bundle không chứa API key.
7. Smoke trên Vercel Preview bằng Ollama Cloud thật khi có key/model. Phân biệt test mock với inference thật; chưa có key thì ghi rõ phần chưa kiểm chứng.
8. QA desktop và mobile; keyboard navigation, focus, lỗi input dễ hiểu, text dài không phá layout; smoke Chromium và WebKit.

Mục tiêu hiệu năng đề xuất, không phải số đã đo: với 1.000 docs tổng ≤10 MB trên máy kiểm thử được ghi rõ, index dưới 3 giây và retrieval local p95 dưới 200 ms sau warm-up. Đo nhiều lần, ghi môi trường và giới hạn; LLM latency báo riêng. Nếu không đạt thì giảm scope corpus hoặc tối ưu trước khi hứa hỗ trợ.

Không tính nDCG/Recall/accuracy khi không có relevance judgments. Bảng rank và overlap chỉ mô tả kết quả, không tự tuyên bố chất lượng.

## 9. Thứ tự thực hiện và tiêu chí hoàn tất

| Giai đoạn | Công việc | Cổng kiểm chứng |
|---|---|---|
| 1. Nền ứng dụng | Scaffold `demo/`, types, layout, worker skeleton, route Ollama tối thiểu | Production build tải được worker; route xử lý thiếu key rõ ràng |
| 2. Documents + BM25 | CRUD text thuần, tokenizer, index progress, Raw/Human | Thêm/sửa/index/search hoạt động; chặn stale index |
| 3. PRF | TF/DF, chọn term, boostTerm, UI trace PRF | Fixture tính tay và expansion-off trùng Raw |
| 4. Rewrite | Prompt notebook, Cloud adapter, validate/cache/error/cancel | Mock đủ lỗi; inference thật khi có credentials |
| 5. Workspace hoàn chỉnh | Bốn cột, bảng rank, doc viewer, hai khung chỉnh sửa, mẫu 10 docs/một hội thoại 10 lượt, persistence/export | E2E toàn luồng, rà đủ 10 lượt và history không chứa lượt tương lai và responsive QA |
| 6. Deploy | README, env sample, lint/typecheck/test/build, Vercel Preview | Worker, IndexedDB, rewrite và network boundary đúng trên HTTPS |
| 7. Bàn giao | Link deployment, hướng dẫn demo, thông số/phương pháp và giới hạn | Không ghi hoàn tất nếu mới build local hoặc chỉ chạy mock |

## 10. Triển khai Vercel

- Framework Next.js; Root Directory `demo`; install `bun install --frozen-lockfile`, build `bun run build` với script `bun run --bun next build`; commit `bun.lock`.
- Chọn **Bun runtime** cho Vercel Functions bằng `bunVersion` trong `demo/vercel.json` theo phiên bản Vercel hỗ trợ (ví dụ `"bunVersion": "1.x"`; kiểm tra lại giá trị hỗ trợ khi scaffold). Pin bản Bun cụ thể cho local/CI và ghi bản thực tế chạy trên Preview. Việc có `bun.lock` chỉ chọn package manager, chưa đủ để chọn runtime.
- Kiểm chứng route rewrite thực sự chạy Bun trên Preview bằng log chẩn đoán runtime không chứa dữ liệu người dùng/secret. Không tự chuyển sang Node nếu gặp lỗi tương thích; xử lý hoặc ghi rõ điểm còn chặn trước bàn giao.
- Dùng Next.js deployment thông thường, **không `output: 'export'`** vì cần POST Route Handler. Trang chính có thể prerender tĩnh; dữ liệu browser được load sau hydration.
- Cấu hình `OLLAMA_API_KEY`, `OLLAMA_MODEL` riêng cho Preview/Production. Model trong notebook là ứng viên, phải kiểm tra khả dụng khi triển khai.
- Chỉ route rewrite cần Function runtime; index không ghi vào filesystem Vercel và không có job indexing trên server.
- `Cache-Control: no-store` cho rewrite; validate giới hạn history/query/body; upstream timeout và thông báo lỗi được làm sạch. Không log body hoặc Authorization.
- Kiểm tra HTTPS worker asset path, refresh trực tiếp, storage, function timeout và bảo vệ truy cập trên Preview trước Production.
- Website deploy-ready không đồng nghĩa đã deploy: tài khoản/project Vercel và secret là các đầu vào cần có ở giai đoạn triển khai; không đưa key vào tài liệu.

## 11. Nguồn kỹ thuật đã kiểm tra

Bổ sung kiểm tra tài liệu Bun/Vercel ngày 2026-09-23; các kiểm tra cũ giữ ngày nêu ở từng phần.

- [Next.js với Bun](https://bun.sh/guides/ecosystem/nextjs): chạy Next.js bằng Bun runtime.
- [Bun runtime trên Vercel Functions](https://vercel.com/docs/functions/runtimes/bun): chọn runtime bằng `bunVersion`, hỗ trợ Next.js.

- [MiniSearch](https://github.com/lucaong/minisearch): browser/Node, index trong RAM, thêm/xóa docs.
- [MiniSearch SearchOptions](https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html): `boostTerm`, BM25+, fuzzy/prefix/OR.
- [MiniSearch implementation](https://github.com/lucaong/minisearch/blob/master/src/MiniSearch.ts): công thức và tham số BM25+.
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers): chạy xử lý nền và message protocol.
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports): ranh giới với các chức năng cần server.
- [Next.js trên Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs): deployment và Function integration.
- [Ollama authentication](https://docs.ollama.com/api/authentication): Cloud endpoint và Bearer authentication.
- [Ollama chat](https://docs.ollama.com/api/chat): `messages`, `stream`, `message.content`, completion metadata.

Tài liệu nguồn nội bộ: `notebooks/colab_benchmark.ipynb` (đã đọc prompt thực tế) và README hiện tại. Các thuật toán/giới hạn/latency của demo trên đây là thiết kế đề xuất; chưa có kết quả thực thi của ứng dụng web.
