FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY packages/shared /app/packages/shared
RUN pip install --no-cache-dir /app/packages/shared

COPY services/api/requirements.txt /app/services/api/requirements.txt
RUN pip install --no-cache-dir -r /app/services/api/requirements.txt

COPY services/worker/requirements.txt /app/services/worker/requirements.txt
RUN pip install --no-cache-dir -r /app/services/worker/requirements.txt

COPY services/api /app/services/api
COPY services/worker /app/services/worker

RUN mkdir -p /app/data/uploads \
    && useradd --create-home --shell /bin/bash celery \
    && chown -R celery:celery /app

ENV UPLOAD_DIR=/app/data/uploads

WORKDIR /app/services/worker

USER celery

CMD ["celery", "-A", "worker_app.celery_app:celery_app", "worker", "--loglevel=info", "--concurrency=2"]
