# CAsT 2020 Query Rewriting bằng LLM

Project này đo ảnh hưởng của việc viết lại câu hỏi hội thoại lên truy hồi BM25 trên benchmark **TREC CAsT 2020**. Notebook chạy toàn bộ thí nghiệm trên Google Colab với Pyserini và Ollama Cloud.

## Thiết kế benchmark

- Dữ liệu có **216 lượt** trong **25 hội thoại**; **208 lượt** có qrels, với **40.451 judgment**.
- Lịch sử của mỗi lượt gồm toàn bộ phát ngôn gốc trước đó của người dùng trong cùng hội thoại, kể cả lượt không có qrels.
- Mọi nhánh dùng cùng prebuilt index `cast2019`, BM25 (`k1=0.9`, `b=0.4`) và lấy `top_k=100`.
- Notebook kiểm tra rằng toàn bộ document ID trong qrels tồn tại trong index trước khi retrieval.

Bốn nhánh được so sánh:

1. **Raw** — dùng nguyên utterance hiện tại.
2. **Rewriter 1** — zero-shot rewrite thành một truy vấn độc lập, chỉ dùng thông tin được hỗ trợ bởi lịch sử và utterance hiện tại.
3. **Rewriter 2** — rewrite có căn cứ như Rewriter 1, sau đó có thể thêm tối đa ba synonym/contextual keywords để tăng matching từ vựng; không được thêm thực thể hay thông tin suy đoán.
4. **Human** — bản viết lại thủ công chính thức của CAsT 2020, dùng làm mốc tham chiếu.

Các metric là `nDCG@10`, `Recall@100` (được ghi là `R@100` trong CSV) và `RR@10`.

## Kết quả đã commit

Kết quả dưới đây được xuất từ notebook với model `gemma4:31b` qua Ollama Cloud và lưu trong `cast2020_results/`:

| Nhánh | nDCG@10 | Recall@100 | RR@10 |
|---|---:|---:|---:|
| Raw | 0.077960 | 0.125089 | 0.172014 |
| Rewriter 1 | 0.229223 | 0.369924 | 0.510464 |
| Rewriter 2 | 0.241809 | 0.387319 | 0.512363 |
| Human | 0.255781 | 0.427310 | 0.542960 |

Đây là benchmark BM25 có kiểm soát, không phải điểm chính thức trên bảng xếp hạng TREC. Kết quả LLM phụ thuộc model, prompt, endpoint và thời điểm gọi API; không nên so sánh trực tiếp với một cấu hình khác nếu chưa cố định các yếu tố này.

## Chạy notebook

Mở [`notebooks/colab_benchmark.ipynb`](notebooks/colab_benchmark.ipynb) bằng Google Colab và chạy các cell từ trên xuống dưới:

1. Tạo key tại [Ollama Cloud settings](https://ollama.com/settings/keys).
2. Trong Colab, vào **Secrets**, thêm `OLLAMA_API_KEY` và bật quyền truy cập cho notebook. Không ghi key trực tiếp vào notebook.
3. Chạy notebook. Notebook sẽ cài dependency, tải prebuilt index `cast2019`, dựng Raw/Human trước, gọi Ollama cho hai rewriter, rồi chạy retrieval và evaluation.

Notebook dùng Ollama Cloud (`https://ollama.com`), không cần Ollama local. Ollama là provider; `Rewriter 1` và `Rewriter 2` mới là các phương pháp được đánh giá. Mỗi lần chạy lại cell LLM sẽ gọi lại API và ghi đè `cast2020_results/ollama_rewrites.csv`; file này hiện là output lưu lại, chưa phải cơ chế resume cache.

## Kết quả và cấu trúc chính

- `notebooks/colab_benchmark.ipynb`: mã benchmark chạy trên Colab.
- `cast2020_results/aggregate_metrics.csv`: metric tổng hợp cho bốn nhánh.
- `cast2020_results/ollama_rewrites.csv`: 416 rewrite (208 lượt × 2 rewriter), kèm model và tên phương pháp.
- `cast2020_results/*_run.csv`: các run gồm Raw, Human, Rewriter 1 và Rewriter 2.
- `cast2020_results/llm_minus_raw_per_query.csv`: delta theo từng lượt và phân loại improved/tied/degraded theo nDCG@10.
- `research/`: phương pháp, ghi chú đánh giá và tổng hợp tài liệu.

Nếu một API key đã từng được ghi vào commit hoặc log, hãy **revoke/rotate key đó trước khi chạy lại**; việc xóa khỏi notebook hiện tại không xóa key khỏi lịch sử Git.
