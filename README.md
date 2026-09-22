# CAsT 2020: Query Rewriting bằng LLM và Pseudo-relevance Feedback

Project này so sánh viết lại câu hỏi hội thoại bằng LLM và mở rộng truy vấn bằng **Pseudo-relevance Feedback (PRF)** cho truy hồi BM25 trên dataset **TREC CAsT 2020**. Notebook chạy toàn bộ thí nghiệm trên Google Colab với Pyserini và Ollama Cloud.

## Thiết kế benchmark

- Dữ liệu có **216 lượt** trong **25 hội thoại**; **208 lượt** có qrels, với **40.451 judgment**.
- Lịch sử của mỗi lượt gồm toàn bộ phát ngôn gốc trước đó của người dùng trong cùng hội thoại, kể cả lượt không có qrels.
- Mọi nhánh dùng cùng prebuilt index `cast2019`, BM25 (`k1=0.9`, `b=0.4`) và lấy `top_k=100`.
- Notebook kiểm tra rằng toàn bộ document ID trong qrels tồn tại trong index trước khi retrieval.

Năm nhánh được so sánh:

1. **Raw** — dùng nguyên utterance hiện tại.
2. **Raw + RM3** (`raw_rm3`) — dùng PRF để mở rộng utterance gốc từ các tài liệu được truy hồi ở vòng đầu, sau đó truy hồi lại.
3. **Rewriter 1** — zero-shot rewrite thành một truy vấn độc lập, chỉ dùng thông tin được hỗ trợ bởi lịch sử và utterance hiện tại.
4. **Rewriter 2** — rewrite có căn cứ như Rewriter 1, sau đó có thể thêm tối đa ba synonym/contextual keywords để tăng matching từ vựng; không được thêm thực thể hay thông tin suy đoán.
5. **Human** — bản viết lại thủ công chính thức của CAsT 2020, dùng làm mốc tham chiếu.

### Pseudo-relevance Feedback bằng RM3

Nhánh `raw_rm3` nhận utterance gốc, dùng BM25 lấy các tài liệu đứng đầu và giả định chúng liên quan để tạo mô hình phản hồi RM3. Notebook cấu hình `fb_docs=10` (10 tài liệu phản hồi), `fb_terms=10` (10 từ mở rộng) và `original_query_weight=0.5` (trọng số truy vấn gốc khi kết hợp với mô hình phản hồi). Truy vấn sau mở rộng được dùng để lấy 100 kết quả cuối cùng và chấm bằng cùng qrels, metric như các nhánh khác.

RM3 không dùng LLM, lịch sử hội thoại, bản viết lại Human hay nhãn qrels để mở rộng truy vấn; qrels chỉ dùng cho kiểm tra tương thích index và đánh giá. Notebook chỉ áp dụng RM3 lên Raw và tắt RM3 sau khi truy hồi nhánh này. So sánh Raw với Raw + RM3 cho thấy tác động của PRF trên truy vấn gốc; so sánh với hai rewriter giúp đối chiếu mở rộng từ tài liệu truy hồi với viết lại từ ngữ cảnh hội thoại. PRF có thể làm lệch nhu cầu tìm kiếm nếu các tài liệu đứng đầu không liên quan, đặc biệt khi utterance gốc thiếu ngữ cảnh.

Các metric là `nDCG@10`, `Recall@100` (được ghi là `R@100` trong CSV) và `RR@10`.

## Kết quả benchmark hiện tại

Kết quả dưới đây được lưu trong `cast2020_results/aggregate_metrics.csv`; hai nhánh LLM dùng model `gemma4:31b` qua Ollama Cloud. Bộ kết quả hiện có đủ năm nhánh, mỗi nhánh gồm 208 lượt được đánh giá và 20.800 dòng kết quả truy hồi (100 tài liệu mỗi lượt).

| Nhánh | nDCG@10 | Recall@100 | RR@10 |
|---|---:|---:|---:|
| Raw | 0.077960 | 0.125089 | 0.172014 |
| Raw + RM3 | 0.090489 | 0.141471 | 0.178398 |
| Rewriter 1 | 0.227154 | 0.364075 | 0.499639 |
| Rewriter 2 | 0.238451 | 0.388628 | 0.526437 |
| Human | 0.255781 | 0.427310 | 0.542960 |

Trong lần chạy này, Raw + RM3 cải thiện cả ba metric so với Raw nhưng vẫn thấp hơn hai rewriter. Rewriter 2 cao hơn Rewriter 1 trên cả ba metric; Human đạt điểm cao nhất. Đây là so sánh điểm tổng hợp của lần chạy được lưu, chưa có kiểm định ý nghĩa thống kê.

## Chạy notebook

Mở [`notebooks/colab_benchmark.ipynb`](notebooks/colab_benchmark.ipynb) bằng Google Colab và chạy các cell từ trên xuống dưới:

1. Tạo key tại [Ollama Cloud settings](https://ollama.com/settings/keys).
2. Trong Colab, vào **Secrets**, thêm `OLLAMA_API_KEY` và bật quyền truy cập cho notebook. Không ghi key trực tiếp vào notebook.
3. Chạy notebook. Notebook sẽ cài dependency, tải prebuilt index `cast2019`, dựng Raw/Human trước, gọi Ollama cho hai rewriter, rồi chạy retrieval và evaluation cho cả năm nhánh, bao gồm Raw + RM3.
4. Cell cuối đóng gói thư mục kết quả thành `cast2020_results.zip`.

Notebook dùng Ollama Cloud (`https://ollama.com`), không cần Ollama local. Ollama là provider; `Rewriter 1` và `Rewriter 2` mới là các phương pháp được đánh giá. Mỗi lần chạy lại cell LLM sẽ gọi lại API và ghi đè `cast2020_results/ollama_rewrites.csv`; file này hiện là output lưu lại, chưa phải cơ chế resume cache.

## Kết quả và cấu trúc chính

- `notebooks/colab_benchmark.ipynb`: mã benchmark chạy trên Colab.
- `cast2020_results/aggregate_metrics.csv`: metric tổng hợp cho năm nhánh theo thứ tự Raw, Raw + RM3, Rewriter 1, Rewriter 2, Human.
- `cast2020_results/ollama_rewrites.csv`: 416 rewrite (208 lượt × 2 rewriter), kèm model và tên phương pháp.
- `cast2020_results/*_run.csv`: năm run gồm `raw_run.csv`, `raw_rm3_run.csv`, `rewriter 1_run.csv`, `rewriter 2_run.csv` và `human_run.csv`.
- `cast2020_results/llm_minus_raw_per_query.csv`: delta của từng rewriter so với Raw theo từng lượt và phân loại improved/tied/degraded theo nDCG@10; chưa bao gồm delta của RM3.
- `research/`: phương pháp, ghi chú đánh giá và tổng hợp tài liệu.

Nếu một API key đã từng được ghi vào commit hoặc log, hãy **revoke/rotate key đó trước khi chạy lại**; việc xóa khỏi notebook hiện tại không xóa key khỏi lịch sử Git.
