"""Celery application configuration."""

import os
import sys

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
if "host:6379" in REDIS_URL and "railway.internal" not in REDIS_URL:
    print(
        "ERROR: REDIS_URL looks like a placeholder (host:6379). "
        "On Railway, set Worker Variables → REDIS_URL to 'Add Reference' → Redis → REDIS_URL.",
        file=sys.stderr,
    )
    sys.exit(1)

celery_app = Celery(
    "syllascribe_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Auto-discover tasks from worker_app so "app" is free for API's app.models
celery_app.autodiscover_tasks(["worker_app"])
