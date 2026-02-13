"""POST /api/upload — file upload and job creation."""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Job
from ..schemas import JobCreateResponse

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}


@router.post("/upload", response_model=JobCreateResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Create job
    job_id = uuid.uuid4()
    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", settings.UPLOAD_DIR)
    )
    job_dir = os.path.join(upload_dir, str(job_id))
    os.makedirs(job_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(job_dir, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    job = Job(
        id=job_id,
        status="queued",
        original_filename=file.filename,
        upload_path=file_path,
    )
    db.add(job)
    await db.flush()

    # Enqueue Celery task (import here to avoid circular imports at module level)
    try:
        from celery import Celery

        celery_app = Celery(broker=settings.REDIS_URL)
        celery_app.send_task("app.tasks.process_job", args=[str(job_id)])
    except Exception:
        # If Celery/Redis is not available, the job stays queued.
        # A manual retry or the worker picking it up later will handle it.
        pass

    return JobCreateResponse(job_id=job_id)
