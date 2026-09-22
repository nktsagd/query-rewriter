# CAsT 2020 Query Rewriting bằng LLM

Project này kiểm tra liệu **viết lại câu hỏi hội thoại** bằng LLM có giúp BM25 tìm đúng tài liệu hơn trên benchmark **TREC CAsT 2020** hay không.

## Benchmark đang làm gì?

- Dữ liệu gồm 216 lượt hội thoại; 208 lượt có qrels để chấm điểm (40.451 judgment).
- Dùng cùng một chỉ mục `cast2019`, BM25 (`k1=0.9`, `b=0.4`, top-100) cho mọi nhánh.
- So sánh ba cách tạo truy vấn:
  - **Raw**: dùng nguyên câu người dùng hiện tại.
  - **LLM**: mô hình ngôn ngữ viết lại thành câu hỏi độc lập từ lịch sử hội thoại; project gọi model qua provider Ollama Cloud.
  - **Human**: bản viết lại thủ công của CAsT 2020, dùng làm mốc tham chiếu.
- Metrics: `nDCG@10`, `Recall@100`, `RR@10`.

Kết quả đang lưu trong `cast2020_results/`:

| Nhánh | nDCG@10 | Recall@100 | RR@10 |
|---|---:|---:|---:|
| Raw | 0.0780 | 0.1251 | 0.1720 |
| LLM | 0.2316 | 0.3699 | 0.5158 |
| Human | 0.2558 | 0.4273 | 0.5430 |

Đây là benchmark BM25 có kiểm soát, không phải điểm chính thức trên bảng xếp hạng TREC. Nhánh Human là mốc tham chiếu; kết quả LLM còn phụ thuộc model, prompt và thời điểm gọi API.

## Chạy notebook

Mở [`notebooks/colab_benchmark.ipynb`](notebooks/colab_benchmark.ipynb) bằng Google Colab và chạy các cell từ trên xuống dưới:

1. Tạo API key cho provider [Ollama Cloud](https://ollama.com/settings/keys).
2. Trong Colab, vào **Secrets** và thêm biến `OLLAMA_API_KEY` (không ghi key vào notebook).
3. Chạy notebook để tải dữ liệu/index, chạy Raw–Human–LLM và lưu kết quả CSV. Cache rewrite cho phép chạy tiếp nếu bị gián đoạn.

Notebook sử dụng LLM qua provider Ollama Cloud (`https://ollama.com`), không cần Ollama local. Ollama là provider, không phải tên của phương pháp.

## Cấu trúc chính

- `notebooks/`: mã chạy benchmark trên Colab.
- `cast2020_results/`: rewrite, run và metric đã xuất.
- `research/`: phương pháp, ghi chú đánh giá và tổng hợp tài liệu.
- `PROJECT_CONTEXT_FOR_EXTERNAL_GPT.md`: context pack để tiếp tục project ở session khác.
