FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
# Lightweight build: no PyTorch/CUDA/sentence-transformers needed.
# Embeddings are handled via OpenAI API — image stays under ~300MB.
ARG PIP_DEFAULT_TIMEOUT=120
ARG PIP_RETRIES=10
RUN pip install --no-cache-dir \
    --default-timeout="$PIP_DEFAULT_TIMEOUT" \
    --retries="$PIP_RETRIES" \
    -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
