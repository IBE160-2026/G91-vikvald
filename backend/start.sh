#!/bin/sh
# Backend start sequence (AR-14): database migrations, then the seed (only on an
# empty local database), then exactly one Uvicorn process.
set -e

echo "Running database migrations (alembic upgrade head)"
alembic upgrade head

echo "Seeding the test user and sample subject if the database is empty (python -m app.seed)"
# Never stops the start: the seed logs its own errors and tries again next time.
python -m app.seed || echo "Seed did not finish; starting anyway"

echo "Starting Uvicorn (one process)"
# Keep idle connections open longer than the Next.js proxy does. Node's agent
# closes an idle connection after 5 s, and Uvicorn's default is also 5 s: when
# both close at once, the proxy can reuse a connection the backend has just
# closed, and the request fails with ECONNRESET (seen as flaky Playwright tests).
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config app/core/logging.json --timeout-keep-alive 65
