FROM astral/uv:python3.12-bookworm-slim

# Install system fonts and fontconfig for resvg text rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    libreoffice-nogui \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

EXPOSE 8000

CMD [".venv/bin/fastapi", "run", "--host", "0.0.0.0", "--port", "8000"]