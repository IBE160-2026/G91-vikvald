FROM python:3.12-slim

# uv installs the exact package versions locked in uv.lock.
COPY --from=ghcr.io/astral-sh/uv:0.12.13 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Install dependencies first so Docker can cache this layer between code changes.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY . .

# The upload folder must exist and belong to "app" before the "uploads" volume is
# mounted on it: Docker then copies this owner to a new, empty volume, so the
# backend can write there.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/data/uploads \
    && chown -R app:app /app/data
USER app

EXPOSE 8000

CMD ["sh", "./start.sh"]
