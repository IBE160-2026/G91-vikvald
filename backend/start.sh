#!/bin/sh
# Backend start sequence: database migrations first, then exactly one Uvicorn process.
set -e

echo "Running database migrations (alembic upgrade head)"
alembic upgrade head

echo "Starting Uvicorn (one process)"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config app/core/logging.json
