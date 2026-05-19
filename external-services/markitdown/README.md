# Eduflow MarkItDown Service

Small FastAPI service that accepts PDF uploads and returns Markdown converted by the `markitdown[pdf]` library.

## Endpoints

- `GET /health` returns service health.
- `POST /markitdown` accepts multipart form field `file` with a PDF upload and returns `{ "markdown": "..." }`.

## Local Commands

```bash
uv sync
uv run fastapi dev main.py --host 0.0.0.0 --port 8000
```

## Docker

```bash
docker build -t eduflow-markitdown .
docker run --rm -p 8000:8000 eduflow-markitdown
```
